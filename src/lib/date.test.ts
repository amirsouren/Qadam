import { describe, expect, it } from 'vitest';
import {
  addDaysISO,
  addMonthsClamped,
  compareISO,
  fromISODate,
  isoDatePart,
  toISODate,
  weekdayOf,
} from './date';

describe('date helpers', () => {
  it('round-trips ISO strings through local Date', () => {
    for (const iso of ['2026-01-01', '2026-02-28', '2024-02-29', '2026-12-31']) {
      expect(toISODate(fromISODate(iso))).toBe(iso);
    }
  });

  it('adds days across month and year boundaries', () => {
    expect(addDaysISO('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDaysISO('2024-03-01', -1)).toBe('2024-02-29');
  });

  it('clamps month additions to the target month length', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonthsClamped('2026-03-31', 1)).toBe('2026-04-30');
    expect(addMonthsClamped('2026-01-15', 1)).toBe('2026-02-15');
    expect(addMonthsClamped('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonthsClamped('2026-05-10', 12)).toBe('2027-05-10');
  });

  it('compares ISO dates lexicographically', () => {
    expect(compareISO('2026-01-01', '2026-01-02')).toBe(-1);
    expect(compareISO('2026-01-02', '2026-01-01')).toBe(1);
    expect(compareISO('2026-01-01', '2026-01-01')).toBe(0);
  });

  it('extracts the date part of an ISO datetime', () => {
    expect(isoDatePart('2026-06-15T23:59:59.999Z')).toBe('2026-06-15');
  });

  it('reports weekday with 0 = Sunday', () => {
    expect(weekdayOf('2026-10-11')).toBe(0); // a known Sunday
    expect(weekdayOf('2026-10-17')).toBe(6); // the following Saturday
  });
});
