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
                    // Strip client-only fields that have no matching DB column
                    delete (sanitizedUpdates as any).updatedAt;
                    delete (sanitizedUpdates as any).role; // role changes not allowed via profile edit

                    await firestoreService.updateAdminUser(adminUser.id, sanitizedUpdates, adminUser.id);

                    setAdminUser(prev => prev ? ({ ...prev, ...sanitizedUpdates }) : null);

                } else {
                    // Super Admin — only admin_profile columns: name, role, avatar, password
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

                    // Only pass known admin_profile columns — nothing else
                    const profilePayload: any = {};
                    if (profileData.name  !== undefined) profilePayload.name     = profileData.name;
                    if (profileData.role  !== undefined) profilePayload.role     = profileData.role;
                    if (profileData.avatar !== undefined) profilePayload.avatar  = profileData.avatar;
                    if (profileData.password !== undefined && profileData.password) profilePayload.password = profileData.password;

                    await firestoreService.updateAdminProfile(profilePayload);

                    setAdminProfile((prev: any) => ({
                        ...prev,
                        name:   profilePayload.name   ?? prev.name,
                        role:   profilePayload.role   ?? prev.role,
                        avatar: profilePayload.avatar ?? prev.avatar,
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
            console.error('[useAdminProfile] Update failed:', error);
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
