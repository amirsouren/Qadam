/**
 * Gregorian date helpers.
 *
 * All dates are persisted as `YYYY-MM-DD` strings (PRD schema) using the
 * *local* calendar day — never UTC — so "today" means the user's today.
 */

/** Zero-pads a number to at least 2 digits. */
function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format a `Date` as a local `YYYY-MM-DD` string. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The current local date as `YYYY-MM-DD`. */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/** Parse a `YYYY-MM-DD` string into a local `Date` at midnight. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Add (or subtract) whole days to an ISO date string. */
export function addDaysISO(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/**
 * Add whole months to an ISO date, clamping the day-of-month to the target
 * month's length (e.g. Jan 31 + 1 month → Feb 28/29). Clamping keeps the
 * anniversary stable rather than sliding it forward.
 */
export function addMonthsClamped(iso: string, months: number): string {
  const d = fromISODate(iso);
  const day = d.getDate();
  const targetMonth = d.getMonth() + months;
  const targetYear = d.getFullYear() + Math.floor(targetMonth / 12);
  const normalized = ((targetMonth % 12) + 12) % 12;
  // Last day of the target month in a plain Gregorian calendar:
  const lastDay = new Date(targetYear, normalized + 1, 0).getDate();
  d.setDate(1);
  d.setFullYear(targetYear, normalized, Math.min(day, lastDay));
  return toISODate(d);
}

/** Lexicographic comparison of ISO dates (safe: fixed-width format). */
export function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** True when `iso` is strictly before today. */
export function isBeforeToday(iso: string, today: string = todayISO()): boolean {
  return compareISO(iso, today) < 0;
}

/** Extract the `YYYY-MM-DD` part of an ISO DateTime string. */
export function isoDatePart(dateTime: string): string {
  return dateTime.slice(0, 10);
}

/** Day of week for an ISO date (0 = Sunday … 6 = Saturday). */
export function weekdayOf(iso: string): number {
  return fromISODate(iso).getDay();
}

/** The first day of the Gregorian month containing `iso`. */
export function gregorianMonthStart(iso: string): string {
  const d = fromISODate(iso);
  d.setDate(1);
  return toISODate(d);
}

/** Number of days in the Gregorian month containing `iso`. */
export function gregorianMonthLength(iso: string): number {
  const d = fromISODate(iso);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Shift a Gregorian month by `delta` months, always landing on day 1. */
export function shiftGregorianMonth(iso: string, delta: number): string {
  const d = fromISODate(iso);
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  return toISODate(d);
}
