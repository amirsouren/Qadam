import { create } from 'zustand';
import type { TaskItem, TaskType } from '../types';

/**
 * Ephemeral UI state: modals, the morning prompt, search and the selected
 * calendar day. Kept separate from data so a cross-tab reload never disturbs
 * what the user is currently looking at.
 */
export interface UiStoreState {
  quickAddOpen: boolean;
  quickAddType: TaskType;
  settingsOpen: boolean;
  shortcutsOpen: boolean;

  /** Leftover tasks awaiting the gentle morning decision (PRD §6.1). */
  reconciliationOpen: boolean;
  leftovers: TaskItem[];

  search: string;
  /** The calendar day currently showing its minimal detail card. */
  selectedDay: string | null;

  openQuickAdd: (type?: TaskType) => void;
  closeQuickAdd: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openShortcuts: () => void;
  closeShortcuts: () => void;
  openReconciliation: (tasks: TaskItem[]) => void;
  closeReconciliation: () => void;
  setSearch: (value: string) => void;
  selectDay: (iso: string | null) => void;

  /** True when any modal/drawer is open (used by the Escape handler). */
  isAnythingOpen: () => boolean;
  closeTopmost: () => void;
}

export const useUiStore = create<UiStoreState>((set, get) => ({
  quickAddOpen: false,
  quickAddType: 'focus',
  settingsOpen: false,
  shortcutsOpen: false,
  reconciliationOpen: false,
  leftovers: [],
  search: '',
  selectedDay: null,

  openQuickAdd: (type = 'focus') => set({ quickAddOpen: true, quickAddType: type }),
  closeQuickAdd: () => set({ quickAddOpen: false }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openShortcuts: () => set({ shortcutsOpen: true }),
  closeShortcuts: () => set({ shortcutsOpen: false }),

  openReconciliation: (tasks) =>
    set({ reconciliationOpen: tasks.length > 0, leftovers: tasks }),
  closeReconciliation: () => set({ reconciliationOpen: false, leftovers: [] }),

  setSearch: (value) => set({ search: value }),
  selectDay: (iso) => set({ selectedDay: iso }),

  isAnythingOpen: () => {
    const s = get();
    return (
      s.quickAddOpen ||
      s.settingsOpen ||
      s.shortcutsOpen ||
      s.reconciliationOpen ||
      s.selectedDay !== null
    );
  },

  /** Escape closes the most recently relevant overlay first (PRD §4.3). */
  closeTopmost: () => {
    const s = get();
    if (s.reconciliationOpen) return set({ reconciliationOpen: false, leftovers: [] });
    if (s.quickAddOpen) return set({ quickAddOpen: false });
    if (s.settingsOpen) return set({ settingsOpen: false });
    if (s.shortcutsOpen) return set({ shortcutsOpen: false });
    if (s.selectedDay !== null) return set({ selectedDay: null });
  },
}));
