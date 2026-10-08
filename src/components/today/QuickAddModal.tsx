import { useEffect, useState } from 'react';
import type { RecurrenceType, TaskType } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { useUiStore } from '../../store/useUiStore';
import { Modal } from '../ui/Modal';
import { todayISO } from '../../lib/date';

const typeOptions: { value: TaskType; label: string; hint: string }[] = [
  { value: 'focus', label: 'Focus', hint: 'A slot for today' },
  { value: 'reminder', label: 'Reminder', hint: 'Timed nudge' },
  { value: 'someday', label: 'Someday', hint: 'Parking Lot' },
];

/**
 * Quick Add (PRD §5.1 / §4.3 — bound to `N`). Doubles as the instant mental
 * dump: type a thought, hit Enter, get back to calm.
 */
export function QuickAddModal() {
  const open = useUiStore((s) => s.quickAddOpen);
  const presetType = useUiStore((s) => s.quickAddType);
  const close = useUiStore((s) => s.closeQuickAdd);
  const addTask = useAppStore((s) => s.addTask);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>(presetType);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [saving, setSaving] = useState(false);

  // Re-seed the form each time the modal opens.
  useEffect(() => {
    if (open) {
      setTitle('');
      setType(presetType);
      setDate(todayISO());
      setTime('');
      setRecurrence('none');
      setSaving(false);
    }
  }, [open, presetType]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    const created = await addTask({
      title: trimmed,
      type,
      targetDate: type === 'someday' ? todayISO() : date,
      reminderTime: type === 'reminder' && time ? time : null,
      recurrence: type === 'reminder' ? recurrence : 'none',
    });

    if (created) close();
    else setSaving(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title="Add something"
      description="One line is enough. You can refine it later."
      width="max-w-lg"
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex gap-1.5 rounded-xl bg-idle-soft/45 p-1 dark:bg-white/5">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              aria-pressed={type === opt.value}
              className={`flex-1 rounded-lg px-2 py-2 text-sm font-medium transition ${
                type === opt.value
                  ? 'bg-surface text-primary shadow-sm dark:bg-slate-700'
                  : 'text-idle hover:text-ink'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="qadam-title" className="sr-only">
            Title
          </label>
          <input
            id="qadam-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What’s on your mind?"
            maxLength={160}
            autoComplete="off"
            className="w-full rounded-xl border border-idle-soft bg-canvas px-3.5 py-3 text-[15px] text-ink placeholder:text-idle focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25 dark:bg-slate-900/50"
          />
          <p className="mt-1.5 text-xs text-idle">
            {typeOptions.find((o) => o.value === type)?.hint}
          </p>
        </div>

        {type !== 'someday' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="qadam-date" className="mb-1 block text-xs font-medium text-idle">
                Date
              </label>
              <input
                id="qadam-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-idle-soft bg-canvas px-3 py-2.5 text-sm text-ink focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25 dark:bg-slate-900/50"
              />
            </div>

            {type === 'reminder' ? (
              <>
                <div>
                  <label htmlFor="qadam-time" className="mb-1 block text-xs font-medium text-idle">
                    Time (optional)
                  </label>
                  <input
                    id="qadam-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-idle-soft bg-canvas px-3 py-2.5 text-sm text-ink focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25 dark:bg-slate-900/50"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="qadam-recur" className="mb-1 block text-xs font-medium text-idle">
                    Repeat
                  </label>
                  <select
                    id="qadam-recur"
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                    className="w-full rounded-xl border border-idle-soft bg-canvas px-3 py-2.5 text-sm text-ink focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25 dark:bg-slate-900/50"
                  >
                    <option value="none">Does not repeat</option>
                    <option value="monthly">Every month</option>
                    <option value="yearly">Every year</option>
                  </select>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="text-xs text-idle">
            Press <kbd className="rounded border border-idle-soft px-1">Enter</kbd> to save
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-xl px-3.5 py-2 text-sm text-idle transition hover:bg-idle-soft/60 hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

