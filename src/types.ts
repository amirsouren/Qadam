/**
 * Qadam domain models.
 *
 * These mirror the PRD schema exactly. The only additions are a couple of
 * optional/internal bookkeeping fields explicitly required by the business
 * rules (deferred goal reduction, recurring occurrences) — each one is
 * documented at its definition site.
 */

/** What kind of thing a task is. */
export type TaskType = 'focus' | 'reminder' | 'someday';

/** How a task repeats. `none` = one-shot. */
export type RecurrenceType = 'none' | 'monthly' | 'yearly';

/** Which calendar the UI should render dates in. */
export type CalendarType = 'jalali' | 'gregorian';

/**
 * Lifecycle of a calendar day.
 * - `active`     — the user is (or was) present on this day while it is today.
 * - `logged`     — a past day the user visited; it has a real activity record.
 * - `idle_gray`  — a past day the user never visited (no `DailyLog` row exists,
 *                  rendering falls back to this neutral state). Kept on the type
 *                  so callers can express intent without a stored row.
 */
export type LogStatus = 'active' | 'logged' | 'idle_gray';

export interface TaskItem {
  /** UUID v4 */
  id: string;
  title: string;
  type: TaskType;
  /** ISO date (YYYY-MM-DD) — always stored as Gregorian, rendered localized. */
  targetDate: string;
  /** `HH:mm` 24h local time, or `null` when the task has no time of day. */
  reminderTime: string | null;
  recurrence: RecurrenceType;
  isCompleted: boolean;
  /** ISO DateTime, or `null`. */
  completedAt: string | null;
  /** ISO DateTime. */
  createdAt: string;
  /**
   * (Extension) The Gregorian date this occurrence was originally registered
   * on. Recurrence increments anchor to this, never to the moment the user
   * happened to press "Done" (PRD §6.3).
   */
  originDate?: string;
}

export interface DailyLog {
  /** ISO date (YYYY-MM-DD) */
  date: string;
  /** e.g. 3 — the focus goal in force on that day. */
  targetGoal: number;
  completedCount: number;
  status: LogStatus;
}

export interface UserSettings {
  /** Default: 3, Min: 1, Max: 7 */
  dailyFocusGoal: number;
  themeMode: 'system' | 'light' | 'dark';
  calendarType: CalendarType;
  enableSoundHaptics: boolean;
  enableBrowserNotifications: boolean;
  /**
   * (Extension) A goal reduction that was requested while today still had more
   * active commitments than the new limit. It is stored but not applied until
   * the next calendar day so the current day is never cut short (PRD §6.2).
   */
  pendingDailyFocusGoal?: number | null;
}

/** Small key/value rows for internal bookkeeping (not user-facing settings). */
export interface MetaRow {
  key: string;
  value: unknown;
}

/** The single canonical row id for the settings table. */
export const SETTINGS_ROW_ID = 'user';

/** Meta keys. */
export const META_KEYS = {
  /** ISO date of the last completed session — drives the morning prompt. */
  lastOpenDate: 'lastOpenDate',
  /** Reminder ids already surfaced as a native notification this session. */
  notifiedReminders: 'notifiedReminders',
} as const;
