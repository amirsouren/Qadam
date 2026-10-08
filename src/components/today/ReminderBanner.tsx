import type { TaskItem } from '../../types';

export interface ReminderBannerProps {
  reminders: TaskItem[];
  onToggle: (id: string) => void;
}

/**
 * Compact reminders sub-section (PRD §5.1).
 *
 * Renders *only* when today actually has `type === 'reminder'` items. Timed
 * items read as `17:30 — Doctor Appointment`; untimed ones surface as a soft
 * coral badge (e.g. “Birthday”).
 */
export function ReminderBanner({ reminders, onToggle }: ReminderBannerProps) {
  if (reminders.length === 0) return null;

  const timed = reminders.filter((r) => r.reminderTime !== null);
  const untimed = reminders.filter((r) => r.reminderTime === null);

  return (
    <section
      aria-label="Reminders for today"
      className="animate-soft-in rounded-2xl border border-accent/35 bg-accent-soft px-4 py-3 dark:border-accent/30"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-accent/20 text-accent">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              d="M8 2a4 4 0 00-4 4c0 3-1.2 4-1.2 4h10.4S12 9 12 6a4 4 0 00-4-4zM6.4 13a1.7 1.7 0 003.2 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
          Today’s reminders
        </h2>
      </div>

      <ul className="flex flex-col gap-1.5">
        {timed.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              role="checkbox"
              aria-checked={r.isCompleted}
              onClick={() => onToggle(r.id)}
              className="group flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition hover:bg-accent/10"
            >
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border transition ${
                  r.isCompleted
                    ? 'border-accent bg-accent text-white'
                    : 'border-accent/50 text-transparent'
                }`}
              >
                <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
                  <path
                    d="M3.5 8.4l3 3 6-6.4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span
                className={`text-sm ${
                  r.isCompleted ? 'text-idle line-through' : 'text-ink'
                }`}
              >
                <span className="font-semibold tabular-nums text-accent">
                  {r.reminderTime}
                </span>
                <span className="text-idle"> — </span>
                {r.title}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {untimed.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {untimed.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onToggle(r.id)}
              aria-pressed={r.isCompleted}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                r.isCompleted
                  ? 'border-accent/40 bg-accent/10 text-idle line-through'
                  : 'border-accent/45 bg-white/70 text-accent hover:bg-white dark:bg-white/10'
              }`}
            >
              {r.title}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
