import type { DailyLog, TaskItem, UserSettings } from '../types';

/** Focus tasks assigned to a given day, in creation order. */
export function focusTasksFor(tasks: TaskItem[], date: string): TaskItem[] {
  return tasks
    .filter((t) => t.type === 'focus' && t.targetDate === date)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

/** Reminder tasks assigned to a given day, soonest time first. */
export function reminderTasksFor(tasks: TaskItem[], date: string): TaskItem[] {
  return tasks
    .filter((t) => t.type === 'reminder' && t.targetDate === date)
    .sort((a, b) => {
      const at = a.reminderTime ?? '99:99';
      const bt = b.reminderTime ?? '99:99';
      if (at !== bt) return at < bt ? -1 : 1;
      return a.createdAt < b.createdAt ? -1 : 1;
    });
}

/** Parking-Lot items (untimed backlog), newest thought first. */
export function somedayTasks(tasks: TaskItem[]): TaskItem[] {
  return tasks
    .filter((t) => t.type === 'someday')
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

/** Unfinished focus tasks for a day — used by the goal-limit rules. */
export function activeFocusCount(tasks: TaskItem[], date: string): number {
  return focusTasksFor(tasks, date).filter((t) => !t.isCompleted).length;
}

/**
 * How many slots to render (PRD §5.1). Normally exactly `dailyFocusGoal`; the
 * `Math.max` guarantees an existing commitment is never hidden if the goal was
 * reduced while tasks were already in flight.
 */
export function slotCount(goal: number, focusTasks: TaskItem[]): number {
  return Math.max(goal, focusTasks.length);
}

/** True when every slot is filled *and* checked — triggers the celebration. */
export function isDayComplete(goal: number, focusTasks: TaskItem[]): boolean {
  if (focusTasks.length === 0) return false;
  if (focusTasks.length < goal) return false;
  return focusTasks.every((t) => t.isCompleted);
}

/** Whether a day is fully checked off (used for a subtle calendar dot). */
export function isLogComplete(log: DailyLog | undefined): boolean {
  if (!log) return false;
  return log.targetGoal > 0 && log.completedCount >= log.targetGoal;
}

/**
 * Zero-guilt summary for a calendar day (PRD §5.3). Falls back to the current
 * goal for days with no record — never invents a "failure".
 */
export function daySummary(
  logs: DailyLog[],
  date: string,
  settings: UserSettings,
  today: string,
): { completed: number; goal: number; visited: boolean } {
  const log = logs.find((l) => l.date === date);
  if (!log) {
    return { completed: 0, goal: settings.dailyFocusGoal, visited: date === today };
  }
  return { completed: log.completedCount, goal: log.targetGoal, visited: true };
}

/** Case-insensitive title match used by the search field (`/` shortcut). */
export function matchesSearch(task: TaskItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return task.title.toLowerCase().includes(q);
}
