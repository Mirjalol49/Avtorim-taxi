import { useState, useCallback } from 'react';
import { LockService } from '../services/LockService';
import { LockState, Lockable } from '../../../core/types/lock.types';
import { useToast } from '../../../../components/ToastNotification';
import { playLockSound } from '../../../../services/soundService';

interface UseLockProps {
    collectionPath: string;
    docId: string;
    entity: Lockable;
    userId: string;
}

export const useLock = ({ collectionPath, docId, entity, userId }: UseLockProps) => {
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Initial state from props (relying on parent subscription for real-time updates)
    const isLocked = !!entity.lock?.isLocked;
    const lockedByCurrentUser = entity.lock?.lockedBy === userId;
    const canEdit = !isLocked || lockedByCurrentUser;

    const toggleLock = useCallback(async () => {
        if (isLoading) return;

        // Vibrate for feedback
        if (navigator.vibrate) navigator.vibrate(50);

        setIsLoading(true);
        try {
            await LockService.toggleLock(collectionPath, docId, userId, entity.lock);
            // Play lock sound on successful toggle
            playLockSound();
            // Optimistic update handled by parent subscription usually, 
            // but we could set local state here if we wanted deeper optimism.
            // Since Firestore is fast and local persistence is enabled, standard flow is fine.
        } catch (error) {
            addToast('error', 'Failed to update lock state');
        } finally {
            setIsLoading(false);
        }
    }, [collectionPath, docId, userId, entity.lock, isLoading, addToast]);

    return {
        isLocked,
        canEdit,
        lockedBy: entity.lock?.lockedBy,
        toggleLock,
        isLoading
    };
};
