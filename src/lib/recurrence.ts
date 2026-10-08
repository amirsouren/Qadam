import type { RecurrenceType } from '../types';
import { addMonthsClamped } from './date';

/**
 * Compute the next `targetDate` for a recurring task (PRD §6.3).
 *
 * The next occurrence is anchored *strictly* to the task's originally
 * registered date and stepped forward in whole periods until it lands after the
 * current `targetDate`. It is completely independent of the day/time the user
 * happened to press "Done" — completing on 3 Jan a reminder registered for
 * 25 Dec still yields 25 Dec of the following year.
 *
 * @param targetDate  the occurrence currently being completed (`YYYY-MM-DD`)
 * @param recurrence  `monthly` | `yearly` | `none`
 * @param originDate  the date the task was originally registered
 *                    (`YYYY-MM-DD`). Falls back to `targetDate`.
 * @returns the next occurrence, or `null` for non-recurring tasks.
 */
export function nextOccurrence(
  targetDate: string,
  recurrence: RecurrenceType,
  originDate?: string | null,
): string | null {
  if (recurrence === 'none') return null;

  const stepMonths = recurrence === 'monthly' ? 1 : 12;
  const anchor = originDate || targetDate;

  let k = 1;
  let next = addMonthsClamped(anchor, stepMonths * k);
  // Step from the anchor (never from the previous result) so month-length
  // clamping cannot drift the anniversary over time.
  while (next <= targetDate && k < 1200) {
    k += 1;
    next = addMonthsClamped(anchor, stepMonths * k);
  }
  return next;
}
