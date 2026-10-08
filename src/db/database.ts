import Dexie, { type EntityTable } from 'dexie';
import type { DailyLog, MetaRow, TaskItem, UserSettings } from '../types';
import { SETTINGS_ROW_ID } from '../types';
import { DEFAULT_FOCUS_GOAL, clampGoal } from '../lib/goals';

/**
 * The settings row as persisted. `UserSettings` itself has no id field (PRD
 * schema), so the single row carries an explicit primary key.
 */
export type SettingsRow = UserSettings & { id: string };

/** Default settings used on first run (PRD §3). */
export function defaultSettings(): UserSettings {
  return {
    dailyFocusGoal: DEFAULT_FOCUS_GOAL,
    themeMode: 'system',
    calendarType: 'jalali',
    enableSoundHaptics: true,
    enableBrowserNotifications: false,
    pendingDailyFocusGoal: null,
  };
}

/**
 * Local-first database.
 *
 * Everything lives in IndexedDB — there is no server, no account and no
 * network call anywhere in the data path (PRD §2.2).
 */
export class QadamDatabase extends Dexie {
  tasks!: EntityTable<TaskItem, 'id'>;
  logs!: EntityTable<DailyLog, 'date'>;
  settings!: EntityTable<SettingsRow, 'id'>;
  meta!: EntityTable<MetaRow, 'key'>;

  constructor() {
    super('qadam');

    // NOTE: booleans are not valid IndexedDB keys, so `isCompleted` is
    // deliberately *not* indexed — completion is filtered in memory.
    this.version(1).stores({
      tasks: 'id, type, targetDate, createdAt, [type+targetDate]',
      logs: 'date, status',
      settings: 'id',
      meta: 'key',
    });
  }
}

export const db = new QadamDatabase();

/** Read settings, creating them on first run. Never returns `null`. */
export async function ensureSettings(): Promise<UserSettings> {
  const existing = await db.settings.get(SETTINGS_ROW_ID);
  if (existing) {
    // Guard against older/partial rows.
    const merged: SettingsRow = {
      ...defaultSettings(),
      ...existing,
      id: SETTINGS_ROW_ID,
      dailyFocusGoal: clampGoal(existing.dailyFocusGoal ?? DEFAULT_FOCUS_GOAL),
    };
    if (
      merged.dailyFocusGoal !== existing.dailyFocusGoal ||
      existing.pendingDailyFocusGoal === undefined
    ) {
      await db.settings.put(merged);
    }
    const { id: _id, ...settings } = merged;
    void _id;
    return settings;
  }

  const seeded: SettingsRow = { ...defaultSettings(), id: SETTINGS_ROW_ID };
  await db.settings.put(seeded);
  const { id: _id, ...settings } = seeded;
  void _id;
  return settings;
}

/** Persist a full settings object. */
export async function putSettings(settings: UserSettings): Promise<void> {
  await db.settings.put({ ...settings, id: SETTINGS_ROW_ID });
}
