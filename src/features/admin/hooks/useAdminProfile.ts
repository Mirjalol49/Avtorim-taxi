import { useState } from 'react';
import { AdminUser, AdminProfile } from '../../../core/types';
import * as firestoreService from '../../../../services/firestoreService';
import { uploadAdminAvatar } from '../../../../services/storageService';
import { useToast } from '../../../../components/ToastNotification';
import { TRANSLATIONS } from '../../../../translations';

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
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdateProfile = async (profileData: any) => {
        setIsUpdating(true);
        try {
            // Race against a 15s timeout
            const updatePromise = async () => {
                if (adminUser) {
                    // Update Sub-Admin
                    // Handle avatar upload if it's a data URI
                    if (profileData.avatar && profileData.avatar.startsWith('data:image/')) {
                        try {
                            const result = await uploadAdminAvatar(profileData.avatar, adminUser.username);
                            profileData.avatar = result.url;
                        } catch (uploadError: any) {
                            console.error('Avatar upload failed:', uploadError);
                            addToast('error', `Avatar failed: ${uploadError.message}`);
                            delete profileData.avatar;
                        }
                    }

                    // Update in Firestore
                    const sanitizedUpdates = { ...profileData };
                    if (sanitizedUpdates.name) {
                        sanitizedUpdates.username = sanitizedUpdates.name;
                        delete sanitizedUpdates.name;
                    }

                    await firestoreService.updateAdminUser(adminUser.id, {
                        ...sanitizedUpdates,
                        updatedAt: Date.now()
                    }, adminUser.id);

                    // Update Local State
                    setAdminUser(prev => prev ? ({ ...prev, ...sanitizedUpdates }) : null);

                } else {
                    // Update Super Admin
                    if (profileData.avatar && profileData.avatar.startsWith('data:image/')) {
                        try {
                            const result = await uploadAdminAvatar(profileData.avatar, 'admin');
                            profileData.avatar = result.url;
                        } catch (uploadError: any) {
                            console.error('Avatar upload failed:', uploadError);
                            addToast('error', `Avatar failed: ${uploadError.message}`);
                            delete profileData.avatar;
                        }
                    }

                    // Update Firestore Admin Profile
                    await firestoreService.updateAdminProfile(profileData);

                    // Update Local State
                    setAdminProfile((prev: any) => ({
                        ...prev,
                        name: profileData.name,
                        role: profileData.role,
                        avatar: profileData.avatar || prev.avatar
                    }));

                    // Update LocalStorage Password if changed
                    if (profileData.password) {
                        localStorage.setItem('avtorim_admin_password', profileData.password);
                    }
                }
            };

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Operation timed out')), 15000)
            );

            await Promise.race([updatePromise(), timeoutPromise]);

            addToast('success', TRANSLATIONS[language as keyof typeof TRANSLATIONS]?.profileUpdated || 'Profile updated successfully');

        } catch (error: any) {
            console.error('❌ Failed to update profile:', error);
            if (error.message === 'Operation timed out') {
                addToast('error', 'Update timed out. Please check your connection.');
            } else {
                const errorMessage = error.code === 'storage/unauthorized'
                    ? 'Permission denied: Check Firebase Storage Rules'
                    : (error.message || 'Failed to update profile');
                addToast('error', `Error: ${errorMessage}`);
            }
        } finally {
            setIsUpdating(false);
        }
    };

    return { handleUpdateProfile, isUpdating };
};
