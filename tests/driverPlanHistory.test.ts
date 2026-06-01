import { describe, expect, it } from 'vitest';
import {
    getCarIdForDriverDate,
    getEffectivePlanForDriverDay,
    getPlanForDriverDate,
} from '../src/features/drivers/utils/driverPlanHistory';
import type { Driver } from '../src/core/types/driver.types';
import { DriverStatus } from '../src/core/types/driver.types';

const makeDriver = (effectiveFrom: number): Driver => ({
    id: 'driver-1',
    name: 'Shoxrux',
    phone: '',
    carModel: '',
    licensePlate: '',
    status: DriverStatus.ACTIVE,
    dailyPlan: 500000,
    monthlySalary: 0,
    avatar: '',
    balance: 0,
    rating: 5,
    location: { lat: 0, lng: 0, heading: 0 },
    startDate: new Date(2026, 3, 15).getTime(),
    planHistory: [
        {
            plan: 500000,
            carId: 'car-1',
            effectiveFrom,
        },
    ],
});

describe('driver plan history date boundaries', () => {
    it('applies a plan history entry on its calendar day even when stored after local midnight', () => {
        const driver = makeDriver(new Date(2026, 3, 15, 5).getTime());
        const targetDate = new Date(2026, 3, 15);

        expect(getPlanForDriverDate(driver, targetDate)).toBe(500000);
        expect(getEffectivePlanForDriverDay(driver, targetDate)).toBe(500000);
        expect(getCarIdForDriverDate(driver, targetDate)).toBe('car-1');
    });

    it('does not apply the plan before its calendar day', () => {
        const driver = makeDriver(new Date(2026, 3, 15, 5).getTime());

        expect(getPlanForDriverDate(driver, new Date(2026, 3, 14))).toBe(0);
        expect(getEffectivePlanForDriverDay(driver, new Date(2026, 3, 14))).toBe(0);
        expect(getCarIdForDriverDate(driver, new Date(2026, 3, 14))).toBeNull();
    });
});
