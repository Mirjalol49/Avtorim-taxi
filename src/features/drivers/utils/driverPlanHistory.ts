import { Driver, DriverPlanHistoryEntry, DriverDayOverride } from '../../../core/types/driver.types';
import { Car } from '../../../core/types/car.types';
import { getEffectivePlanForDay, getDayOverrideType } from '../../cars/utils/planHistory';

/**
 * Returns the daily plan that was effective on a given date for a driver.
 */
export function getPlanForDriverDate(driver: Driver | null | undefined, date: Date, fallbackCar?: Car | null): number {
    if (!driver) return 0;

    const history = driver.planHistory;

    // No history recorded yet, fallback to legacy car's plan history if available
    if (!history || history.length === 0) {
        if (fallbackCar) {
            return getEffectivePlanForDay(fallbackCar, date);
        }
        return driver.dailyPlan ?? 0;
    }

    const targetMs = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

    let effective: DriverPlanHistoryEntry | null = null;
    for (const entry of history) {
        if (entry.effectiveFrom <= targetMs) {
            effective = entry;
        }
    }

    if (effective) {
        if (effective.carId === null) return 0;
        return effective.plan;
    }

    if (history[0].carId === null) return 0;
    return history[0].plan;
}

function toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Returns the effective plan for a specific day, factoring in Driver DayOverrides.
 */
export function getEffectivePlanForDriverDay(driver: Driver | null | undefined, date: Date, fallbackCar?: Car | null): number {
    if (!driver) return 0;
    
    const overrides = driver.dayOverrides;
    // Fallback: If the driver has absolutely no overrides, we should respect the car's legacy overrides if they exist
    // This is ONLY for backward compatibility before the migration
    if (!overrides || Object.keys(overrides).length === 0) {
        if (fallbackCar && fallbackCar.dayOverrides && fallbackCar.dayOverrides[toDateKey(date)]) {
             const carOverrideType = getDayOverrideType(fallbackCar, date);
             if (carOverrideType === 'OFF' || carOverrideType === 'NOT_WORKING') return 0;
             if (carOverrideType === 'DISCOUNT') {
                 const co = fallbackCar.dayOverrides[toDateKey(date)];
                 if (co && co.customPlan !== undefined) return co.customPlan;
             }
        }
    }

    if (overrides) {
        const key = toDateKey(date);
        const override = overrides[key];
        if (override) {
            if (override.type === 'OFF' || override.type === 'NOT_WORKING') return 0;
            if (override.type === 'DISCOUNT' && override.customPlan !== undefined) {
                return override.customPlan;
            }
        }
    }

    return getPlanForDriverDate(driver, date, fallbackCar);
}

export function getDriverDayOverrideType(driver: Driver | null | undefined, date: Date, fallbackCar?: Car | null): DriverDayOverride['type'] | undefined {
    if (!driver) return undefined;
    const overrides = driver.dayOverrides;
    if (!overrides || Object.keys(overrides).length === 0) {
        if (fallbackCar) return getDayOverrideType(fallbackCar, date);
    }
    return overrides?.[toDateKey(date)]?.type;
}

export function appendDriverPlanChange(
    existing: DriverPlanHistoryEntry[] | undefined,
    newPlan: number,
    currentPlan: number,
    carId?: string | null,
    driverCreatedAt?: number,
    legacyCarId?: string | null
): DriverPlanHistoryEntry[] {
    const base: DriverPlanHistoryEntry[] = (existing && existing.length > 0)
        ? [...existing]
        : [{ plan: currentPlan, effectiveFrom: driverCreatedAt ?? Date.now(), carId: legacyCarId ?? null }];

    const last = base[base.length - 1];
    // If plan and carId are the same, don't append
    if (last && last.plan === newPlan && last.carId === carId) return base;

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    return [...base, { plan: newPlan, effectiveFrom: todayMidnight.getTime(), carId }];
}
