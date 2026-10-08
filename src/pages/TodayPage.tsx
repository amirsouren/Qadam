import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';
import {
  focusTasksFor,
  isDayComplete,
  matchesSearch,
  reminderTasksFor,
  slotCount,
} from '../store/selectors';
import { FocusSlot } from '../components/today/FocusSlot';
import { ReminderBanner } from '../components/today/ReminderBanner';
import { CompletionBanner } from '../components/today/CompletionBanner';
import { formatFullDate, greeting, toPersianDigits } from '../lib/format';
import { playCelebration } from '../lib/sound';

/**
 * The “Today” dashboard (PRD §5.1) — a serene, single-column workspace.
 */
export function TodayPage() {
  const tasks = useAppStore((s) => s.tasks);
  const today = useAppStore((s) => s.today);
  const settings = useAppStore((s) => s.settings);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const search = useUiStore((s) => s.search);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);

  const goal = settings.dailyFocusGoal;
  const focusTasks = focusTasksFor(tasks, today);
  const reminders = reminderTasksFor(tasks, today).filter((t) => matchesSearch(t, search));
  const visibleFocus = focusTasks.filter((t) => matchesSearch(t, search));
  const slots = slotCount(goal, focusTasks);
  const allComplete = isDayComplete(goal, focusTasks);
  const doneCount = focusTasks.filter((t) => t.isCompleted).length;
  const isJalali = settings.calendarType === 'jalali';

  // Celebrate once, softly, the moment the last slot is checked.
  const wasComplete = useRef(allComplete);
  useEffect(() => {
    if (allComplete && !wasComplete.current) {
      playCelebration(settings.enableSoundHaptics);
    }
    wasComplete.current = allComplete;
  }, [allComplete, settings.enableSoundHaptics]);

  return (
    <div className="flex flex-col gap-5">
      {/* Header banner */}
      <header className="pt-2">
        <p className="text-sm font-medium text-primary">{greeting()}</p>
        <h1
          className="mt-0.5 text-left text-2xl font-semibold tracking-tight text-ink sm:text-[27px]"
          dir={isJalali ? 'rtl' : 'ltr'}
        >
          {isJalali
            ? toPersianDigits(formatFullDate(today, 'jalali'))
            : formatFullDate(today, 'gregorian')}
        </h1>
        <div className="mt-2 flex items-center gap-2.5">
          <div
            className="h-1.5 w-32 overflow-hidden rounded-full bg-idle-soft dark:bg-white/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={Math.min(doneCount, goal)}
            aria-label="Focus steps completed today"
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${goal ? Math.min(100, (doneCount / goal) * 100) : 0}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-idle">
            {Math.min(doneCount, goal)} of {goal} focus step{goal === 1 ? '' : 's'}
          </span>
        </div>
      </header>

      <ReminderBanner reminders={reminders} onToggle={(id) => void toggleTask(id)} />

      {/* Focus task slots */}
      <section aria-label="Focus tasks" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-idle">
            Today’s focus
          </h2>
          <button
            type="button"
            onClick={() => openQuickAdd('focus')}
            className="text-xs font-medium text-primary transition hover:brightness-110"
          >
            + New
          </button>
        </div>

        <ul className="flex flex-col gap-2">
          {Array.from(
            { length: search ? visibleFocus.length : slots },
            (_, i) => {
              const task = search ? visibleFocus[i] : focusTasks[i];
              return (
                <FocusSlot
                  key={task?.id ?? `empty-${i}`}
                  position={i + 1}
                  task={task}
                  onToggle={(id) => void toggleTask(id)}
                  onAdd={() => openQuickAdd('focus')}
                  onRemove={(id) => void removeTask(id)}
                />
              );
            },
          )}
        </ul>

        {search && visibleFocus.length === 0 ? (
          <p className="py-3 text-center text-sm text-idle">
            Nothing matching “{search}” in today’s focus.
          </p>
        ) : null}
      </section>

      {/* Full completion celebration */}
      {allComplete ? <CompletionBanner /> : null}

      {/* Quick brain-dump / Parking Lot launcher */}
      <Link
        to="/parking-lot"
        className="group mt-1 flex items-center justify-between gap-3 rounded-full border border-idle-soft/80 bg-surface px-5 py-3.5 text-sm shadow-sm transition hover:border-primary/40 hover:shadow dark:border-white/10"
      >
        <span className="flex items-center gap-2.5">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/12 text-primary transition group-hover:bg-primary/20">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
              <path
                d="M8 3.2v9.6M3.2 8h9.6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="font-medium text-ink">Brain dump / Parking Lot</span>
        </span>
        <span className="text-xs text-idle transition group-hover:text-primary">
          Park a thought →
        </span>
      </Link>
    </div>
  );
}
