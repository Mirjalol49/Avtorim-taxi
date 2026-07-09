import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NotificationBell from '../components/NotificationBell';

const mockData = vi.hoisted(() => ({
    drivers: [{
        id: 'driver-1',
        name: 'Ali Valiyev',
        avatar: 'https://example.com/driver-avatar.jpg',
        status: 'ACTIVE',
        licensePlate: '',
        carModel: '',
        dailyPlan: 500_000,
        monthlySalary: 0,
        location: { lat: 0, lng: 0, heading: 0 },
        phone: '',
        balance: 0,
        rating: 5,
    }] as any[],
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: string | Record<string, unknown>) =>
            typeof fallback === 'string' ? fallback : key,
    }),
}));

vi.mock('lottie-react', () => ({
    default: () => <div data-testid="lottie" />,
}));

vi.mock('../src/core/context/DataContext', () => ({
    useDataContext: () => ({
        drivers: mockData.drivers,
    }),
}));

describe('NotificationBell daily plan reminders', () => {
    const planReminder = {
        id: 'notif-1',
        title: 'Ali Valiyev — 200 000 UZS qoldi',
        message: "16.06.2026 · Reja: 500 000 · To'langan: 300 000 · Qoldi: 200 000 UZS",
        type: 'payment_reminder',
        category: 'payment_reminder' as any,
        priority: 'high' as any,
        targetUsers: 'role:admin',
        createdBy: 'fleet-1',
        createdByName: 'Admin',
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000,
        deliveryTracking: {
            reminderType: 'daily_plan',
            driverId: 'driver-1',
            driverName: 'Ali Valiyev',
            dailyPlan: 500_000,
            todayIncome: 300_000,
            remaining: 200_000,
            paidPct: 60,
            dateDisplay: '16.06.2026',
        },
    };

    it('uses the live driver profile image for plan warning cards', () => {
        mockData.drivers = [{
            ...mockData.drivers[0],
            id: 'driver-1',
            name: 'Ali Valiyev',
            quitDate: undefined,
        }];

        render(
            <NotificationBell
                notifications={[planReminder as any]}
                unreadCount={1}
                readIds={new Set()}
                userId="fleet-1"
                theme="dark"
                onMarkAsRead={vi.fn()}
                onMarkAllAsRead={vi.fn()}
                onDeleteNotification={vi.fn()}
                onClearAllRead={vi.fn()}
                cars={[]}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'notifications' }));

        expect(document.querySelector('img[src="https://example.com/driver-avatar.jpg"]')).toBeInTheDocument();
    });

    it('hides plan warning cards for drivers who already quit', () => {
        mockData.drivers = [{
            ...mockData.drivers[0],
            id: 'driver-1',
            name: 'Ali Valiyev',
            quitDate: Date.now() - 24 * 60 * 60 * 1000,
        }];

        render(
            <NotificationBell
                notifications={[planReminder as any]}
                unreadCount={1}
                readIds={new Set()}
                userId="fleet-1"
                theme="dark"
                onMarkAsRead={vi.fn()}
                onMarkAllAsRead={vi.fn()}
                onDeleteNotification={vi.fn()}
                onClearAllRead={vi.fn()}
                cars={[]}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'notifications' }));

        expect(screen.queryByText('Ali Valiyev')).not.toBeInTheDocument();
    });
});
