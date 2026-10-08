import { db, ensureSettings, putSettings } from './database';
import type { DailyLog, LogStatus, TaskItem, UserSettings } from '../types';
import { uuid } from '../lib/id';
import { isoDatePart, todayISO } from '../lib/date';
import { nextOccurrence } from '../lib/recurrence';

/** Input for creating a task. `id` / timestamps are assigned for you. */
export interface NewTaskInput {
  title: string;
  type: TaskItem['type'];
  targetDate?: string;
  reminderTime?: string | null;
  recurrence?: TaskItem['recurrence'];
}

/** Everything the UI needs in one snapshot. */
export interface AppSnapshot {
  tasks: TaskItem[];
  logs: DailyLog[];
  settings: UserSettings;
}

function sortByTargetThenCreated(a: TaskItem, b: TaskItem): number {
  if (a.targetDate !== b.targetDate) return a.targetDate < b.targetDate ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

/** Load the entire local database into memory (small data volume by design). */
export async function loadSnapshot(): Promise<AppSnapshot> {
  const [tasks, logs, settings] = await Promise.all([
    db.tasks.orderBy('targetDate').toArray(),
    db.logs.orderBy('date').toArray(),
    ensureSettings(),
  ]);
  return { tasks: [...tasks].sort(sortByTargetThenCreated), logs, settings };
}

/* ------------------------------------------------------------------ *
 * Tasks
 * ------------------------------------------------------------------ */

/** Create a task. Returns the persisted row. */
export async function createTask(input: NewTaskInput): Promise<TaskItem> {
  const now = new Date().toISOString();
  const targetDate = input.targetDate ?? todayISO();
  const task: TaskItem = {
    id: uuid(),
    title: input.title.trim(),
    type: input.type,
    targetDate,
    reminderTime: input.reminderTime ?? null,
    recurrence: input.recurrence ?? 'none',
    isCompleted: false,
    completedAt: null,
    createdAt: now,
    originDate: targetDate,
  };
  await db.tasks.add(task);
  await refreshLog(targetDate);
  return task;
}

/** Patch fields on a task. */
export async function updateTask(
  id: string,
  patch: Partial<Omit<TaskItem, 'id'>>,
): Promise<void> {
  const existing = await db.tasks.get(id);
  if (!existing) return;
  const beforeDate = existing.targetDate;
  await db.tasks.update(id, patch);
  if (patch.targetDate && patch.targetDate !== beforeDate) {
    await refreshLog(beforeDate);
    await refreshLog(patch.targetDate);
  }
}

/** Permanently remove a task. */
export async function deleteTask(id: string): Promise<void> {
  const existing = await db.tasks.get(id);
  if (!existing) return;
  await db.tasks.delete(id);
  await refreshLog(existing.targetDate);
}

/**
 * Mark a task done (PRD §5.1 / §6.3).
 *
 * One-shot tasks become `isCompleted`. Recurring reminders are re-armed on their
 * next occurrence — anchored to the originally registered date, never to the
 * moment the user clicked "Done" — so they naturally leave today's list.
 */
export async function completeTask(id: string): Promise<void> {
  const task = await db.tasks.get(id);
  if (!task || task.isCompleted) return;

  const completedAt = new Date().toISOString();

  if (task.recurrence === 'none') {
    await db.tasks.update(id, { isCompleted: true, completedAt });
  } else {
    const next = nextOccurrence(task.targetDate, task.recurrence, task.originDate);
    await db.tasks.update(id, {
      isCompleted: false,
      completedAt,
      targetDate: next ?? task.targetDate,
    });
  }

  await refreshLog(isoDatePart(completedAt));
}

/** Undo completion. */
export async function uncompleteTask(id: string): Promise<void> {
  const task = await db.tasks.get(id);
  if (!task || !task.isCompleted) return;
  await db.tasks.update(id, { isCompleted: false, completedAt: null });
  await refreshLog(task.targetDate);
}

/**
 * Move a Parking-Lot item into an open focus slot today (PRD §5.2).
 * The caller decides whether slots are full; this only performs the transfer.
 */
export async function promoteToToday(id: string): Promise<void> {
  const task = await db.tasks.get(id);
  if (!task) return;
  await db.tasks.update(id, {
    type: 'focus',
    targetDate: todayISO(),
    reminderTime: null,
  });
  await refreshLog(todayISO());
}

/* ------------------------------------------------------------------ *
 * Morning reconciliation (PRD §6.1)
 * ------------------------------------------------------------------ */

/**
 * Unfinished focus/reminder tasks left over from before today. These are what
 * the gentle morning prompt offers to triage. Nothing is ever migrated in the
 * background at midnight — this runs only on a real user session.
 */
export async function findLeftoverTasks(today: string = todayISO()): Promise<TaskItem[]> {
  const all = await db.tasks.toArray();
  return all
    .filter(
      (t) =>
        (t.type === 'focus' || t.type === 'reminder') &&
        !t.isCompleted &&
        t.targetDate < today,
    )
    .sort((a, b) => (a.targetDate < b.targetDate ? -1 : 1));
}

/** Carry leftover tasks forward to today. */
export async function carryToToday(ids: string[]): Promise<void> {
  const today = todayISO();
  for (const id of ids) {
    await db.tasks.update(id, { targetDate: today, type: 'focus' });
  }
  await refreshLog(today);
}

/** Send leftover tasks to the Mental Parking Lot. */
export async function sendToParkingLot(ids: string[]): Promise<void> {
  for (const id of ids) {
    await db.tasks.update(id, { type: 'someday', reminderTime: null });
  }
}

/** Discard leftover tasks permanently. */
export async function discardTasks(ids: string[]): Promise<void> {
  await db.tasks.bulkDelete(ids);
}

/* ------------------------------------------------------------------ *
 * Daily logs (PRD §5.3, §6.1)
 * ------------------------------------------------------------------ */

/**
 * Recompute a day's activity record.
 *
 * A record is only created when the day is today or when real activity exists,
 * so days the user never visited stay absent and render as `idle_gray`.
 */
export async function refreshLog(date: string): Promise<void> {
  const today = todayISO();
  const existing = await db.logs.get(date);
  const tasks = await db.tasks.toArray();
  const completedCount = tasks.filter(
    (t) => t.completedAt !== null && isoDatePart(t.completedAt) === date,
  ).length;

  if (date !== today && !existing && completedCount === 0) {
    return; // untouched past day → remains idle_gray
  }

  const settings = await ensureSettings();
  const status: LogStatus = date < today ? 'logged' : 'active';
  const row: DailyLog = {
    date,
    targetGoal: existing?.targetGoal ?? settings.dailyFocusGoal,
    completedCount,
    status,
  };
  await db.logs.put(row);
}

/**
 * Called on every app open: make sure today has an `active` record and demote
 * older records to `logged`. Days the user skipped are never created, so they
 * stay `idle_gray` no matter how long the gap (PRD §6.1).
 */
export async function ensureTodayLog(): Promise<void> {
  const today = todayISO();
  const settings = await ensureSettings();
  const tasks = await db.tasks.toArray();
  const completedCount = tasks.filter(
    (t) => t.completedAt !== null && isoDatePart(t.completedAt) === today,
  ).length;

  await db.logs.put({
    date: today,
    targetGoal: settings.dailyFocusGoal,
    completedCount,
    status: 'active',
  });

  const stale = await db.logs.where('date').below(today).toArray();
  const toDemote = stale.filter((l) => l.status !== 'logged');
  if (toDemote.length) {
    await db.logs.bulkPut(toDemote.map((l) => ({ ...l, status: 'logged' as LogStatus })));
  }
}

/* ------------------------------------------------------------------ *
 * Settings & meta
 * ------------------------------------------------------------------ */

/** Persist settings (single row). */
export async function saveSettings(settings: UserSettings): Promise<void> {
  await putSettings(settings);
}

/** Read a small bookkeeping value. */
export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row ? (row.value as T) : undefined;
}

/** Write a small bookkeeping value. */
export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

