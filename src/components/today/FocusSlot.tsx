import type { TaskItem } from '../../types';

export interface FocusSlotProps {
  /** 1-based slot position, shown as a subtle keyboard hint. */
  position: number;
  task: TaskItem | undefined;
  onToggle: (id: string) => void;
  onAdd: () => void;
  onRemove?: (id: string) => void;
}

/**
 * A single focus slot (PRD §5.1).
 *
 * Filled slots show the task with a soft check animation on completion; empty
 * slots render a discreet “+ Add a focus task” placeholder that never shouts.
 */
export function FocusSlot({ position, task, onToggle, onAdd, onRemove }: FocusSlotProps) {
  if (!task) {
    return (
      <li>
        <button
          type="button"
          onClick={onAdd}
          className="group flex w-full items-center gap-3 rounded-2xl border border-dashed border-idle/50 px-3 py-3 text-left text-sm text-idle transition hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-dashed border-idle/60 transition group-hover:border-primary/60">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
              <path
                d="M8 3.2v9.6M3.2 8h9.6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="flex-1">Add a focus task</span>
          <kbd className="rounded border border-idle-soft px-1.5 py-0.5 text-[10px] text-idle opacity-0 transition group-hover:opacity-100">
            {position}
          </kbd>
        </button>
      </li>
    );
  }

  const done = task.isCompleted;

  return (
    <li className="animate-soft-in">
      <div
        className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 transition ${
          done
            ? 'border-transparent bg-idle-soft/35 dark:bg-white/5'
            : 'border-idle-soft/70 bg-surface hover:border-primary/35 dark:border-white/10'
        }`}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={`Mark “${task.title}” as ${done ? 'not done' : 'done'}`}
          onClick={() => onToggle(task.id)}
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${
            done
              ? 'border-primary bg-primary text-white'
              : 'border-idle/70 text-transparent hover:border-primary hover:text-primary/30'
          }`}
        >
          <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${done ? 'animate-check-pop' : ''}`} aria-hidden="true">
            <path
              d="M3.5 8.4l3 3 6-6.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <span className="relative min-w-0 flex-1">
          <span
            className={`block truncate text-[15px] leading-snug ${
              done ? 'text-idle line-through decoration-primary/60' : 'text-ink'
            }`}
          >
            {task.title}
          </span>
        </span>

        <kbd
          className="hidden rounded border border-idle-soft px-1.5 py-0.5 text-[10px] text-idle opacity-0 transition group-hover:opacity-100 sm:block"
          aria-hidden="true"
        >
          {position}
        </kbd>

        {onRemove ? (
          <button
            type="button"
            onClick={() => onRemove(task.id)}
            aria-label={`Remove “${task.title}”`}
            className="grid h-7 w-7 place-items-center rounded-lg text-idle opacity-0 transition hover:bg-idle-soft hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
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
        ) : null}
      </div>
    </li>
  );
}
