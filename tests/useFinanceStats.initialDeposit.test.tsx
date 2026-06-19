import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFinanceStats } from '../src/features/finance/hooks/useFinanceStats';
import { Driver, DriverStatus, TransactionType } from '../src/core/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'uz' },
  }),
}));

const driver: Driver = {
  id: 'driver-1',
  name: 'Deposit Driver',
  licensePlate: '01 A 001 AA',
  carModel: 'Hongqi EQM5',
  status: DriverStatus.ACTIVE,
  dailyPlan: 0,
  monthlySalary: 0,
  avatar: '',
  telegram: '',
  location: { lat: 0, lng: 0, heading: 0 },
  phone: '+998 90 000 00 00',
  balance: 0,
  rating: 5,
  driverType: 'deposit',
  depositAmount: 1_000_000,
  isDeleted: false,
};

describe('useFinanceStats initial deposit handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 19, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts initial DEPOSIT transactions as deposit movement and includes them in deposit filter', () => {
    const now = Date.now();
    const { result } = renderHook(() => useFinanceStats([
      {
        id: 'initial-deposit-1',
        driverId: driver.id,
        driverName: driver.name,
        amount: 1_000_000,
        type: TransactionType.INCOME,
        category: 'DEPOSIT',
        description: "Boshlang'ich depozit: Deposit Driver",
        timestamp: now,
        paymentMethod: 'cash',
      },
    ], [], [driver], 'test-scope'));

    expect(result.current.financeStats.depositTopup).toBe(1_000_000);
    expect(result.current.yearlyAnalyticsTotals.depositTotal).toBe(1_000_000);

    act(() => {
      result.current.setFilters(prev => ({ ...prev, type: 'deposit' }));
    });

    expect(result.current.filteredTransactions).toHaveLength(1);
  });

  it('falls back to the driver initial deposit when the DEPOSIT transaction is missing', () => {
    const createdAt = new Date(2026, 5, 10, 12).getTime();
    const { result } = renderHook(() => useFinanceStats([], [], [{ ...driver, createdAt }], 'test-scope'));

    expect(result.current.financeStats.depositTopup).toBe(1_000_000);
    expect(result.current.yearlyAnalyticsTotals.depositTotal).toBe(1_000_000);

    act(() => {
      result.current.setFilters(prev => ({ ...prev, type: 'deposit' }));
    });

    expect(result.current.filteredTransactions).toHaveLength(1);
    expect(result.current.filteredTransactions[0].category).toBe('DEPOSIT');
  });
});
