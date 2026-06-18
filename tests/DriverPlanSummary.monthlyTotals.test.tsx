import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DriverPlanSummary } from '../src/features/finance/DriverPlanSummary';
import { Driver, DriverStatus, TransactionType } from '../src/core/types';
import { Car } from '../src/core/types/car.types';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (_key: string, fallback?: string) => fallback ?? _key,
    }),
}));

vi.mock('lottie-react', () => ({
    default: () => <div data-testid="lottie" />,
}));

const normalize = (value: string) => value.replace(/\s/g, '').replace(/,/g, '');

const expectAmount = (amount: number) => {
    expect(screen.getAllByText((content) => normalize(content) === `${amount}UZS`).length).toBeGreaterThan(0);
};

const juneStart = new Date(2026, 5, 1);
const juneEnd = new Date(2026, 5, 30);

const makeDriver = (overrides: Partial<Driver>): Driver => ({
    id: 'driver-1',
    name: 'Driver',
    licensePlate: '',
    carModel: '',
    status: DriverStatus.ACTIVE,
    dailyPlan: 0,
    monthlySalary: 0,
    avatar: '',
    telegram: '',
    location: { lat: 0, lng: 0, heading: 0 },
    phone: '+998 90 000 00 00',
    balance: 0,
    rating: 5,
    isDeleted: false,
    startDate: new Date(2026, 4, 1).getTime(),
    ...overrides,
});

const makeCar = (overrides: Partial<Car>): Car => ({
    id: 'car-1',
    name: 'Hongqi EQM5',
    licensePlate: '01 A 001 AA',
    dailyPlan: 500_000,
    isDeleted: false,
    ...overrides,
});

describe('DriverPlanSummary monthly totals', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 5, 30, 12));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('hides drivers who are no longer working from the all-drivers plan view', () => {
        const driver = makeDriver({
            id: 'fired-driver',
            name: 'Farrux',
            quitDate: new Date(2026, 5, 10).getTime(),
            planHistory: [
                { plan: 500_000, effectiveFrom: new Date(2026, 4, 1).getTime(), carId: 'car-1' },
            ],
        });
        const car = makeCar({ id: 'car-1', assignedDriverId: null });

        render(
            <DriverPlanSummary
                drivers={[driver]}
                cars={[car]}
                transactions={[
                    {
                        id: 'tx-1',
                        driverId: driver.id,
                        driverName: driver.name,
                        amount: 4_700_000,
                        type: TransactionType.INCOME,
                        description: 'June payments',
                        timestamp: new Date(2026, 5, 6, 12).getTime(),
                    },
                ]}
                startDate={juneStart}
                endDate={juneEnd}
                filterDriverId="all"
                theme="light"
            />,
        );

        expect(screen.queryByText('Farrux')).not.toBeInTheDocument();
    });

    it('counts deposit-funded transactions as driver plan payments', () => {
        const driver = makeDriver({
            id: 'active-driver',
            name: 'Jasur',
            planHistory: [
                { plan: 500_000, effectiveFrom: new Date(2026, 4, 1).getTime(), carId: 'car-1' },
            ],
        });
        const car = makeCar({ id: 'car-1', assignedDriverId: driver.id });

        render(
            <DriverPlanSummary
                drivers={[driver]}
                cars={[car]}
                transactions={[
                    {
                        id: 'cash-payment',
                        driverId: driver.id,
                        driverName: driver.name,
                        amount: 500_000,
                        type: TransactionType.INCOME,
                        description: 'Cash payment',
                        timestamp: new Date(2026, 5, 3, 12).getTime(),
                    },
                    {
                        id: 'deposit-payment',
                        driverId: driver.id,
                        driverName: driver.name,
                        amount: 1_000_000,
                        type: TransactionType.INCOME,
                        description: 'Use deposit',
                        timestamp: new Date(2026, 5, 4, 12).getTime(),
                        useDeposit: true,
                    },
                ]}
                startDate={juneStart}
                endDate={juneEnd}
                filterDriverId="all"
                theme="light"
            />,
        );

        expectAmount(1_500_000);
    });
});
