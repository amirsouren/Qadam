import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';

/**
 * Watches for the calendar date changing while the tab stays open (PRD §6.1).
 *
 * On rollover the store applies any deferred goal reduction, refreshes today's
 * activity record, and this hook raises the gentle leftover-triage prompt if
 * anything unfinished carried over. Nothing is ever migrated silently.
 */
export function useDayWatcher(): void {
  const rollover = useAppStore((s) => s.rollover);
  const today = useAppStore((s) => s.today);
  const openReconciliation = useUiStore((s) => s.openReconciliation);
  const busy = useRef(false);

  useEffect(() => {
    const check = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const leftovers = await rollover();
        if (leftovers.length > 0) openReconciliation(leftovers);
      } catch (err) {
        console.error('[qadam] day rollover failed', err);
      } finally {
        busy.current = false;
      }
    };

    const interval = window.setInterval(() => void check(), 30_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [rollover, openReconciliation, today]);
}
