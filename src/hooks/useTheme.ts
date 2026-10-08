import { useEffect, useState } from 'react';
import type { UserSettings } from '../types';

const STORAGE_KEY = 'qadam.theme';

/**
 * Resolves `themeMode` to an actual boolean *reactively*.
 *
 * Reading `document.documentElement.classList` during render is stale by one
 * frame (the class is applied in an effect), which would leave the toggle's
 * icon/label out of sync. Deriving it from the setting + the system preference
 * keeps the UI honest immediately.
 */
export function useResolvedDark(mode: UserSettings['themeMode']): boolean {
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    setSystemDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return mode === 'dark' || (mode === 'system' && systemDark);
}

/**
 * Applies `themeMode` (`system` | `light` | `dark`) to `<html>` and keeps the
 * `theme-color` meta in sync with the status bar. Also mirrors the choice into
 * localStorage so the inline script in `index.html` can restore it *before*
 * first paint — no theme flash on reload.
 */
export function useTheme(settings: UserSettings): void {
  const mode = settings.themeMode;

  useEffect(() => {
    const root = document.documentElement;
    const media =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;

    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && !!media?.matches);
      root.classList.toggle('dark', dark);
      root.style.colorScheme = dark ? 'dark' : 'light';

      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        /* storage blocked — ignore */
      }

      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#0B1120' : '#3B82F6');
    };

    apply();
    media?.addEventListener('change', apply);
    return () => media?.removeEventListener('change', apply);
  }, [mode]);
}
