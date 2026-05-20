import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminUser, AdminProfile } from '../../../core/types';
import * as firestoreService from '../../../../services/firestoreService';
import { uploadAdminAvatar } from '../../../../services/storageService';
import { useToast } from '../../../../components/ToastNotification';
import { authService } from '../../../../services/authService';

interface UseAdminProfileProps {
    adminUser: AdminUser | null;
    setAdminUser: (user: AdminUser | null | ((prev: AdminUser | null) => AdminUser | null)) => void;
    adminProfile: AdminProfile | null;
    setAdminProfile: (profile: AdminProfile | ((prev: AdminProfile) => AdminProfile)) => void;
    language: string;
}

export const useAdminProfile = ({
    adminUser,
    setAdminUser,
    adminProfile,
    setAdminProfile,
    language
}: UseAdminProfileProps) => {
    const { addToast } = useToast();
    const { t } = useTranslation();
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdateProfile = async (profileData: any) => {
        setIsUpdating(true);
        const nextProfileData = { ...profileData };
        try {
            const updatePromise = async () => {
                if (adminUser) {
                    // Handle avatar upload if it's a data URI
                    if (nextProfileData.avatar && nextProfileData.avatar.startsWith('data:image/')) {
                        try {
                            const result = await uploadAdminAvatar(nextProfileData.avatar, adminUser.username);
                            nextProfileData.avatar = result.url;
                        } catch (uploadError: any) {
                            void uploadError;
                            addToast('error', t('avatarFailed'));
                            delete nextProfileData.avatar;
                        }
                    }

                    const sanitizedUpdates: Partial<AdminUser> = {};
                    if (typeof nextProfileData.name === 'string' && nextProfileData.name.trim()) {
                        sanitizedUpdates.username = nextProfileData.name.trim();
                    }
                    if (typeof nextProfileData.password === 'string' && nextProfileData.password.trim()) {
                        sanitizedUpdates.password = nextProfileData.password;
                    }
                    if (nextProfileData.avatar !== undefined) {
                        sanitizedUpdates.avatar = nextProfileData.avatar;
                    }

                    await firestoreService.updateAdminUser(adminUser.id, sanitizedUpdates, adminUser.id);

                    setAdminUser(prev => {
                        if (!prev) return null;
                        const { password: _password, ...safeUpdates } = sanitizedUpdates;
                        const next = { ...prev, ...safeUpdates };
                        localStorage.setItem('avtorim_admin_user', JSON.stringify(next));
                        authService.updateSessionUser(safeUpdates);
                        return next;
                    });

                } else {
                    // Super Admin — only admin_profile columns: name, role, avatar, password
                    if (nextProfileData.avatar && nextProfileData.avatar.startsWith('data:image/')) {
                        try {
                            const result = await uploadAdminAvatar(nextProfileData.avatar, 'admin');
                            nextProfileData.avatar = result.url;
                        } catch (uploadError: any) {
                            void uploadError;
                            addToast('error', t('avatarFailed'));
                            delete nextProfileData.avatar;
                        }
                    }

                    // Only pass known admin_profile columns — nothing else
                    const profilePayload: any = {};
                    if (nextProfileData.name  !== undefined) profilePayload.name     = nextProfileData.name;
                    if (nextProfileData.role  !== undefined) profilePayload.role     = nextProfileData.role;
                    if (nextProfileData.avatar !== undefined) profilePayload.avatar  = nextProfileData.avatar;
                    if (nextProfileData.password !== undefined && nextProfileData.password) profilePayload.password = nextProfileData.password;

                    await firestoreService.updateAdminProfile(profilePayload);

                    setAdminProfile((prev: any) => {
                        const next = {
                            ...prev,
                            name:   profilePayload.name   ?? prev.name,
                            role:   profilePayload.role   ?? prev.role,
                            avatar: profilePayload.avatar ?? prev.avatar,
                        };
                        localStorage.setItem('avtorim_viewer_profile', JSON.stringify(next));
                        return next;
                    });
                }
            };

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Operation timed out')), 15000)
            );

            await Promise.race([updatePromise(), timeoutPromise]);

            addToast('success', t('profileUpdated'));

        } catch (error: any) {
            console.error('[useAdminProfile] Update failed:', error);
            if (error.message === 'Operation timed out') {
                addToast('error', t('updateTimeout'));
            } else {
                addToast('error', error?.message || t('profileUpdateFailed'));
            }
            throw error;
        } finally {
            setIsUpdating(false);
        }
    };

    return { handleUpdateProfile, isUpdating };
};
