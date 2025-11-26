export enum DriverStatus {
  ACTIVE = 'ACTIVE',
  OFFLINE = 'OFFLINE'
}

export interface Driver {
  id: string;
  name: string;
  licensePlate: string;
  carModel: string;
  status: DriverStatus;
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
  FINANCE = 'FINANCE'
}

export enum FineStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
  DISPUTED = 'DISPUTED'
}