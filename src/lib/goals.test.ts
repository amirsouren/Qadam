import { describe, expect, it } from 'vitest';
import { applyPendingOnNewDay, clampGoal, planGoalChange } from './goals';

describe('dynamic focus limit (PRD §6.2)', () => {
  it('clamps the goal into 1..7', () => {
    expect(clampGoal(0)).toBe(1);
    expect(clampGoal(-5)).toBe(1);
    expect(clampGoal(99)).toBe(7);
    expect(clampGoal(NaN)).toBe(3);
    expect(clampGoal(4.6)).toBe(5);
  });

  it('applies an increase immediately, even mid-day', () => {
    // 3 → 4 with all 3 slots busy: the extra slot appears right away.
    expect(planGoalChange(3, 4, 3)).toEqual({ goal: 4, pending: null, deferred: false });
    expect(planGoalChange(3, 7, 3)).toEqual({ goal: 7, pending: null, deferred: false });
  });

  it('defers a decrease that would crowd out today’s commitments', () => {
    // 3 → 2 while 3 tasks are still active: today is untouched.
    const plan = planGoalChange(3, 2, 3);
    expect(plan.goal).toBe(3);
    expect(plan.pending).toBe(2);
    expect(plan.deferred).toBe(true);
  });

  it('applies a decrease immediately when nothing is crowded out', () => {
    expect(planGoalChange(3, 2, 1)).toEqual({ goal: 2, pending: null, deferred: false });
    expect(planGoalChange(3, 2, 0)).toEqual({ goal: 2, pending: null, deferred: false });
    expect(planGoalChange(3, 2, 2)).toEqual({ goal: 2, pending: null, deferred: false });
  });

  it('clears a stale deferral when the goal is raised again', () => {
    const plan = planGoalChange(3, 4, 3, 2);
    expect(plan.goal).toBe(4);
    expect(plan.pending).toBeNull();
  });

  it('clears a deferral when the user re-confirms the current goal', () => {
    const plan = planGoalChange(3, 3, 3, 2);
    expect(plan.goal).toBe(3);
    expect(plan.pending).toBeNull();
  });

  it('applies the pending reduction on the next calendar day', () => {
    expect(applyPendingOnNewDay(3, 2)).toBe(2);
    expect(applyPendingOnNewDay(3, null)).toBe(3);
    // Guard against out-of-range values written by an older build.
    expect(applyPendingOnNewDay(3, 99)).toBe(7);
  });
});
