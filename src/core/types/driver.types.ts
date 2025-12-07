import { Coordinates } from './common.types';
import { Lockable } from './lock.types';

export enum DriverStatus {
    ACTIVE = 'ACTIVE',
    OFFLINE = 'OFFLINE',
    BUSY = 'BUSY',
    IDLE = 'IDLE'
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
        heading: number; // 0-360 degrees
    };
    phone: string;
    balance: number;
    rating: number;
    isDeleted?: boolean;
}
