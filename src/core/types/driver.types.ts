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
}
