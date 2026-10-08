import type { DailyLog, TaskItem, UserSettings } from '../../types';
import { formatDayLabel, toPersianDigits } from '../../lib/format';
import { daySummary } from '../../store/selectors';

export interface DayDetailCardProps {
  date: string;
  today: string;
  logs: DailyLog[];
  tasks: TaskItem[];
  settings: UserSettings;
  onClose: () => void;
}

/**
 * The minimal historical card shown when a day is clicked (PRD §5.3).
 *
 * Reads `Tasks Completed: X / Goal: Y` and nothing more — no streaks, no
 * red badges, no failure language. Days that were never visited are described
 * neutrally rather than judged.
 */
export function DayDetailCard({
  date,
  today,
  logs,
  tasks,
  settings,
  onClose,
}: DayDetailCardProps) {
  const summary = daySummary(logs, date, settings, today);
  const isJalali = settings.calendarType === 'jalali';
  const dir = isJalali ? 'rtl' : 'ltr';
  const isFuture = date > today;
  const isToday = date === today;

  const dayTasks = tasks.filter(
    (t) => t.targetDate === date && (t.type === 'focus' || t.type === 'reminder'),
  );

  return (
    <div className="card animate-soft-in px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-ink" dir={dir}>
            {isJalali
              ? toPersianDigits(formatDayLabel(date, 'jalali'))
              : formatDayLabel(date, 'gregorian')}
          </h3>
          <p className="mt-0.5 text-xs text-idle">
            {isToday ? 'Today' : isFuture ? 'Upcoming' : summary.visited ? 'A day you visited' : 'A quiet, unvisited day'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close day details"
          className="grid h-7 w-7 place-items-center rounded-lg text-idle transition hover:bg-idle-soft hover:text-ink"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
            <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {!isFuture ? (
        <div className="mt-3 flex items-center gap-4 rounded-xl bg-canvas px-4 py-3 dark:bg-slate-900/50">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tabular-nums text-primary">
              {summary.completed}
            </span>
            <span className="text-sm text-idle">completed</span>
          </div>
          <span className="h-6 w-px bg-idle-soft dark:bg-white/10" aria-hidden="true" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tabular-nums text-ink">{summary.goal}</span>
            <span className="text-sm text-idle">goal</span>
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-xs text-idle">
        {isFuture
          ? 'Nothing to review yet — the day will happen first.'
          : summary.visited
            ? 'A gentle snapshot. Rest of the story is yours.'
            : 'No record for this day, and that is perfectly fine.'}
      </p>

      {dayTasks.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          {dayTasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm text-ink">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  t.isCompleted ? 'bg-primary' : 'bg-idle'
                }`}
                aria-hidden="true"
              />
              <span className={t.isCompleted ? 'text-idle line-through' : ''}>{t.title}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
