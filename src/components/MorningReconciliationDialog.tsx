import { useState } from 'react';
import { useAppStore, type ReconcileAction } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';
import { Modal } from './ui/Modal';
import { formatDayLabel, toPersianDigits } from '../lib/format';
import type { UserSettings } from '../types';

/**
 * The gentle morning prompt (PRD §6.1).
 *
 * Appears on the first session of a new day when unfinished tasks from a
 * previous session exist. It is deliberately non-blocking and offers three
 * equally valid answers — carry, park, or let go. Nothing is ever migrated
 * automatically at midnight.
 */
export function MorningReconciliationDialog({ settings }: { settings: UserSettings }) {
  const open = useUiStore((s) => s.reconciliationOpen);
  const leftovers = useUiStore((s) => s.leftovers);
  const close = useUiStore((s) => s.closeReconciliation);
  const reconcile = useAppStore((s) => s.reconcile);
  const today = useAppStore((s) => s.today);

  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  if (leftovers.length === 0) return null;

  const ids = leftovers.map((t) => t.id);

  const choose = async (action: ReconcileAction) => {
    if (busy) return;
    setBusy(true);
    try {
      await reconcile(action, ids);
    } finally {
      setBusy(false);
      setConfirmDiscard(false);
      close();
    }
  };

  const close_ = () => {
    setConfirmDiscard(false);
    close();
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) close_();
      }}
      title="A gentle check-in"
      description={`You have ${leftovers.length} unfinished ${
        leftovers.length === 1 ? 'task' : 'tasks'
      } from a previous day. Carry them forward, park them, or let them go?`}
      width="max-w-lg"
      footer={
        <>
          <button
            type="button"
            onClick={close_}
            className="rounded-xl px-3.5 py-2 text-sm text-idle transition hover:bg-idle-soft/60 hover:text-ink"
          >
            Decide later
          </button>
          <button
            type="button"
            disabled={busy || confirmDiscard}
            onClick={() => void choose('park')}
            className="rounded-xl border border-idle-soft px-3.5 py-2 text-sm text-ink transition hover:bg-idle-soft/60 disabled:opacity-50"
          >
            Send to Parking Lot
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void choose('carry')}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
          >
            Move to Today
          </button>
        </>
      }
    >
      <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
        {leftovers.map((task) => (
          <li
            key={task.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-idle-soft/70 bg-canvas px-3 py-2 dark:border-white/10 dark:bg-slate-900/50"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{task.title}</span>
            <span
              className="shrink-0 text-xs text-idle"
              dir={settings.calendarType === 'jalali' ? 'rtl' : 'ltr'}
            >
              {settings.calendarType === 'jalali'
                ? toPersianDigits(formatDayLabel(task.targetDate, 'jalali'))
                : formatDayLabel(task.targetDate, 'gregorian')}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-idle-soft/40 px-3 py-2 dark:bg-white/5">
        <p className="text-xs text-idle">
          {confirmDiscard
            ? 'Discarding removes them for good.'
            : `Today is ${
                settings.calendarType === 'jalali'
                  ? toPersianDigits(formatDayLabel(today, 'jalali'))
                  : formatDayLabel(today, 'gregorian')
              }.`}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => (confirmDiscard ? void choose('discard') : setConfirmDiscard(true))}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
            confirmDiscard
              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
              : 'text-idle hover:bg-idle-soft hover:text-ink'
          }`}
        >
          {confirmDiscard ? 'Really discard?' : 'Discard'}
        </button>
      </div>
    </Modal>
  );
}
