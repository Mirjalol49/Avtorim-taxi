export enum DriverStatus {
  ACTIVE = 'ACTIVE',
  OFFLINE = 'OFFLINE',
  BUSY = 'BUSY',
  IDLE = 'IDLE'
}

export interface Driver {
  id: string;
  name: string;
  licensePlate: string;
  carModel: string;
  status: DriverStatus;
  dailyPlan: number;
  monthlySalary: number;
  avatar: string;
  telegram?: string;
  location: {
    lat: number;
    lng: number;
    heading: number; // 0-360 degrees
  };
  phone: string;
  balance: number;
  rating: number;
  isDeleted?: boolean;
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export interface Transaction {
  id: string;
  driverId: string;
  amount: number;
  type: TransactionType;
  description: string;
  timestamp: number;
  status?: PaymentStatus;
  reversedAt?: number;
  reversedBy?: string;
  reversalReason?: string;
  originalTransactionId?: string; // For reversal/compensating transactions
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export type Language = 'uz' | 'ru' | 'en';

export type TimeFilter = 'today' | 'week' | 'month' | 'year';

export enum Tab {
  DASHBOARD = 'DASHBOARD',
  MAP = 'MAP',
  DRIVERS = 'DRIVERS',
  TRANSACTIONS = 'TRANSACTIONS',
  FINANCE = 'FINANCE',
  SALARY = 'SALARY'
}

export enum FineStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
  DISPUTED = 'DISPUTED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REVERSED = 'REVERSED',
  REFUNDED = 'REFUNDED'
}

export interface SalaryPayment {
  id: string;
  driverId: string;
  amount: number;
  period: string; // e.g., "2024-11" for November 2024
  paidAt: number;
  note?: string;
}

export interface DriverSalary {
  id: string;
  driverId: string;
  amount: number;
  effectiveDate: number; // Timestamp
  createdBy: string;
  createdAt: number; // Timestamp
  notes?: string;
  status?: PaymentStatus;
  reversedAt?: number;
  reversedBy?: string;
  reversalReason?: string;
}

export interface PaymentReversal {
  id: string;
  salaryId: string;
  transactionId: string;
  originalAmount: number;
  driverId: string;
  reversedBy: string;
  reversedAt: number;
  reason: string;
  approvedBy?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
}
