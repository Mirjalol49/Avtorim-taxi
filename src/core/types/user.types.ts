export type UserRole = 'admin' | 'viewer';

export interface AdminUser {
    id: string;
    username: string;
    password?: string;
    role: 'super_admin' | 'admin' | 'viewer'; // Admin roles structure might need verification
    avatar?: string;
    name?: string;
    createdAt?: number;
    fleetId?: string;
    // Add other properties as seen in App.tsx usage
}

export interface AdminProfile {
    name: string;
    role: string;
    avatar?: string;
    password?: string;
}

export interface Viewer {
    id: string;
    name: string;
    phoneNumber: string;
    password?: string;
    avatar: string;
    role: 'viewer';
    active: boolean;
    createdAt: number;
    createdBy: string;
    telegramId?: string;
}
