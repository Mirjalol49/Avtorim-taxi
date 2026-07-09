import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DriverProfilePage } from '../src/features/drivers/DriverProfilePage';
import { DriverStatus, TransactionType } from '../src/core/types';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        i18n: { language: 'uz' },
        t: (_key: string, fallback?: string) => fallback ?? _key,
    }),
}));

vi.mock('lottie-react', () => ({
    default: () => <div data-testid="lottie" />,
}));

vi.mock('../supabase', () => ({
    supabase: {
        from: () => ({
            select: () => ({
                eq: () => ({
                    single: vi.fn().mockResolvedValue({ data: { documents: [] }, error: null }),
                }),
            }),
            update: () => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
            }),
        }),
        channel: () => ({
            on: () => ({
                subscribe: vi.fn(),
            }),
        }),
        removeChannel: vi.fn(),
    },
}));

describe('DriverProfilePage finance summary', () => {
    const expectAmount = (amount: string) => {
        expect(screen.getByText((content) => content.replace(/\s/g, '') === `${amount}UZS`)).toBeInTheDocument();
    };

    const renderProfile = (overrides: Record<string, unknown> = {}, transactions: any[] = []) => {
        const driver = {
            id: 'driver-1',
            name: 'Shoxrux',
            phone: '+998 95 949 03 27',
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
            driverType: 'deposit',
            depositAmount: 1_000_000,
            startDate: new Date(2026, 3, 15).getTime(),
            ...overrides,
        } as const;

        const car = {
            id: 'car-1',
            name: 'Hongqi EQM5',
            licensePlate: '01 X 445 YC',
            assignedDriverId: 'driver-1',
            dailyPlan: 700000,
            isDeleted: false,
        } as const;

        render(
            <MemoryRouter initialEntries={['/drivers/driver-1']}>
                <Routes>
                    <Route
                        path="/drivers/:id"
                        element={
                            <DriverProfilePage
                                drivers={[driver as any]}
                                cars={[car as any]}
                                transactions={transactions}
                                theme="light"
                                userRole="admin"
                                onOpenDepositTopup={vi.fn()}
                                onQuickAssign={vi.fn()}
                            />
                        }
                    />
                </Routes>
            </MemoryRouter>,
        );
    };

    it('shows only deposit balance for deposit drivers while keeping finance history available', () => {
        renderProfile();

        expect(screen.getByRole('button', { name: /Haydovchilar ro'yxatiga qaytish/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Moliya tarixi/i })).toBeInTheDocument();
        expect(screen.getByText("Depozit qoldig'i")).toBeInTheDocument();
        expectAmount('1000000');
        expect(screen.queryByText('Jami reja')).not.toBeInTheDocument();
        expect(screen.queryByText("Rejaga to'langan")).not.toBeInTheDocument();
        expect(screen.queryByText('Qarz')).not.toBeInTheDocument();
    });

    it('shows only contract remaining for vikup drivers', () => {
        renderProfile(
            { driverType: 'lease_to_own', depositAmount: 0, totalContractAmount: 10_000_000 },
            [
                {
                    id: 'tx-1',
                    driverId: 'driver-1',
                    amount: 3_000_000,
                    type: TransactionType.INCOME,
                    description: 'payment',
                    timestamp: Date.now(),
                } as any,
            ],
        );

        expect(screen.getByRole('button', { name: /Moliya tarixi/i })).toBeInTheDocument();
        expect(screen.getByText("Shartnoma qoldig'i")).toBeInTheDocument();
        expectAmount('7000000');
        expect(screen.queryByText('Jami reja')).not.toBeInTheDocument();
        expect(screen.queryByText("Rejaga to'langan")).not.toBeInTheDocument();
        expect(screen.queryByText('Qarz')).not.toBeInTheDocument();
    });
});
