import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AdminUser, AdminProfile } from '../../../core/types';

interface AuthContextType {
    userRole: 'admin' | 'viewer';
    isAuthenticated: boolean;
    adminUser: AdminUser | null;
    adminProfile: AdminProfile | null;
    isAuthChecking: boolean;
    handleLogin: (role?: 'admin' | 'viewer', userData?: any) => void;
    handleLogout: () => void;
    setAdminUser: React.Dispatch<React.SetStateAction<AdminUser | null>>;
    setAdminProfile: React.Dispatch<React.SetStateAction<any>>; // Using any as per hook definition
    setUserRole: React.Dispatch<React.SetStateAction<'admin' | 'viewer'>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const auth = useAuth();

    return (
        <AuthContext.Provider value={auth}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};
