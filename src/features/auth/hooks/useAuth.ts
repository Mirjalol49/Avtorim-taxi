import { useState, useEffect } from 'react';
import { useToast } from '../../../../components/ToastNotification';
import seedSuperAdmin from '../../../../services/seedAdmin';
import { validateAccountOnInit, subscribeToAccountValidity } from '../../../../services/accountValidityService';
import { playLockSound } from '../../../../services/soundService';
import { AdminUser } from '../../../core/types';

export const useAuth = () => {
    const { addToast } = useToast();

    // --- STATE ---
    const [userRole, setUserRole] = useState<'admin' | 'viewer'>(() => {
        return (localStorage.getItem('avtorim_role') as 'admin' | 'viewer') || 'viewer';
    });

    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const role = localStorage.getItem('avtorim_role');
        const viewerAuth = localStorage.getItem('avtorim_viewer_auth');
        const adminAuth = localStorage.getItem('avtorim_admin_auth');
        return (role === 'viewer' && viewerAuth === 'true') || (role === 'admin' && adminAuth === 'true');
    });

    const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
        const savedAdmin = localStorage.getItem('avtorim_admin_user');
        return savedAdmin ? JSON.parse(savedAdmin) : null;
    });

    const [adminProfile, setAdminProfile] = useState<any>(() => {
        const savedProfile = localStorage.getItem('avtorim_viewer_profile');
        return savedProfile ? JSON.parse(savedProfile) : null;
    });

    const [isAuthChecking, setIsAuthChecking] = useState(() => {
        const role = localStorage.getItem('avtorim_role');
        const adminAuth = localStorage.getItem('avtorim_admin_auth');
        return role === 'admin' && adminAuth === 'true';
    });

    // --- EFFECTS ---

    // Seed Super Admin
    useEffect(() => {
        seedSuperAdmin();
    }, []);

    // Validate Admin Account
    useEffect(() => {
        const validateAdminAccount = async () => {
            if (userRole === 'admin' && adminUser && adminUser.id) {
                const result = await validateAccountOnInit(adminUser);

                if (!result.isValid) {
                    console.warn('Initial account validation failed');
                    handleLogout();
                    return;
                }

                if (result.userData) {
                    setAdminUser(result.userData);
                    localStorage.setItem('avtorim_admin_user', JSON.stringify(result.userData));
                }

                const unsubscribe = subscribeToAccountValidity(
                    adminUser.id,
                    (reason) => {
                        console.warn('Account invalidated in real-time:', reason);
                        addToast('error', reason);
                        handleLogout();
                    },
                    (updatedData) => {
                        setAdminUser(updatedData);
                        localStorage.setItem('avtorim_admin_user', JSON.stringify(updatedData));
                    }
                );

                setIsAuthChecking(false);
                return () => unsubscribe();
            } else {
                setIsAuthChecking(false);
            }
        };

        if (isAuthenticated) {
            validateAdminAccount();
        } else {
            setIsAuthChecking(false);
        }
    }, [isAuthenticated, adminUser?.id, userRole]);

    // Auth Persistence
    useEffect(() => {
        if (isAuthenticated) {
            localStorage.setItem('avtorim_auth', 'true');
        } else {
            localStorage.removeItem('avtorim_auth');
        }
    }, [isAuthenticated]);


    // --- HANDLERS ---
    const handleLogin = (role: 'admin' | 'viewer' = 'admin', userData?: any) => {
        setIsAuthenticated(true);
        setUserRole(role);
        localStorage.setItem('avtorim_role', role);

        if (role === 'viewer') {
            localStorage.setItem('avtorim_viewer_auth', 'true');
            if (userData) {
                setAdminProfile(userData);
                localStorage.setItem('avtorim_viewer_profile', JSON.stringify(userData));
            }
        } else if (role === 'admin') {
            localStorage.setItem('avtorim_admin_auth', 'true');
            if (userData) {
                setAdminUser(userData);
                localStorage.setItem('avtorim_admin_user', JSON.stringify(userData));
            }
        }
    };

    const handleLogout = () => {
        try {
            playLockSound();
        } catch (e) {
            console.warn('Failed to play lock sound', e);
        }

        setIsAuthenticated(false);
        setUserRole('viewer');
        localStorage.removeItem('avtorim_auth');
        localStorage.removeItem('avtorim_viewer_auth');
        localStorage.removeItem('avtorim_admin_auth');
        setAdminUser(null);
    };

    // Auto-Lock Logic
    useEffect(() => {
        if (!isAuthenticated) return;
        if (userRole === 'viewer') return;

        const INACTIVITY_TIMEOUT = 20 * 60 * 1000;
        let inactivityTimer: NodeJS.Timeout;

        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                handleLogout();
                addToast('warning', 'Session expired due to inactivity', 5000);
            }, INACTIVITY_TIMEOUT);
        };

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach(event => document.addEventListener(event, resetTimer));
        resetTimer();

        return () => {
            clearTimeout(inactivityTimer);
            events.forEach(event => document.removeEventListener(event, resetTimer));
        };
    }, [isAuthenticated, userRole]);


    return {
        userRole,
        isAuthenticated,
        adminUser,
        adminProfile,
        isAuthChecking,
        handleLogin,
        handleLogout,
        setAdminUser,
        setAdminProfile,
        setUserRole
    };
};
