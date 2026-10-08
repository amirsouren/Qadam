/**
 * Jalali (Persian / Solar Hijri) calendar conversion.
 *
 * This is a faithful TypeScript port of the well-known `jalaali-js` algorithm
 * (33-year rule, accurate for Jalaali years -61 … 3177). We vendor it rather
 * than pull a dependency so the app stays fully self-contained and offline.
 *
 * Reference: https://github.com/jalaali/jalaali-js
 */

export interface JalaliDate {
  /** Jalaali year (e.g. 1404) */
  jy: number;
  /** Jalaali month, 1..12 */
  jm: number;
  /** Jalaali day of month */
  jd: number;
}

export interface GregorianDate {
  gy: number;
  gm: number;
  gd: number;
}

/** Jalaali years starting the 33-year rule. */
const breaks = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192,
  2262, 2324, 2394, 2456, 3178,
];

function div(a: number, b: number): number {
  return ~~(a / b);
}

function mod(a: number, b: number): number {
  return a - ~~(a / b) * b;
}

/**
 * Leap status of a Jalaali year using the 33-year rule.
 * @returns 0 when the year is a leap year, otherwise years since last leap.
 */
function jalCalLeap(jy: number): number {
  const bl = breaks.length;
  let jp = breaks[0];
  let jm: number;
  let jump = 0;
  let leap: number;
  let n: number;
  let i: number;

  if (jy < jp || jy >= breaks[bl - 1]) {
    throw new Error('Invalid Jalaali year ' + jy);
  }

  for (i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    jp = jm;
  }
  n = jy - jp;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return leap;
}

/**
 * Determines the Gregorian year and the day in March on which Farvardin the
 * 1st falls, plus the leap marker.
 */
function jalCal(jy: number, withoutLeap = false): {
  gy: number;
  march: number;
  leap?: number;
} {
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jm: number;
  let jump = 0;
  let leap = 0;
  let leapG: number;
  let march: number;
  let n: number;
  let i: number;

  if (jy < jp || jy >= breaks[bl - 1]) {
    throw new Error('Invalid Jalaali year ' + jy);
  }

  // Find the limiting years for the Jalaali year jy.
  for (i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;

  // Number of leap years from AD 621 to the beginning of the current year.
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  // The same in the Gregorian calendar (until year gy).
  leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;

  // Gregorian date of Farvardin the 1st.
  march = 20 + leapJ - leapG;

  if (withoutLeap) return { gy, march };

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { gy, march, leap };
}

/** Julian day number from a Gregorian date. */
function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

/** Gregorian date from a Julian day number. */
function d2g(jdn: number): GregorianDate {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

/** Julian day number from a Jalaali date. */
function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy, true);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

/** Jalaali date from a Julian day number. */
function d2j(jdn: number): JalaliDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy, false);
  const jdn1f = g2d(gy, 3, r.march);
  let jd: number;
  let jm: number;
  let k: number;

  // Days passed since 1 Farvardin.
  k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

/** Convert a Gregorian date (y, m, d) to a Jalaali date. */
export function toJalaali(gy: number, gm: number, gd: number): JalaliDate {
  return d2j(g2d(gy, gm, gd));
}

/** Convert a Jalaali date to a Gregorian date. */
export function toGregorian(jy: number, jm: number, jd: number): GregorianDate {
  return d2g(j2d(jy, jm, jd));
}

/** Whether the given Jalaali year is a leap year (366 days). */
export function isLeapJalaaliYear(jy: number): boolean {
  return jalCalLeap(jy) === 0;
}

/** Number of days in a Jalaali month (1..12). */
export function jalaaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  if (isLeapJalaaliYear(jy)) return 30;
  return 29;
}

/** Validate a Jalaali date. */
export function isValidJalaaliDate(jy: number, jm: number, jd: number): boolean {
  return (
    jy >= -61 &&
    jy <= 3177 &&
    jm >= 1 &&
    jm <= 12 &&
    jd >= 1 &&
    jd <= jalaaliMonthLength(jy, jm)
  );
}
