import { useCallback, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { TopBar, SEARCH_INPUT_ID } from './components/layout/TopBar';
import { BottomNav } from './components/layout/BottomNav';
import { TodayPage } from './pages/TodayPage';
import { ParkingLotPage } from './pages/ParkingLotPage';
import { CalendarPage } from './pages/CalendarPage';
import { QuickAddModal } from './components/today/QuickAddModal';
import { SettingsModal } from './components/SettingsModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { MorningReconciliationDialog } from './components/MorningReconciliationDialog';
import { useAppStore } from './store/useAppStore';
import { useUiStore } from './store/useUiStore';
import { focusTasksFor } from './store/selectors';
import { useTheme } from './hooks/useTheme';
import { useDayWatcher } from './hooks/useDayWatcher';
import { useNotifications } from './hooks/useNotifications';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export function App() {
  const ready = useAppStore((s) => s.ready);
  const init = useAppStore((s) => s.init);
  const settings = useAppStore((s) => s.settings);
  const tasks = useAppStore((s) => s.tasks);
  const location = useLocation();

  const openReconciliation = useUiStore((s) => s.openReconciliation);
  const [booted, setBooted] = useState(false);

  useTheme(settings);
  useDayWatcher();
  useNotifications(settings, tasks);

  // Cold start: load local data, then raise the morning prompt if needed.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const leftovers = await init();
      if (cancelled) return;
      if (leftovers.length > 0) openReconciliation(leftovers);
      setBooted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [init, openReconciliation]);

  const onQuickAdd = useCallback(() => {
    useUiStore.getState().openQuickAdd('focus');
  }, []);

  const onSearch = useCallback(() => {
    const el = document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement | null;
    if (el) {
      el.focus();
      el.select();
    } else {
      // No field on screen — jump to the mental dump instead.
      useUiStore.getState().openQuickAdd('someday');
    }
  }, []);

  const onToggleSlot = useCallback((index: number) => {
    const { tasks: all, today: day, toggleTask } = useAppStore.getState();
    const focus = focusTasksFor(all, day);
    const target = focus[index];
    if (target) void toggleTask(target.id);
  }, []);

  const onShortcuts = useCallback(() => {
    useUiStore.getState().openShortcuts();
  }, []);

  const onEscape = useCallback(() => {
    // Radix dialogs dismiss themselves; only handle inline overlays here so a
    // single press never closes two things.
    const active = document.activeElement as HTMLElement | null;
    if (active?.closest('[role="dialog"]')) return;
    const ui = useUiStore.getState();
    if (ui.selectedDay !== null) ui.selectDay(null);
  }, []);

  useKeyboardShortcuts({ onQuickAdd, onSearch, onToggleSlot, onShortcuts, onEscape });

  // Scroll to top on navigation so each view starts clean.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  if (!ready || !booted) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-lg font-bold text-white shadow-sm">
            ق
          </span>
          <p className="animate-idle text-sm text-idle">Waking up your local workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <TopBar />

      <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-4 sm:px-6 md:pb-16">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/parking-lot" element={<ParkingLotPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="*" element={<TodayPage />} />
        </Routes>
      </main>

      <BottomNav />

      <QuickAddModal />
      <SettingsModal />
      <ShortcutsModal />
      <MorningReconciliationDialog settings={settings} />
    </div>
  );
}
