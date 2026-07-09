import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '../src/features/dashboard/DashboardPage';
import { DriverStatus } from '../src/core/types';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        i18n: { language: 'uz' },
        t: (_key: string, fallback?: string | Record<string, unknown>) =>
            typeof fallback === 'string' ? fallback : _key,
    }),
}));

vi.mock('lottie-react', () => ({
    default: () => <div data-testid="lottie" />,
}));

vi.mock('../components/ToastNotification', () => ({
    useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('../src/features/dashboard/hooks/useDashboardSummary', () => ({
    useDashboardSummary: () => ({
        summary: { totalIncome: 0, totalExpense: 0, netProfit: 0 },
        loading: false,
    }),
}));

const linkedDriver = {
    id: 'driver-1',
    name: 'Ali Valiyev',
    telegram: '12345',
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
    todayIncome: 0,
    todayDebt: 500_000,
    totalDebt: 500_000,
    historicalCarId: 'car-1',
};

const unlinkedDriver = {
    ...linkedDriver,
    id: 'driver-2',
    name: 'No Telegram',
    telegram: '',
};

vi.mock('../src/features/dashboard/hooks/useDashboardStats', () => ({
    useDashboardStats: () => ({
        timeFilter: 'today',
        setTimeFilter: vi.fn(),
        targetDate: new Date(2026, 5, 16),
        setTargetDate: vi.fn(),
        todayStats: {
            completed: [],
            pending: [linkedDriver, unlinkedDriver],
            dayOff: [],
            totals: { expectedTotal: 1_000_000, paidTotal: 0, debtTotal: 1_000_000 },
        },
    }),
}));

describe('Dashboard Telegram custom messages', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                addListener: vi.fn(),
                removeListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    });

    it('opens a driver message modal and sends the custom Telegram message', async () => {
        render(
            <DashboardPage
                transactions={[]}
                drivers={[linkedDriver as any]}
                cars={[{
                    id: 'car-1',
                    name: 'Hongqi EQM5',
                    licensePlate: '01 A 001 AA',
                    assignedDriverId: 'driver-1',
                    dailyPlan: 500_000,
                    isDeleted: false,
                } as any]}
                fleetId="fleet-1"
                isDataLoading={false}
                theme="light"
                isMobile={false}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Telegram xabar yuborish: Ali Valiyev/i }));

        expect(screen.getByText('Telegram xabar yuborish')).toBeInTheDocument();
        fireEvent.change(screen.getByPlaceholderText('Xabar matni...'), {
            target: { value: 'Bugun avvalroq tolov qiling.' },
        });
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Yuborish/i }));

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith(
                '/.netlify/functions/send-driver-telegram-message',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        fleetId: 'fleet-1',
                        driverId: 'driver-1',
                        message: 'Bugun avvalroq tolov qiling.',
                    }),
                }),
            );
        });
    });

    it('hides the row message action when the driver has no Telegram link', () => {
        render(
            <DashboardPage
                transactions={[]}
                drivers={[linkedDriver as any, unlinkedDriver as any]}
                cars={[]}
                fleetId="fleet-1"
                isDataLoading={false}
                theme="light"
                isMobile={false}
            />
        );

        expect(screen.queryByRole('button', { name: /Telegram ulanmagan: No Telegram/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Telegram xabar yuborish: No Telegram/i })).not.toBeInTheDocument();
    });
});
