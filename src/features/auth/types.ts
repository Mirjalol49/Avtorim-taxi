import { Viewer } from '../../core/types';

export interface AdminUser {
    id: string;
    username: string;
    role?: 'admin'; // Optional as it might be implied
    createdAt: number;
}

export interface AuthContextType {
    isAuthenticated: boolean;
    userRole: 'admin' | 'viewer';
    user: AdminUser | Viewer | null;
    adminProfile: any; // Super admin singleton profile/Global Config
    login: (role: 'admin' | 'viewer', data?: any) => void;
    logout: () => Promise<void>;
    isAuthChecking: boolean;
}
