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
    SALARY = 'SALARY',
    ROLES = 'ROLES',
}
