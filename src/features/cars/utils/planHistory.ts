import { Car, PlanHistoryEntry, DayOverride } from '../../../core/types/car.types';

/**
 * Returns the daily plan that was effective on a given date for a car.
 *
 * Logic:
 *  - If the car has a `planHistory` array, find the last entry whose
 *    `effectiveFrom` is on or before midnight of the target date.
 *  - If no history exists (legacy cars), fall back to `car.dailyPlan`.
 *  - If no plan at all, returns 0.
 *
 * This ensures that updating the daily plan today does NOT retroactively
 * change the debt calculation for any past day.
 */
export function getPlanForDate(car: Car | null | undefined, date: Date): number {
    if (!car) return 0;

    const history = car.planHistory;

    // No history recorded yet — legacy car, fall back to current plan
    if (!history || history.length === 0) {
        return car.dailyPlan ?? 0;
    }

    // The target: midnight (start of day) in local time
    const targetMs = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

    // Find the last entry whose effectiveFrom <= start of target day
    let effective: PlanHistoryEntry | null = null;
    for (const entry of history) {
        if (entry.effectiveFrom <= targetMs) {
            effective = entry;
        }
    }

    if (effective) return effective.plan;

    // The date is before the first plan was recorded — use the oldest entry
    return history[0].plan;
}

/**
 * Formats a Date to 'YYYY-MM-DD' for looking up dayOverrides.
 */
function toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Returns the effective plan for a specific day, factoring in any DayOverrides.
 * If the day is overridden as OFF, returns 0.
 * If the day is overridden with a DISCOUNT, returns the custom plan.
 * Otherwise, falls back to the historical daily plan for that date.
 */
export function getEffectivePlanForDay(car: Car | null | undefined, date: Date): number {
    if (!car) return 0;
    
    const overrides = car.dayOverrides;
    if (overrides) {
        const key = toDateKey(date);
        const override = overrides[key];
        if (override) {
            if (override.type === 'OFF') return 0;
            if (override.type === 'DISCOUNT' && override.customPlan !== undefined) {
                return override.customPlan;
            }
        }
    }

    return getPlanForDate(car, date);
}

/**
 * Checks if a specific date has been explicitly marked as a day off via overrides.
 */
export function isDayOverrideOff(car: Car | null | undefined, date: Date): boolean {
    if (!car || !car.dayOverrides) return false;
    const override = car.dayOverrides[toDateKey(date)];
    return override?.type === 'OFF';
}

/**
 * Builds the initial planHistory entry when a car is first created.
 */
export function buildInitialPlanHistory(dailyPlan: number, createdAt?: number): PlanHistoryEntry[] {
    return [{
        plan: dailyPlan,
        effectiveFrom: createdAt ?? Date.now(),
    }];
}

/**
 * Appends a new plan-change entry to an existing history array.
 * Call this when the user saves a new daily plan value.
 *
 * @param existing  Current planHistory array (may be empty / undefined for legacy cars)
 * @param newPlan   The new daily plan value
 * @param currentPlan The old plan value (used to seed legacy history if needed)
 * @param carCreatedAt Unix ms when the car was created (used to seed legacy history)
 */
export function appendPlanChange(
    existing: PlanHistoryEntry[] | undefined,
    newPlan: number,
    currentPlan: number,
    carCreatedAt?: number,
): PlanHistoryEntry[] {
    // Seed legacy history if this car has never had a planHistory entry
    const base: PlanHistoryEntry[] = (existing && existing.length > 0)
        ? [...existing]
        : [{ plan: currentPlan, effectiveFrom: carCreatedAt ?? Date.now() }];

    // Don't append a duplicate if the plan didn't actually change
    const last = base[base.length - 1];
    if (last && last.plan === newPlan) return base;

    // New entry takes effect from the very start of today
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    return [...base, { plan: newPlan, effectiveFrom: todayMidnight.getTime() }];
}
