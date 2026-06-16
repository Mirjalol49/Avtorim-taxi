import { describe, expect, it } from 'vitest';
import { DriverStatus } from '../src/core/types';
import { isDriverWorkingOnDate } from '../src/features/drivers/utils/driverLifecycle';

const baseDriver = {
    id: 'driver-1',
    name: 'Ali Valiyev',
    phone: '+998 90 000 00 00',
    licensePlate: '',
    carModel: '',
    status: DriverStatus.ACTIVE,
    dailyPlan: 500_000,
    monthlySalary: 0,
    avatar: '',
    location: { lat: 0, lng: 0, heading: 0 },
    balance: 0,
    rating: 5,
    isDeleted: false,
    startDate: Date.UTC(2026, 5, 10, 6),
};

describe('isDriverWorkingOnDate', () => {
    it('allows a driver during their active work period', () => {
        expect(isDriverWorkingOnDate(baseDriver as any, new Date('2026-06-16T12:00:00.000Z'))).toBe(true);
    });

    it('excludes a driver before their start date', () => {
        expect(isDriverWorkingOnDate(baseDriver as any, new Date('2026-06-09T12:00:00.000Z'))).toBe(false);
    });

    it('allows the quit date itself', () => {
        const driver = { ...baseDriver, quitDate: Date.UTC(2026, 5, 16, 6) };

        expect(isDriverWorkingOnDate(driver as any, new Date('2026-06-16T12:00:00.000Z'))).toBe(true);
    });

    it('excludes a driver after their quit date', () => {
        const driver = { ...baseDriver, quitDate: Date.UTC(2026, 5, 15, 6) };

        expect(isDriverWorkingOnDate(driver as any, new Date('2026-06-16T12:00:00.000Z'))).toBe(false);
    });
});
