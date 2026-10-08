import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';
import { DayDetailCard } from '../components/calendar/DayDetailCard';
import {
  calendarMonthStart,
  dayCellNumber,
  formatMonthYear,
  formatMonthYearLatin,
  isoForCalendarDay,
  monthDayCount,
  shiftCalendarMonth,
  toPersianDigits,
  weekdayHeaders,
} from '../lib/format';
import { weekdayOf } from '../lib/date';

/**
 * Calendar & historical activity (PRD §5.3).
 *
 * A calm month grid where unvisited days simply rest in `idle_gray`. There are
 * no streaks, no red badges and no failure tags — only a neutral
 * “Tasks Completed: X / Goal: Y” when a day is selected.
 */
export function CalendarPage() {
  const tasks = useAppStore((s) => s.tasks);
  const logs = useAppStore((s) => s.logs);
  const today = useAppStore((s) => s.today);
  const settings = useAppStore((s) => s.settings);
  const selectedDay = useUiStore((s) => s.selectedDay);
  const selectDay = useUiStore((s) => s.selectDay);

  const calendar = settings.calendarType;
  const isJalali = calendar === 'jalali';
  const weekStart: 0 | 6 = isJalali ? 6 : 0; // Persian weeks begin Saturday

  const [monthAnchor, setMonthAnchor] = useState(() => calendarMonthStart(today, calendar));

  // Re-anchor whenever the calendar type changes so the grid matches it.
  useEffect(() => {
    setMonthAnchor(calendarMonthStart(today, calendar));
  }, [calendar, today]);

  const cells = useMemo(() => {
    const total = monthDayCount(monthAnchor, calendar);
    const lead = (weekdayOf(monthAnchor) - weekStart + 7) % 7;
    const out: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= total; d++) out.push(isoForCalendarDay(monthAnchor, d, calendar));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [monthAnchor, calendar, weekStart]);

  const headers = weekdayHeaders(calendar, weekStart);

  const goToMonth = (delta: number) =>
    setMonthAnchor((prev) => shiftCalendarMonth(prev, delta, calendar));

  const resetToToday = () => setMonthAnchor(calendarMonthStart(today, calendar));

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-3 pt-2">
        <div>
          <p className="text-sm font-medium text-primary">Calendar</p>
          <h1
            className="mt-0.5 text-2xl font-semibold tracking-tight text-ink"
            dir={isJalali ? 'rtl' : 'ltr'}
            aria-label={formatMonthYearLatin(monthAnchor, calendar)}
          >
            {formatMonthYear(monthAnchor, calendar)}
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={resetToToday}
            className="rounded-xl border border-idle-soft px-3 py-2 text-xs font-medium text-idle transition hover:border-primary/40 hover:text-primary dark:border-white/10"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            aria-label="Previous month"
            className="grid h-9 w-9 place-items-center rounded-xl border border-idle-soft text-idle transition hover:border-primary/40 hover:text-primary dark:border-white/10"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path d="M12 4l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            aria-label="Next month"
            className="grid h-9 w-9 place-items-center rounded-xl border border-idle-soft text-idle transition hover:border-primary/40 hover:text-primary dark:border-white/10"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path d="M8 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* Weekday headers */}
      <div
        data-testid="weekday-headers"
        className="grid grid-cols-7 gap-1.5 sm:gap-2"
        aria-hidden="true"
      >
        {headers.map((h, i) => (
          <div
            key={`${h}-${i}`}
            className="pb-1 text-center text-[11px] font-medium uppercase tracking-wider text-idle"
            dir={isJalali ? 'rtl' : 'ltr'}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <ul className="grid grid-cols-7 gap-1.5 sm:gap-2" role="list">
        {cells.map((iso, idx) => {
          if (!iso) {
            return <li key={`pad-${idx}`} aria-hidden="true" className="aspect-square" />;
          }

          const log = logs.find((l) => l.date === iso);
          const isToday = iso === today;
          const isFuture = iso > today;
          const visited = Boolean(log);
          const completed = log?.completedCount ?? 0;
          const goal = log?.targetGoal ?? settings.dailyFocusGoal;
          const hasActivity = completed > 0;
          const isSelected = selectedDay === iso;
          const dayNum = dayCellNumber(iso, calendar);

          let tone: string;
          if (isToday) {
            tone = 'bg-primary text-white shadow-sm font-semibold';
          } else if (visited) {
            tone =
              'bg-surface border border-idle-soft/70 text-ink hover:border-primary/50 dark:border-white/10';
          } else if (isFuture) {
            tone = 'bg-surface/40 text-idle/70 hover:border hover:border-idle-soft';
          } else {
            // idle_gray — a day the user never visited (PRD §5.3).
            tone = 'bg-idle-soft/70 text-idle dark:bg-white/[0.06]';
          }

          const ring = isSelected
            ? 'ring-2 ring-primary ring-offset-2 ring-offset-canvas'
            : '';

          const aria = `${formatMonthYear(monthAnchor, calendar)} ${dayNum} — ${
            isFuture
              ? 'upcoming'
              : `${completed} completed of ${goal} goal${visited ? '' : ', no activity recorded'}`
          }`;

          return (
            <li key={iso} className="aspect-square">
              <button
                type="button"
                onClick={() => selectDay(isSelected ? null : iso)}
                aria-pressed={isSelected}
                aria-label={aria}
                className={`relative flex h-full w-full flex-col items-center justify-center rounded-xl text-sm transition ${tone} ${ring}`}
              >
                <span className="tabular-nums leading-none">
                  {isJalali ? toPersianDigits(dayNum) : dayNum}
                </span>
                {hasActivity ? (
                  <span
                    className={`absolute bottom-1.5 h-1 w-1 rounded-full ${
                      isToday ? 'bg-white' : 'bg-primary'
                    }`}
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {selectedDay ? (
        <DayDetailCard
          date={selectedDay}
          today={today}
          logs={logs}
          tasks={tasks}
          settings={settings}
          onClose={() => selectDay(null)}
        />
      ) : (
        <p className="text-center text-xs text-idle">
          Grey days are simply days you didn’t open Qadam — nothing more. Tap any
          day for a gentle summary.
        </p>
      )}
    </div>
  );
}
