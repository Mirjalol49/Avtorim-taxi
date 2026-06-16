import { Driver, Transaction, TransactionType } from '../../../core/types';

export function buildInitialDepositTransaction(
    driver: Driver,
    timestamp = Date.now()
): Omit<Transaction, 'id'> | null {
    const amount = driver.depositAmount ?? 0;
    if ((driver.driverType ?? 'deposit') !== 'deposit' || amount <= 0) return null;

    return {
        driverId: driver.id,
        driverName: driver.name,
        amount,
        type: TransactionType.INCOME,
        category: 'DEPOSIT',
        description: `Boshlang'ich depozit: ${driver.name}`,
        timestamp,
        paymentMethod: 'cash',
    };
}
