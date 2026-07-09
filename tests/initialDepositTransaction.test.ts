import { describe, expect, it } from 'vitest';
import { buildInitialDepositTransaction } from '../src/features/drivers/utils/initialDepositTransaction';
import { DriverStatus, TransactionType } from '../src/core/types';

describe('buildInitialDepositTransaction', () => {
  it('creates a DEPOSIT income transaction for a new driver initial deposit', () => {
    const tx = buildInitialDepositTransaction({
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
    }, 1_700_000_000_000);

    expect(tx).toEqual({
      driverId: 'driver-1',
      driverName: 'Deposit Driver',
      amount: 1_000_000,
      type: TransactionType.INCOME,
      category: 'DEPOSIT',
      description: "Boshlang'ich depozit: Deposit Driver",
      timestamp: 1_700_000_000_000,
      paymentMethod: 'cash',
    });
  });

  it('returns null when there is no initial deposit', () => {
    expect(buildInitialDepositTransaction({
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
      depositAmount: 0,
    }, 1_700_000_000_000)).toBeNull();
  });
});
