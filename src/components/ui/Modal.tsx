import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Optional sub-heading announced to screen readers. */
  description?: string;
  children: ReactNode;
  /** Optional pinned action row. */
  footer?: ReactNode;
  /** Tailwind max-width utility (defaults to a compact card). */
  width?: string;
}

/**
 * Shared modal shell built on Radix's accessible Dialog primitive:
 * focus trapping, scroll lock, correct `aria-*`, and `Escape` dismissal all
 * come for free (PRD §2.1).
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 'max-w-md',
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] data-[state=open]:animate-soft-in dark:bg-black/60" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] ${width} -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-idle-soft/70 bg-surface p-5 shadow-2xl outline-none data-[state=open]:animate-soft-in dark:border-white/10`}
        >
          <div className="mb-4">
            <Dialog.Title className="text-lg font-semibold tracking-tight text-ink">
              {title}
            </Dialog.Title>
            {description ? (
              <Dialog.Description className="mt-1 text-sm text-idle">
                {description}
              </Dialog.Description>
            ) : (
              <Dialog.Description className="sr-only">{title}</Dialog.Description>
            )}
          </div>

          {children}

          {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}

          <Dialog.Close
            aria-label="Close"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-idle transition hover:bg-idle-soft/60 hover:text-ink"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
