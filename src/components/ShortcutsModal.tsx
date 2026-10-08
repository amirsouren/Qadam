import { useUiStore } from '../store/useUiStore';
import { Modal } from './ui/Modal';

const rows: { keys: string[]; action: string }[] = [
  { keys: ['N'], action: 'Open Quick Add (mental dump)' },
  { keys: ['/'], action: 'Focus search' },
  { keys: ['1', '…', '7'], action: 'Toggle that focus slot' },
  { keys: ['?'], action: 'Show this reference' },
  { keys: ['Esc'], action: 'Close any modal or drawer' },
];

/** Keyboard reference for the desktop, keyboard-first workflow (PRD §4.3). */
export function ShortcutsModal() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const close = useUiStore((s) => s.closeShortcuts);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title="Keyboard shortcuts"
      description="Qadam is built to be driven from the keyboard."
    >
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li
            key={row.action}
            className="flex items-center justify-between gap-4 rounded-lg px-1 py-1.5"
          >
            <span className="text-sm text-ink">{row.action}</span>
            <span className="flex shrink-0 gap-1">
              {row.keys.map((k) => (
                <kbd
                  key={k}
                  className="min-w-6 rounded-md border border-idle-soft bg-canvas px-1.5 py-0.5 text-center text-xs font-medium text-idle dark:border-white/10 dark:bg-slate-900/60"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
