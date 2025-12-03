import { Driver, DriverSalary, DriverStatus, PaymentStatus } from '../types';

// Configuration
const LARGE_PAYMENT_THRESHOLD = 10_000_000; // 10M UZS
const REVERSAL_WINDOW_DAYS = 90; // 90 days

/**
 * Checks if a payment amount exceeds the normal threshold
 */
export const isLargePayment = (amount: number): boolean => {
    return amount > LARGE_PAYMENT_THRESHOLD;
};

/**
 * Validates payment eligibility
 */
export const canPaySalary = (
    driver: Driver,
    salaryHistory: DriverSalary[],
    effectiveDate: Date = new Date()
): { allowed: boolean; reason?: string } => {
    // Check if driver is active
    if (driver.status !== DriverStatus.ACTIVE) {
        return { allowed: false, reason: 'Driver is not active' };
    }

    // Check for duplicate payment in same month
    const driverPayments = salaryHistory.filter(s => s.driverId === driver.id);
    const sameMonthPayment = driverPayments.find(payment => {
        if (payment.status === PaymentStatus.REVERSED) return false;

        const paymentDate = new Date(payment.effectiveDate);
        const isSameMonth = paymentDate.getMonth() === effectiveDate.getMonth() &&
            paymentDate.getFullYear() === effectiveDate.getFullYear();
        return isSameMonth;
    });

    if (sameMonthPayment) {
        return {
            allowed: false,
            reason: 'Salary already paid for this month. Previous payments must be reversed first.'
        };
    }

    return { allowed: true };
};

/**
 * Checks if a payment can be reversed
 */
export const canReversePayment = (
    payment: DriverSalary
): { allowed: boolean; reason?: string } => {
    // Already reversed
    if (payment.status === PaymentStatus.REVERSED) {
        return { allowed: false, reason: 'Payment has already been reversed' };
    }

    // Time window check
    const daysSincePayment = (Date.now() - payment.createdAt) / (1000 * 60 * 60 * 24);
    if (daysSincePayment > REVERSAL_WINDOW_DAYS) {
        return {
            allowed: false,
            reason: `Reversal window expired. Payments can only be reversed within ${REVERSAL_WINDOW_DAYS} days.`
        };
    }

    return { allowed: true };
};

/**
 * Gets human-readable time remaining for reversal window
 */
export const getReversalWindowRemaining = (payment: DriverSalary): string => {
    const daysSincePayment = (Date.now() - payment.createdAt) / (1000 * 60 * 60 * 24);
    const daysRemaining = Math.max(0, REVERSAL_WINDOW_DAYS - Math.floor(daysSincePayment));

    if (daysRemaining === 0) return 'Expired';
    if (daysRemaining === 1) return '1 day remaining';
    return `${daysRemaining} days remaining`;
};
