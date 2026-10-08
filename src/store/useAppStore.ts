import { create } from 'zustand';
import type { DailyLog, TaskItem, UserSettings } from '../types';
import { META_KEYS } from '../types';
import {
  carryToToday,
  completeTask,
  createTask,
  deleteTask,
  discardTasks,
  ensureTodayLog,
  findLeftoverTasks,
  getMeta,
  loadSnapshot,
  promoteToToday,
  saveSettings,
  sendToParkingLot,
  setMeta,
  uncompleteTask,
  updateTask as updateTaskRow,
  type NewTaskInput,
} from '../db/repo';
import { broadcastChange, subscribeToSync } from '../lib/sync';
import { todayISO } from '../lib/date';
import { clampGoal, planGoalChange, type GoalPlanResult } from '../lib/goals';
import { playSoftCheck } from '../lib/sound';

export type ReconcileAction = 'carry' | 'park' | 'discard';

export interface AppStoreState {
  ready: boolean;
  tasks: TaskItem[];
  logs: DailyLog[];
  settings: UserSettings;
  /** The current local date — bumped by the day watcher. */
  today: string;

  /** Load everything. Resolves with leftovers for the morning prompt. */
  init: () => Promise<TaskItem[]>;
  reload: () => Promise<void>;
  addTask: (input: NewTaskInput) => Promise<TaskItem | null>;
  editTask: (id: string, patch: Partial<Omit<TaskItem, 'id'>>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  promote: (id: string) => Promise<void>;
  setFocusGoal: (requested: number) => Promise<GoalPlanResult>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  reconcile: (action: ReconcileAction, ids: string[]) => Promise<void>;
  /** Detect a calendar-date change while the tab stays open. */
  rollover: () => Promise<TaskItem[]>;
}

let initPromise: Promise<TaskItem[]> | null = null;
let syncBound = false;

export const useAppStore = create<AppStoreState>((set, get) => {
  /** Reload from IndexedDB, then tell every other tab to do the same. */
  async function commit(): Promise<void> {
    await get().reload();
    broadcastChange();
  }

  /** Re-check for a new calendar day without a full cold start. */
  async function detectNewDay(): Promise<{ changed: boolean; leftovers: TaskItem[] }> {
    const today = todayISO();
    if (get().today === today) return { changed: false, leftovers: [] };

    const settings = get().settings;
    const pending = settings.pendingDailyFocusGoal ?? null;
    if (pending != null) {
      // Deferred reduction finally lands (PRD §6.2).
      await saveSettings({
        ...settings,
        dailyFocusGoal: clampGoal(pending),
        pendingDailyFocusGoal: null,
      });
    }

    await ensureTodayLog();
    const leftovers = await findLeftoverTasks(today);
    await setMeta(META_KEYS.lastOpenDate, today);
    await get().reload();
    return { changed: true, leftovers };
  }

  return {
    ready: false,
    tasks: [],
    logs: [],
    settings: {
      dailyFocusGoal: 3,
      themeMode: 'system',
      calendarType: 'jalali',
      enableSoundHaptics: true,
      enableBrowserNotifications: false,
      pendingDailyFocusGoal: null,
    },
    today: todayISO(),

    reload: async () => {
      const snap = await loadSnapshot();
      set({ tasks: snap.tasks, logs: snap.logs, settings: snap.settings });
    },

    /**
     * Cold start (PRD §6.1). Applies a deferred goal reduction, ensures today
     * has an activity record, and returns unfinished tasks from a previous
     * session so the caller can raise the gentle morning prompt. Tasks are
     * never migrated in the background at midnight.
     */
    init: async () => {
      if (initPromise) return initPromise;

      initPromise = (async () => {
        try {
          const today = todayISO();
          const lastOpen = await getMeta<string>(META_KEYS.lastOpenDate);

          let snap = await loadSnapshot();

          const pending = snap.settings.pendingDailyFocusGoal ?? null;
          if (lastOpen !== today && pending != null) {
            snap.settings = {
              ...snap.settings,
              dailyFocusGoal: clampGoal(pending),
              pendingDailyFocusGoal: null,
            };
            await saveSettings(snap.settings);
          }

          await ensureTodayLog();
          snap = await loadSnapshot();

          const leftovers = await findLeftoverTasks(today);
          await setMeta(META_KEYS.lastOpenDate, today);

          set({
            ready: true,
            tasks: snap.tasks,
            logs: snap.logs,
            settings: snap.settings,
            today,
          });

          if (!syncBound) {
            syncBound = true;
            subscribeToSync(() => void get().reload());
          }

          // Only offer the triage on the *first* session of a new day (PRD §6.1).
          return lastOpen !== today ? leftovers : [];
        } catch (err) {
          console.error('[qadam] init failed', err);
          set({ ready: true });
          return [];
        }
      })();

      return initPromise;
    },

    addTask: async (input) => {
      try {
        const title = input.title.trim();
        if (!title) return null;
        const task = await createTask({ ...input, title });
        await commit();
        return task;
      } catch (err) {
        console.error('[qadam] addTask failed', err);
        return null;
      }
    },

    editTask: async (id, patch) => {
      await updateTaskRow(id, patch);
      await commit();
    },

    removeTask: async (id) => {
      await deleteTask(id);
      await commit();
    },

    /**
     * Toggle a task's completion (PRD §5.1). Recurring reminders re-arm on
     * their next occurrence automatically inside the repository layer.
     */
    toggleTask: async (id) => {
      const task = get().tasks.find((t) => t.id === id);
      if (!task) return;

      if (task.isCompleted) {
        await uncompleteTask(id);
      } else {
        await completeTask(id);
        playSoftCheck(get().settings.enableSoundHaptics);
      }
      await commit();
    },

    /** One-click "Promote to Today" from the Parking Lot (PRD §5.2). */
    promote: async (id) => {
      await promoteToToday(id);
      await commit();
    },

    /**
     * Change the focus goal (PRD §6.2).
     *
     * Increases apply instantly. A decrease that would crowd out today's active
     * commitments is stored as a pending setting and takes effect tomorrow.
     */
    setFocusGoal: async (requested) => {
      const { settings, tasks, today } = get();
      const activeCount = tasks.filter(
        (t) => t.type === 'focus' && !t.isCompleted && t.targetDate === today,
      ).length;

      const plan = planGoalChange(
        settings.dailyFocusGoal,
        requested,
        activeCount,
        settings.pendingDailyFocusGoal ?? null,
      );

      await saveSettings({
        ...settings,
        dailyFocusGoal: plan.goal,
        pendingDailyFocusGoal: plan.pending,
      });
      await ensureTodayLog();
      await commit();
      return plan;
    },

    updateSettings: async (patch) => {
      const merged = { ...get().settings, ...patch };
      await saveSettings(merged);
      await commit();
    },

    /** Apply the morning-prompt choice to the leftover tasks (PRD §6.1). */
    reconcile: async (action, ids) => {
      if (!ids.length) return;
      if (action === 'carry') await carryToToday(ids);
      else if (action === 'park') await sendToParkingLot(ids);
      else await discardTasks(ids);
      await commit();
    },

    /**
     * Called by the day watcher when the tab has stayed open past midnight.
     * Applies a pending goal reduction, refreshes today's record, and returns
     * any leftovers so the gentle prompt can be raised again.
     */
    rollover: async () => {
      const { changed, leftovers } = await detectNewDay();
      if (changed) set({ today: todayISO() });
      return leftovers;
    },
  };
});


