import { describe, expect, it } from 'vitest';
import { nextOccurrence } from './recurrence';

describe('recurrence preservation (PRD §6.3)', () => {
  it('returns null for non-recurring tasks', () => {
    expect(nextOccurrence('2026-03-15', 'none')).toBeNull();
  });

  it('anchors a yearly reminder to its original registered date', () => {
    // Registered & completed on the exact day.
    expect(nextOccurrence('2026-03-15', 'yearly', '2026-03-15')).toBe('2027-03-15');
  });

  it('is independent of when the user clicked Done (late completion)', () => {
    // Completed 9 days late → next still lands on the registered anniversary.
    expect(nextOccurrence('2026-03-15', 'yearly', '2026-03-15')).toBe('2027-03-15');
    // Even if the occurrence drifted months (carried over), the anchor holds.
    expect(nextOccurrence('2026-11-01', 'yearly', '2026-03-15')).toBe('2027-03-15');
  });

  it('advances monthly reminders strictly from the registered date', () => {
    expect(nextOccurrence('2026-05-10', 'monthly', '2026-05-10')).toBe('2026-06-10');
    // Anchor prevents month-length drift: Jan 31 → Feb 28 → back to Mar 31.
    expect(nextOccurrence('2026-01-31', 'monthly', '2026-01-31')).toBe('2026-02-28');
    expect(nextOccurrence('2026-02-28', 'monthly', '2026-01-31')).toBe('2026-03-31');
    expect(nextOccurrence('2026-03-31', 'monthly', '2026-01-31')).toBe('2026-04-30');
  });

  it('keeps a Feb 29 anniversary returning to Feb 29 in leap years', () => {
    expect(nextOccurrence('2024-02-29', 'yearly', '2024-02-29')).toBe('2025-02-28');
    expect(nextOccurrence('2027-02-28', 'yearly', '2024-02-29')).toBe('2028-02-29');
  });

  it('always returns a date strictly after the current occurrence', () => {
    const cases: [string, 'monthly' | 'yearly'][] = [
      ['2026-01-01', 'monthly'],
      ['2026-12-31', 'monthly'],
      ['2026-06-15', 'yearly'],
      ['2024-02-29', 'yearly'],
    ];
    for (const [date, recurrence] of cases) {
      const next = nextOccurrence(date, recurrence, '2020-01-01');
      expect(next).not.toBeNull();
      expect(next! > date).toBe(true);
    }
  });
});
