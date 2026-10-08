import { describe, expect, it } from 'vitest';
import { isLeapJalaaliYear, jalaaliMonthLength, toGregorian, toJalaali } from './jalali';

/** Native reference: ICU's Persian calendar (available in Node + all browsers). */
const intlFmt = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});

function intlJalaali(gy: number, gm: number, gd: number) {
  const parts = intlFmt.formatToParts(new Date(Date.UTC(gy, gm - 1, gd)));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? NaN);
  return { jy: get('year'), jm: get('month'), jd: get('day') };
}

/** Iterate `step` days across a Gregorian range, yielding [y, m, d]. */
function* eachDay(from: Date, to: Date, stepDays = 1) {
  const day = 24 * 60 * 60 * 1000;
  for (let t = from.getTime(); t <= to.getTime(); t += stepDays * day) {
    const d = new Date(t);
    yield [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()] as const;
  }
}

describe('jalali (Persian) calendar conversion', () => {
  it('round-trips Gregorian → Jalali → Gregorian', () => {
    let checked = 0;
    for (const [gy, gm, gd] of eachDay(new Date(Date.UTC(1980, 0, 1)), new Date(Date.UTC(2070, 11, 31)), 7)) {
      const j = toJalaali(gy, gm, gd);
      const g = toGregorian(j.jy, j.jm, j.jd);
      expect([g.gy, g.gm, g.gd]).toEqual([gy, gm, gd]);
      checked++;
    }
    expect(checked).toBeGreaterThan(4000);
  });

  it('agrees with the native Intl Persian calendar', () => {
    let mismatched = 0;
    let checked = 0;
    let firstMismatch = '';

    for (const [gy, gm, gd] of eachDay(new Date(Date.UTC(1990, 0, 1)), new Date(Date.UTC(2060, 11, 31)))) {
      const mine = toJalaali(gy, gm, gd);
      const theirs = intlJalaali(gy, gm, gd);
      checked++;
      if (mine.jy !== theirs.jy || mine.jm !== theirs.jm || mine.jd !== theirs.jd) {
        mismatched++;
        if (!firstMismatch) {
          firstMismatch = `${gy}-${gm}-${gd}: ours=${JSON.stringify(mine)} intl=${JSON.stringify(theirs)}`;
        }
      }
    }

    expect(checked).toBeGreaterThan(25000);
    if (mismatched > 0) console.warn(`[jalali] ${mismatched}/${checked} diverge from Intl. First: ${firstMismatch}`);
    // Allow at most a hair of definitional drift between the arithmetic
    // 33-year rule and ICU's astronomical calculation.
    expect(mismatched / checked).toBeLessThan(0.002);
  });

  it('reports correct month lengths', () => {
    for (let jy = 1390; jy <= 1420; jy++) {
      expect(jalaaliMonthLength(jy, 1)).toBe(31);
      expect(jalaaliMonthLength(jy, 6)).toBe(31);
      expect(jalaaliMonthLength(jy, 7)).toBe(30);
      expect(jalaaliMonthLength(jy, 11)).toBe(30);
      expect([29, 30]).toContain(jalaaliMonthLength(jy, 12));
    }
  });

  it('walks consecutive days across a Jalali new year without gaps', () => {
    // Farvardin 1 is the day after the last day of Esfand.
    for (let jy = 1400; jy <= 1410; jy++) {
      const lastEsfand = jalaaliMonthLength(jy, 12);
      const g1 = toGregorian(jy, 12, lastEsfand);
      const next = new Date(Date.UTC(g1.gy, g1.gm - 1, g1.gd + 1));
      const back = toJalaali(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
      expect(back).toEqual({ jy: jy + 1, jm: 1, jd: 1 });
    }
  });

  it('marks leap years consistently with month length', () => {
    for (let jy = 1390; jy <= 1420; jy++) {
      expect(jalaaliMonthLength(jy, 12) === 30).toBe(isLeapJalaaliYear(jy));
    }
  });
});
