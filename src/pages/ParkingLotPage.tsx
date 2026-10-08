import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';
import { focusTasksFor, matchesSearch, somedayTasks } from '../store/selectors';
import { formatDayLabel, toPersianDigits } from '../lib/format';

/**
 * Mental Parking Lot (PRD §5.2) — an untimed scratchpad for thoughts, tasks
 * and future ideas, with a one-click “Promote to Today”.
 */
export function ParkingLotPage() {
  const tasks = useAppStore((s) => s.tasks);
  const today = useAppStore((s) => s.today);
  const settings = useAppStore((s) => s.settings);
  const addTask = useAppStore((s) => s.addTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const promote = useAppStore((s) => s.promote);
  const search = useUiStore((s) => s.search);

  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const goal = settings.dailyFocusGoal;
  const openSlots = Math.max(0, goal - focusTasksFor(tasks, today).length);
  const slotsFull = openSlots === 0;
  const items = somedayTasks(tasks).filter((t) => matchesSearch(t, search));
  const isJalali = settings.calendarType === 'jalali';

  const dump = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = draft.trim();
    if (!title || busy) return;
    setBusy(true);
    const created = await addTask({ title, type: 'someday' });
    if (created) setDraft('');
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <p className="text-sm font-medium text-primary">Mental Parking Lot</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-ink sm:text-[27px]">
          Park it. Come back whenever.
        </h1>
        <p className="mt-1.5 max-w-prose text-sm text-idle">
          No dates, no times, no guilt. Empty your head here and keep your
          Today list quiet.
        </p>
      </header>

      {/* Instant mental dump */}
      <form onSubmit={(e) => void dump(e)} className="flex gap-2">
        <label htmlFor="qadam-dump" className="sr-only">
          Park a thought
        </label>
        <input
          id="qadam-dump"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Whatever is on your mind…"
          maxLength={160}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-full border border-idle-soft bg-surface px-4 py-3 text-[15px] text-ink placeholder:text-idle focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25 dark:border-white/10"
        />
        <button
          type="submit"
          disabled={!draft.trim() || busy}
          className="shrink-0 rounded-full bg-primary px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Park it
        </button>
      </form>

      {slotsFull ? (
        <p className="rounded-xl bg-idle-soft/50 px-3.5 py-2 text-xs text-idle dark:bg-white/5">
          All {goal} focus slot{goal === 1 ? ' is' : 's are'} taken today, so
          promoting is paused. Free a slot (or raise your goal in Settings) to
          pull one of these forward.
        </p>
      ) : null}

      <section aria-label="Parked thoughts" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-idle">
            Parked {items.length > 0 ? `· ${items.length}` : ''}
          </h2>
          <span className="text-xs text-idle">{openSlots} slot{openSlots === 1 ? '' : 's'} open today</span>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-idle/40 px-5 py-9 text-center">
            <p className="text-sm font-medium text-ink">Nothing parked yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-idle">
              {search
                ? `No parked thought matches “${search}”.`
                : 'Drop a thought above and it will wait here patiently.'}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((task) => (
              <li
                key={task.id}
                className="group flex items-center gap-3 rounded-2xl border border-idle-soft/70 bg-surface px-3.5 py-3 transition hover:border-primary/30 dark:border-white/10"
              >
                <span className="min-w-0 flex-1 text-[15px] leading-snug text-ink">
                  {task.title}
                </span>

                <span
                  className="hidden shrink-0 text-xs text-idle sm:block"
                  dir={isJalali ? 'rtl' : 'ltr'}
                >
                  {isJalali
                    ? toPersianDigits(formatDayLabel(task.createdAt.slice(0, 10), 'jalali'))
                    : formatDayLabel(task.createdAt.slice(0, 10), 'gregorian')}
                </span>

                <button
                  type="button"
                  disabled={slotsFull}
                  onClick={() => void promote(task.id)}
                  title={
                    slotsFull
                      ? 'All focus slots are full right now'
                      : 'Move this into today’s focus'
                  }
                  className="shrink-0 rounded-full border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:border-idle/40 disabled:text-idle disabled:hover:bg-transparent"
                >
                  Promote to Today
                </button>

                <button
                  type="button"
                  onClick={() => void removeTask(task.id)}
                  aria-label={`Delete “${task.title}”`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-idle opacity-0 transition hover:bg-idle-soft hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M6 6l8 8M14 6l-8 8"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
