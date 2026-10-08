import { describe, expect, it } from 'vitest';
import type { DailyLog, TaskItem, UserSettings } from '../types';
import {
  activeFocusCount,
  daySummary,
  focusTasksFor,
  isDayComplete,
  reminderTasksFor,
  slotCount,
  somedayTasks,
} from './selectors';

function task(partial: Partial<TaskItem> & { id: string; title: string }): TaskItem {
  return {
    type: 'focus',
    targetDate: '2026-10-08',
    reminderTime: null,
    recurrence: 'none',
    isCompleted: false,
    completedAt: null,
    createdAt: '2026-10-08T08:00:00.000Z',
    ...partial,
  };
}

const settings: UserSettings = {
  dailyFocusGoal: 3,
  themeMode: 'system',
  calendarType: 'jalali',
  enableSoundHaptics: true,
  enableBrowserNotifications: false,
  pendingDailyFocusGoal: null,
};

describe('today selectors (PRD §5.1)', () => {
  it('groups tasks by type and target date', () => {
    const tasks = [
      task({ id: 'a', title: 'Write' }),
      task({ id: 'b', title: 'Call mum', type: 'reminder', reminderTime: '17:30' }),
      task({ id: 'c', title: 'Someday thing', type: 'someday', targetDate: '2026-11-01' }),
      task({ id: 'd', title: 'Tomorrow', targetDate: '2026-10-09' }),
    ];
    expect(focusTasksFor(tasks, '2026-10-08').map((t) => t.id)).toEqual(['a']);
    expect(reminderTasksFor(tasks, '2026-10-08').map((t) => t.id)).toEqual(['b']);
    expect(somedayTasks(tasks).map((t) => t.id)).toEqual(['c']);
  });

  it('orders reminders by time, untimed last', () => {
    const tasks = [
      task({ id: 'x', title: 'Badge', type: 'reminder', reminderTime: null }),
      task({ id: 'y', title: 'Late', type: 'reminder', reminderTime: '20:00' }),
      task({ id: 'z', title: 'Early', type: 'reminder', reminderTime: '08:00' }),
    ];
    expect(reminderTasksFor(tasks, '2026-10-08').map((t) => t.id)).toEqual(['z', 'y', 'x']);
  });

  it('renders exactly the goal number of slots', () => {
    expect(slotCount(3, [])).toBe(3);
    expect(slotCount(3, [task({ id: 'a', title: 'a' })])).toBe(3);
    expect(slotCount(7, [])).toBe(7);
  });

  it('never hides an existing commitment when slots exceed the goal', () => {
    // A deferred reduction can briefly leave more tasks than the goal.
    const four = [1, 2, 3, 4].map((n) => task({ id: `t${n}`, title: `t${n}` }));
    expect(slotCount(3, four)).toBe(4);
  });

  it('counts only unfinished focus tasks as active', () => {
    const tasks = [
      task({ id: 'a', title: 'a' }),
      task({ id: 'b', title: 'b', isCompleted: true }),
      task({ id: 'c', title: 'c', targetDate: '2026-10-09' }),
      task({ id: 'd', title: 'd', type: 'someday' }),
    ];
    expect(activeFocusCount(tasks, '2026-10-08')).toBe(1);
  });

  it('celebrates only when every slot is filled and checked', () => {
    const filled = [task({ id: 'a', title: 'a', isCompleted: true })];
    const twoOfThree = [
      task({ id: 'a', title: 'a', isCompleted: true }),
      task({ id: 'b', title: 'b', isCompleted: true }),
    ];
    const allThree = [
      task({ id: 'a', title: 'a', isCompleted: true }),
      task({ id: 'b', title: 'b', isCompleted: true }),
      task({ id: 'c', title: 'c', isCompleted: true }),
    ];
    expect(isDayComplete(3, filled)).toBe(false); // slots still open
    expect(isDayComplete(3, twoOfThree)).toBe(false); // one slot unchecked
    expect(isDayComplete(3, allThree)).toBe(true);
    expect(isDayComplete(3, [])).toBe(false);
  });
});

describe('zero-guilt calendar summary (PRD §5.3)', () => {
  const logs: DailyLog[] = [{ date: '2026-10-07', targetGoal: 4, completedCount: 2, status: 'logged' }];

  it('reports X / Y for a visited day', () => {
    expect(daySummary(logs, '2026-10-07', settings, '2026-10-08')).toEqual({
      completed: 2,
      goal: 4,
      visited: true,
    });
  });

  it('falls back neutrally for a day that was never visited', () => {
    // No judgement — just the current goal and zero activity.
    expect(daySummary(logs, '2026-10-01', settings, '2026-10-08')).toEqual({
      completed: 0,
      goal: 3,
      visited: false,
    });
  });

  it('treats today as visited once a record exists', () => {
    expect(daySummary(logs, '2026-10-08', settings, '2026-10-08').visited).toBe(true);
  });
});
