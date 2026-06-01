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

    const targetMs = dayStart(date);

    let effective: DriverPlanHistoryEntry | null = null;
    for (const entry of history) {
        if (dayStart(entry.effectiveFrom) <= targetMs) {
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

    const targetMs = dayStart(date);

    let effective: DriverPlanHistoryEntry | null = null;
    for (const entry of history) {
        if (dayStart(entry.effectiveFrom) <= targetMs) {
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

export interface DriverWorkPeriod {
    id: string;
    startDate: number;
    endDate?: number | null;
    carId?: string | null;
    plan: number;
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

const dayStart = (value: number | Date): number => {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
};

const dayEnd = (value: number | Date): number => {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setHours(23, 59, 59, 999);
    return date.getTime();
};

export function getDriverWorkPeriods(driver: Driver | null | undefined, fallbackCar?: Car | null): DriverWorkPeriod[] {
    if (!driver) return [];

    const history = [...(driver.planHistory ?? [])].sort((a, b) => a.effectiveFrom - b.effectiveFrom);
    const periods: DriverWorkPeriod[] = [];
    let active: DriverWorkPeriod | null = null;

    for (const entry of history) {
        const start = dayStart(entry.effectiveFrom);
        const isWorkingEntry = entry.plan > 0 && Boolean(entry.carId);

        if (isWorkingEntry) {
            if (active) {
                const previousEnd = start - 1;
                periods.push({ ...active, endDate: previousEnd >= active.startDate ? previousEnd : active.startDate });
            }
            active = {
                id: `${periods.length + 1}-${start}`,
                startDate: start,
                endDate: null,
                carId: entry.carId ?? fallbackCar?.id ?? null,
                plan: entry.plan,
            };
            continue;
        }

        if (active) {
            const end = dayEnd(entry.effectiveFrom);
            periods.push({ ...active, endDate: end >= active.startDate ? end : active.startDate });
            active = null;
        }
    }

    if (active) {
        const endDate = driver.quitDate ? dayEnd(driver.quitDate) : null;
        periods.push({
            ...active,
            endDate: endDate !== null ? (endDate >= active.startDate ? endDate : active.startDate) : null,
        });
    }

    if (periods.length === 0) {
        const startDate = dayStart(driver.startDate || driver.createdAt || Date.now());
        const endDate = driver.quitDate ? dayEnd(driver.quitDate) : null;
        periods.push({
            id: `legacy-${startDate}`,
            startDate,
            endDate: endDate !== null ? (endDate >= startDate ? endDate : startDate) : null,
            carId: fallbackCar?.id ?? null,
            plan: driver.dailyPlan || fallbackCar?.dailyPlan || 0,
        });
    }

    return periods.sort((a, b) => a.startDate - b.startDate);
}

export function getDriverWorkPeriodForDate(
    driver: Driver | null | undefined,
    date: Date,
    fallbackCar?: Car | null
): DriverWorkPeriod | null {
    const target = dayStart(date);
    return [...getDriverWorkPeriods(driver, fallbackCar)].sort((a, b) => b.startDate - a.startDate).find(period => {
        const start = dayStart(period.startDate);
        const end = period.endDate ? dayEnd(period.endDate) : Number.POSITIVE_INFINITY;
        return target >= start && target <= end;
    }) ?? null;
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
    const hasPlanHistory = Boolean(driver.planHistory?.length);
    
    // Start date is still authoritative for legacy seeded history. Quit/rehire
    // gaps are represented by planHistory rows below.
    const startMs = driver.startDate || driver.createdAt;
    if (startMs) {
        const targetDateMidnight = new Date(date);
        targetDateMidnight.setHours(0, 0, 0, 0);
        
        const startDateMidnight = new Date(startMs);
        startDateMidnight.setHours(0, 0, 0, 0);
        
        if (targetDateMidnight.getTime() < startDateMidnight.getTime()) {
            return 0;
        }
    }

    if (driver.quitDate) {
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
    legacyCarId?: string | null,
    effectiveFrom?: number
): DriverPlanHistoryEntry[] {
    const base: DriverPlanHistoryEntry[] = (existing && existing.length > 0)
        ? [...existing]
        : [{ plan: currentPlan, effectiveFrom: driverCreatedAt ?? Date.now(), carId: legacyCarId ?? null }];

    const last = base[base.length - 1];
    // If plan and carId are the same, don't append
    if (last && last.plan === newPlan && last.carId === carId) return base;

    const todayMidnight = effectiveFrom ? new Date(effectiveFrom) : new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    return [...base, { plan: newPlan, effectiveFrom: todayMidnight.getTime(), carId }];
}
