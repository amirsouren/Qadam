import { useEffect } from 'react';

export interface ShortcutHandlers {
  /** `N` — open the Quick Add modal. */
  onQuickAdd: () => void;
  /** `/` — focus search, or jump to the mental dump when there is no field. */
  onSearch: () => void;
  /** Digits `1..7` — toggle the focus task in that slot (0-based index). */
  onToggleSlot: (index: number) => void;
  /** `?` — show the keyboard shortcut reference. */
  onShortcuts: () => void;
  /** `Escape` — close the top overlay that is not already handled by a dialog. */
  onEscape: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * Global keyboard shortcuts (PRD §4.3). Deliberately ignores keystrokes while
 * the user is typing, so the accelerators never eat text input.
 *
 * Note: modal dismissal (`Escape`) for Radix dialogs is handled by the dialog
 * primitive itself; the global handler only closes inline overlays, so a single
 * press never closes two things at once.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  const { onQuickAdd, onSearch, onToggleSlot, onShortcuts, onEscape } = handlers;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key === 'Escape') {
        onEscape();
        return;
      }

      if (isTypingTarget(event.target)) return;

      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        onQuickAdd();
        return;
      }

      if (event.key === '/') {
        event.preventDefault();
        onSearch();
        return;
      }

      if (event.key === '?') {
        event.preventDefault();
        onShortcuts();
        return;
      }

      if (event.key >= '1' && event.key <= '7') {
        event.preventDefault();
        onToggleSlot(Number(event.key) - 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onQuickAdd, onSearch, onToggleSlot, onShortcuts, onEscape]);
}
