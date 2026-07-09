import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DriverStatus } from '../src/core/types';
import { useDashboardStats } from '../src/features/dashboard/hooks/useDashboardStats';

const baseDriver = {
    phone: '+998 90 000 00 00',
    licensePlate: '',
    carModel: '',
    status: DriverStatus.ACTIVE,
    dailyPlan: 0,
    monthlySalary: 0,
    avatar: '',
    location: { lat: 0, lng: 0, heading: 0 },
    balance: 0,
    rating: 5,
    isDeleted: false,
    startDate: Date.UTC(2026, 5, 14, 6),
};

describe('useDashboardStats driver lifecycle', () => {
    it('does not include drivers who quit before the target date in pending unpaid rows', () => {
        const activeDriver = {
            ...baseDriver,
            id: 'active-driver',
            name: 'Active Driver',
        };
        const quitDriver = {
            ...baseDriver,
            id: 'quit-driver',
            name: 'Quit Driver',
            quitDate: Date.UTC(2026, 5, 15, 6),
        };

        const cars = [
            {
                id: 'car-1',
                name: 'Hongqi EQM5',
                licensePlate: '01 A 001 AA',
                assignedDriverId: 'active-driver',
                dailyPlan: 500_000,
                isDeleted: false,
            },
            {
                id: 'car-2',
                name: 'Hongqi EQM5',
                licensePlate: '01 A 002 AA',
                assignedDriverId: 'quit-driver',
                dailyPlan: 500_000,
                isDeleted: false,
            },
        ];

        const { result } = renderHook(() => useDashboardStats([], [activeDriver, quitDriver] as any, cars as any));

        act(() => {
            result.current.setTargetDate(new Date('2026-06-16T12:00:00.000Z'));
        });

        expect(result.current.todayStats.pending.map((driver: any) => driver.id)).toEqual(['active-driver']);
    });
});
