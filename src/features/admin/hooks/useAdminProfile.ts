import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminUser, AdminProfile } from '../../../core/types';
import * as firestoreService from '../../../../services/firestoreService';
import { uploadAdminAvatar } from '../../../../services/storageService';
import { useToast } from '../../../../components/ToastNotification';

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
        try {
            const updatePromise = async () => {
                if (adminUser) {
                    // Handle avatar upload if it's a data URI
                    if (profileData.avatar && profileData.avatar.startsWith('data:image/')) {
                        try {
                            const result = await uploadAdminAvatar(profileData.avatar, adminUser.username);
                            profileData.avatar = result.url;
                        } catch (uploadError: any) {
                            void uploadError;
                            addToast('error', t('avatarFailed'));
                            delete profileData.avatar;
                        }
                    }

                    const sanitizedUpdates = { ...profileData };
                    if (sanitizedUpdates.name) {
                        sanitizedUpdates.username = sanitizedUpdates.name;
                        delete sanitizedUpdates.name;
                    }

                    await firestoreService.updateAdminUser(adminUser.id, {
                        ...sanitizedUpdates,
                        updatedAt: Date.now()
                    }, adminUser.id);

                    setAdminUser(prev => prev ? ({ ...prev, ...sanitizedUpdates }) : null);

                } else {
                    // Super Admin
                    if (profileData.avatar && profileData.avatar.startsWith('data:image/')) {
                        try {
                            const result = await uploadAdminAvatar(profileData.avatar, 'admin');
                            profileData.avatar = result.url;
                        } catch (uploadError: any) {
                            void uploadError;
                            addToast('error', t('avatarFailed'));
                            delete profileData.avatar;
                        }
                    }

                    await firestoreService.updateAdminProfile(profileData);

                    setAdminProfile((prev: any) => ({
                        ...prev,
                        name: profileData.name,
                        role: profileData.role,
                        avatar: profileData.avatar || prev.avatar
                    }));

                    if (profileData.password) {
                        localStorage.setItem('avtorim_admin_password', profileData.password);
                    }
                }
            };

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Operation timed out')), 15000)
            );

            await Promise.race([updatePromise(), timeoutPromise]);

            addToast('success', t('profileUpdated'));

        } catch (error: any) {
            if (error.message === 'Operation timed out') {
                addToast('error', t('updateTimeout'));
            } else {
                addToast('error', t('profileUpdateFailed'));
            }
        } finally {
            setIsUpdating(false);
        }
    };

    return { handleUpdateProfile, isUpdating };
};
