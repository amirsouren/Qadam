/**
 * Dynamic focus-limit logic (PRD §6.2).
 *
 * - Increasing the goal takes effect immediately (a new slot appears at once).
 * - Decreasing the goal while today still holds more active commitments than
 *   the new limit never truncates the current day: the reduction is stored as a
 *   *pending* setting and only applies on the next calendar day.
 * - A decrease that does not crowd out today's commitments applies right away.
 */

export const MIN_FOCUS_GOAL = 1;
export const MAX_FOCUS_GOAL = 7;
export const DEFAULT_FOCUS_GOAL = 3;

/** Clamp a requested goal into the supported 1..7 range. */
export function clampGoal(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_FOCUS_GOAL;
  return Math.min(MAX_FOCUS_GOAL, Math.max(MIN_FOCUS_GOAL, Math.round(value)));
}

export interface GoalPlanResult {
  /** The goal in force after the change. */
  goal: number;
  /** A reduction waiting for the next calendar day, or `null`. */
  pending: number | null;
  /** True when the reduction was deferred rather than applied. */
  deferred: boolean;
}

/**
 * Decide how a requested goal change should be applied.
 *
 * @param current       the goal currently in force
 * @param requested     the goal the user asked for
 * @param activeCount   unfinished focus tasks assigned to today
 * @param currentPending any reduction already waiting for tomorrow
 */
export function planGoalChange(
  current: number,
  requested: number,
  activeCount: number,
  currentPending: number | null = null,
): GoalPlanResult {
  const target = clampGoal(requested);

  if (target > current) {
    // Expansion is always safe and instant; it also clears any stale deferral.
    return { goal: target, pending: null, deferred: false };
  }

  if (target < current) {
    if (activeCount > target) {
      // Would cut off commitments made today → defer to the next calendar day.
      return { goal: current, pending: target, deferred: true };
    }
    return { goal: target, pending: null, deferred: false };
  }

  // Unchanged — a fresh explicit choice supersedes any older deferral.
  return { goal: current, pending: currentPending ? null : null, deferred: false };
}

/**
 * Apply a pending reduction on the first session of a new calendar day.
 * Returns the settings values that should be persisted.
 */
export function applyPendingOnNewDay(current: number, pending: number | null): number {
  if (pending == null) return current;
  return clampGoal(pending);
}
