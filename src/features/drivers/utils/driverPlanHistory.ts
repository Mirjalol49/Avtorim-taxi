import { Driver, DriverPlanHistoryEntry, DriverDayOverride } from '../../../core/types/driver.types';
import { Car } from '../../../core/types/car.types';
import type { Transaction } from '../../../core/types/transaction.types';
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

    // No history entry is on or before the target date — the driver's plan hadn't started yet.
    return 0;
}

/**
 * Returns the car ID that was effective on a given date for a driver.
 */
export function getCarIdForDriverDate(driver: Driver | null | undefined, date: Date, fallbackCar?: Car | null): string | null {
    if (!driver) return null;

    const history = driver.planHistory;

    if (!history || history.length === 0) {
        return fallbackCar ? fallbackCar.id : null;
    }

    const targetMs = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

    let effective: DriverPlanHistoryEntry | null = null;
    for (const entry of history) {
        if (entry.effectiveFrom <= targetMs) {
            effective = entry;
        }
    }

    if (effective) {
        return effective.carId;
    }

    return null;
}

export interface TransactionCarSnapshot {
    id?: string | null;
    name: string;
    licensePlate?: string;
    label: string;
}

const parseCarLabel = (label: string, id?: string | null): TransactionCarSnapshot => {
    const parts = label.split(/\s+[—-]\s+/);
    const name = parts[0]?.trim() || label;
    const licensePlate = parts.length > 1 ? parts.slice(1).join(' — ').trim() : undefined;
    return { id, name, licensePlate, label };
};

export function getCarForDriverDate(
    driver: Driver | null | undefined,
    date: Date,
    cars: Car[],
    fallbackCar?: Car | null
): Car | null {
    const carId = getCarIdForDriverDate(driver, date, fallbackCar);
    if (!carId) return null;
    return cars.find(c => c.id === carId) ?? null;
}

export function resolveTransactionCarSnapshot(
    tx: Transaction,
    driver: Driver | null | undefined,
    cars: Car[],
    fallbackCar?: Car | null
): TransactionCarSnapshot | null {
    if (tx.carName) {
        return parseCarLabel(tx.carName, tx.carId);
    }

    if (tx.carId) {
        const car = cars.find(c => c.id === tx.carId);
        if (car) {
            return {
                id: car.id,
                name: car.name,
                licensePlate: car.licensePlate,
                label: `${car.name} — ${car.licensePlate}`,
            };
        }
    }

    const historicalCar = getCarForDriverDate(driver, new Date(tx.timestamp), cars, fallbackCar);
    if (!historicalCar) return null;

    return {
        id: historicalCar.id,
        name: historicalCar.name,
        licensePlate: historicalCar.licensePlate,
        label: `${historicalCar.name} — ${historicalCar.licensePlate}`,
    };
}

function toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Returns the effective plan for a specific day, factoring in Driver DayOverrides.
 */
export function getEffectivePlanForDriverDay(driver: Driver | null | undefined, date: Date, fallbackCar?: Car | null): number {
    if (!driver) return 0;
    
    // Check lifecycle: before joined (including the join day itself as free)
    const startMs = driver.startDate || driver.createdAt;
    if (startMs) {
        const targetDateMidnight = new Date(date);
        targetDateMidnight.setHours(0, 0, 0, 0);
        
        const startDateMidnight = new Date(startMs);
        startDateMidnight.setHours(0, 0, 0, 0);
        
        // 1. If target date is strictly before the start date -> 0
        // 2. The start date itself IS charged.
        if (targetDateMidnight.getTime() < startDateMidnight.getTime()) {
            return 0;
        }
    }

    // Check lifecycle: after fired
    if (driver.isDeleted && driver.quitDate) {
        const targetDateMidnight = new Date(date);
        targetDateMidnight.setHours(0, 0, 0, 0);
        
        const endDateMidnight = new Date(driver.quitDate);
        endDateMidnight.setHours(0, 0, 0, 0);
        
        if (targetDateMidnight.getTime() > endDateMidnight.getTime()) {
            return 0;
        }
    }
    
    // Automatic suspension: If the car is currently in repair, pause the plan for today and the future.
    // Past days rely on explicit historical overrides (added at the time of repair).
    if (fallbackCar?.inRepair === true) {
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const targetDateMidnight = new Date(date);
        targetDateMidnight.setHours(0, 0, 0, 0);
        if (targetDateMidnight.getTime() >= todayMidnight.getTime()) {
            return 0;
        }
    }

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
            if (override.type === 'OFF' || override.type === 'NOT_WORKING' || override.type === 'REPAIR') return 0;
            if (override.type === 'DISCOUNT' && override.customPlan !== undefined) {
                return override.customPlan;
            }
        }
    }

    return getPlanForDriverDate(driver, date, fallbackCar);
}

export function getDriverDayOverrideType(driver: Driver | null | undefined, date: Date, fallbackCar?: Car | null): DriverDayOverride['type'] | undefined {
    if (!driver) return undefined;
    
    // Automatic suspension override: Treat as REPAIR if car is currently broken
    if (fallbackCar?.inRepair === true) {
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const targetDateMidnight = new Date(date);
        targetDateMidnight.setHours(0, 0, 0, 0);
        if (targetDateMidnight.getTime() >= todayMidnight.getTime()) {
            return 'REPAIR';
        }
    }

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
