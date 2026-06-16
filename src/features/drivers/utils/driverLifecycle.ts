import { Driver } from '../../../core/types';

function dayStartMs(value: Date | number): number {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

function dayEndMs(value: Date | number): number {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setHours(23, 59, 59, 999);
    return date.getTime();
}

export function isDriverWorkingOnDate(driver: Driver | null | undefined, date: Date | number): boolean {
    if (!driver || driver.isDeleted) return false;

    const targetStart = dayStartMs(date);
    const startMs = driver.startDate ?? driver.createdAt;
    if (startMs && targetStart < dayStartMs(startMs)) return false;

    if (driver.quitDate && targetStart > dayEndMs(driver.quitDate)) return false;

    return true;
}
