import { useEffect, useRef } from 'react';
import type { TaskItem, UserSettings } from '../types';
import { reminderTasksFor } from '../store/selectors';
import { todayISO } from '../lib/date';

const ICON = '/icons/icon-192.png';

/** Keys already surfaced this session, so a reload never spams the user. */
const alreadyNotified = new Set<string>();

/** Ask the browser for notification permission (called from Settings). */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  try {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const res = await Notification.requestPermission();
    return res === 'granted';
  } catch {
    return false;
  }
}

async function showNotification(title: string, body: string): Promise<void> {
  const options: NotificationOptions = {
    body,
    icon: ICON,
    badge: ICON,
    tag: title,
    silent: false,
  };
  try {
    // Prefer the service worker so the notification still renders when the tab
    // has been backgrounded by the OS.
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg && 'showNotification' in reg) {
      await reg.showNotification(title, options);
      return;
    }
  } catch {
    /* fall through to a page-level notification */
  }
  try {
    new Notification(title, options);
  } catch {
    /* permission revoked / unsupported — fail silently */
  }
}

/**
 * Fires native notifications for today's timed reminders whose moment has
 * arrived (PRD §5.4 / §2.3).
 *
 * This is intentionally a lightweight in-page scheduler: Qadam is local-first
 * with no push server, so reminders fire while the app (or its installed
 * window) is running, and degrade gracefully otherwise.
 */
export function useNotifications(settings: UserSettings, tasks: TaskItem[]): void {
  const enabled = settings.enableBrowserNotifications;
  const tasksRef = useRef<TaskItem[]>(tasks);
  tasksRef.current = tasks;

  useEffect(() => {
    if (!enabled) return;
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      return;
    }

    let cancelled = false;

    const check = () => {
      if (cancelled) return;
      const now = new Date();
      const hh = `${now.getHours()}`.padStart(2, '0');
      const mm = `${now.getMinutes()}`.padStart(2, '0');
      const nowStr = `${hh}:${mm}`;
      const today = todayISO(now);

      const due = reminderTasksFor(tasksRef.current, today).filter(
        (t) =>
          !t.isCompleted &&
          t.reminderTime !== null &&
          t.reminderTime <= nowStr &&
          !alreadyNotified.has(`${t.id}:${today}`),
      );

      for (const task of due) {
        alreadyNotified.add(`${task.id}:${today}`);
        void showNotification(task.reminderTime! + ' · Qadam', task.title);
      }
    };

    check();
    const interval = window.setInterval(check, 20_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, tasks]);
}
