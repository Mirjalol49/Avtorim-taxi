import { Coordinates } from './common.types';
import { Lockable } from './lock.types';

export enum DriverStatus {
    ACTIVE = 'ACTIVE',
    OFFLINE = 'OFFLINE',
    BUSY = 'BUSY',
    IDLE = 'IDLE'
}

export interface DriverDocument {
    name: string;      // file name
    type: string;      // MIME type
    data: string;      // base64 data URL
    category: 'driver_license' | 'passport' | 'car_registration' | 'car_insurance' | 'other';
}

export type DriverPaymentType = 'deposit' | 'salary';

export interface Driver extends Lockable {
    id: string;
    name: string;
    licensePlate: string;
    carModel: string;
    status: DriverStatus;
    dailyPlan: number;
    monthlySalary: number;
    avatar: string;
    telegram?: string;
    location: Coordinates & {
        heading: number;
    };
    phone: string;
    balance: number;
    rating: number;
    isDeleted?: boolean;
    documents?: DriverDocument[];
    notes?: string;
    extraPhone?: string;
    createdAt?: number;
    lastSalaryPaidAt?: number;
    /** 'deposit' = driver gives upfront deposit; 'salary' = fleet pays driver monthly */
    driverType?: DriverPaymentType;
    /** Initial deposit amount (only meaningful when driverType === 'deposit') */
    depositAmount?: number;
    /** Threshold at which a low-deposit warning is triggered (default 1 000 000 UZS) */
    depositWarningThreshold?: number;
}
