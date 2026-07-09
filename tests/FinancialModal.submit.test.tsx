import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FinancialModal from '../components/FinancialModal';
import { Driver, DriverStatus, TransactionType } from '../src/core/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'uz' },
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('lottie-react', () => ({
  default: () => <div data-testid="lottie" />,
}));

vi.mock('../components/ToastNotification', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('../services/firestoreService', () => ({
  setDriverDayOverride: vi.fn(),
  clearDriverDayOverride: vi.fn(),
  deleteTransactionsBatch: vi.fn(),
}));

const driver: Driver = {
  id: 'driver-1',
  name: 'Test Driver',
  licensePlate: '01 123 ABC',
  carModel: 'Test Car',
  status: DriverStatus.ACTIVE,
  dailyPlan: 500000,
  monthlySalary: 0,
  avatar: '',
  telegram: '',
  location: { lat: 0, lng: 0, heading: 0 },
  phone: '+998 90 000 00 00',
  balance: 0,
  rating: 5,
  driverType: 'deposit',
  depositAmount: 0,
  dayOverrides: {},
};

describe('FinancialModal submit behavior', () => {
  it('locks submit while saving to prevent duplicate transactions', async () => {
    const user = userEvent.setup();
    let resolveSubmit: (() => void) | undefined;
    const onSubmit = vi.fn(() => new Promise<void>(resolve => {
      resolveSubmit = resolve;
    }));
    const onClose = vi.fn();

    render(
      <FinancialModal
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
        drivers={[driver]}
        cars={[]}
        transactions={[]}
        theme="light"
        initialType={TransactionType.INCOME}
        initialDriverId={driver.id}
      />
    );

    await user.type(screen.getByPlaceholderText('0'), '500000');
    const saveButton = screen.getByRole('button', { name: /Saqlash/i });

    await user.dblClick(saveButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveAttribute('aria-busy', 'true');

    resolveSubmit?.();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
