/**
 * Localized formatting.
 *
 * Qadam renders the *date* according to the user's chosen calendar while the
 * surrounding UI copy stays in the app language. Jalali display uses Persian
 * month/weekday names and Eastern-Arabic numerals for an authentic feel;
 * Gregorian display uses English names and Latin numerals.
 *
 * All calendar math derives from our own `jalali.ts` (never a second,
 * independent source) so the grid, greeting and detail cards can never drift
 * apart by a day.
 */

import type { CalendarType } from '../types';
import { fromISODate, gregorianMonthLength, toISODate, weekdayOf } from './date';
import { jalaaliMonthLength, toGregorian, toJalaali } from './jalali';

export const JALALI_MONTHS_FA = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const JALALI_MONTHS_LATIN = [
  'Farvardin',
  'Ordibehesht',
  'Khordad',
  'Tir',
  'Mordad',
  'Shahrivar',
  'Mehr',
  'Aban',
  'Azar',
  'Dey',
  'Bahman',
  'Esfand',
];

const GREGORIAN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Index = JS day-of-week (0 = Sunday). */
const WEEKDAYS_FA = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
  'شنبه',
];

const WEEKDAYS_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Conventional single-letter Persian weekday headers (ی د س چ پ ج ش). */
const WEEKDAYS_FA_SHORT = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Convert ASCII digits to Eastern-Arabic (Persian) digits. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** The weekday name for an ISO date in the given calendar language. */
export function weekdayName(iso: string, calendar: CalendarType): string {
  const idx = weekdayOf(iso);
  return calendar === 'jalali' ? WEEKDAYS_FA[idx] : WEEKDAYS_EN[idx];
}

/** Short weekday labels for a month grid header (calendar-aware ordering). */
export function weekdayHeaders(calendar: CalendarType, weekStart: 0 | 6): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const idx = (weekStart + i) % 7;
    out.push(calendar === 'jalali' ? WEEKDAYS_FA_SHORT[idx] : WEEKDAYS_EN[idx].slice(0, 3));
  }
  return out;
}

/**
 * Day-of-month number to render inside a calendar cell for `iso`.
 * Jalali mode shows the Jalali day; Gregorian mode the Gregorian day.
 */
export function dayCellNumber(iso: string, calendar: CalendarType): number {
  const d = fromISODate(iso);
  if (calendar === 'jalali') {
    return toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate()).jd;
  }
  return d.getDate();
}

/** Full, human readable date for the header banner. */
export function formatFullDate(iso: string, calendar: CalendarType): string {
  const d = fromISODate(iso);
  const wd = weekdayName(iso, calendar);
  if (calendar === 'jalali') {
    const { jy, jm, jd } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return `${wd}، ${toPersianDigits(jd)} ${JALALI_MONTHS_FA[jm - 1]} ${toPersianDigits(jy)}`;
  }
  return `${wd}, ${GREGORIAN_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Month + year label for a calendar header, given the month's first day. */
export function formatMonthYear(monthStartISO: string, calendar: CalendarType): string {
  const d = fromISODate(monthStartISO);
  if (calendar === 'jalali') {
    const { jy, jm } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return `${JALALI_MONTHS_FA[jm - 1]} ${toPersianDigits(jy)}`;
  }
  return `${GREGORIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Latin month + year (tooltips / accessibility labels). */
export function formatMonthYearLatin(monthStartISO: string, calendar: CalendarType): string {
  const d = fromISODate(monthStartISO);
  if (calendar === 'jalali') {
    const { jy, jm } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return `${JALALI_MONTHS_LATIN[jm - 1]} ${jy}`;
  }
  return `${GREGORIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Short label for a single day (calendar detail card title). */
export function formatDayLabel(iso: string, calendar: CalendarType): string {
  const d = fromISODate(iso);
  const wd = weekdayName(iso, calendar);
  if (calendar === 'jalali') {
    const { jy, jm, jd } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    void jy;
    return `${wd}، ${toPersianDigits(jd)} ${JALALI_MONTHS_FA[jm - 1]}`;
  }
  return `${wd}, ${GREGORIAN_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** A gentle, time-of-day aware greeting. */
export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Rest easy';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Winding down';
}

/** `HH:mm` (24h) for a `Date`, matching the stored reminder format. */
export function formatTime(date: Date = new Date()): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Days in the month that starts on `monthStartISO`, per calendar. */
export function monthDayCount(monthStartISO: string, calendar: CalendarType): number {
  const d = fromISODate(monthStartISO);
  if (calendar === 'jalali') {
    const { jy, jm } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return jalaaliMonthLength(jy, jm);
  }
  return gregorianMonthLength(monthStartISO);
}

/** Gregorian ISO date for `dayOfMonth` of the calendar month starting at `monthStartISO`. */
export function isoForCalendarDay(
  monthStartISO: string,
  dayOfMonth: number,
  calendar: CalendarType,
): string {
  if (calendar === 'jalali') {
    const d = fromISODate(monthStartISO);
    const { jy, jm } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const g = toGregorian(jy, jm, dayOfMonth);
    return `${g.gy}-${pad2(g.gm)}-${pad2(g.gd)}`;
  }
  const dd = fromISODate(monthStartISO);
  dd.setDate(dayOfMonth);
  return toISODate(dd);
}

/** Shift a calendar month by `delta`, always landing on that month's 1st day. */
export function shiftCalendarMonth(
  monthStartISO: string,
  delta: number,
  calendar: CalendarType,
): string {
  const d = fromISODate(monthStartISO);
  if (calendar === 'jalali') {
    const { jy, jm } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const total = jy * 12 + (jm - 1) + delta;
    const ny = Math.floor(total / 12);
    const nm = (total % 12) + 1;
    const g = toGregorian(ny, nm, 1);
    return `${g.gy}-${pad2(g.gm)}-${pad2(g.gd)}`;
  }
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  return toISODate(d);
}

/** The calendar-typed month that contains `iso`, expressed as its 1st day. */
export function calendarMonthStart(iso: string, calendar: CalendarType): string {
  const d = fromISODate(iso);
  if (calendar === 'jalali') {
    const { jy, jm } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const g = toGregorian(jy, jm, 1);
    return `${g.gy}-${pad2(g.gm)}-${pad2(g.gd)}`;
  }
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}


