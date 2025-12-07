import { db } from '../../../../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { LockState } from '../../../core/types/lock.types';
import { getCollectionPath } from '../../../../services/firestoreService';

export class LockService {

    /**
     * Toggles lock state for any entity (Driver, Transaction, etc.)
     * Uses atomic Firestore update to prevent race conditions.
     */
    static async toggleLock(
        collectionPath: string,
        docId: string,
        userId: string,
        currentLockState?: LockState
    ): Promise<boolean> {
        // Resolve path: If it's a simple name (e.g. 'drivers'), scope it to fleet using userId
        const finalPath = collectionPath.includes('/')
            ? collectionPath
            : getCollectionPath(collectionPath, userId);

        const docRef = doc(db, finalPath, docId);
        const now = Date.now();

        // Determine new state
        const newIsLocked = !currentLockState?.isLocked;
        const newLockState: LockState = {
            isLocked: newIsLocked,
            lockedBy: newIsLocked ? userId : undefined,
            lockedAt: newIsLocked ? now : undefined,
            // maintain deviceId if present in future
        };

        try {
            await updateDoc(docRef, {
                lock: newLockState
            });
            return newIsLocked;
        } catch (error) {
            console.error(`Failed to toggle lock for ${finalPath}/${docId}:`, error);
            throw error;
        }
    }

    /**
     * Check if an entity is locked
     */
    static isLocked(lockState?: LockState): boolean {
        return !!lockState?.isLocked;
    }

    /**
     * Check if an operation is allowed (i.e., not locked OR locked by current user)
     */
    static canEdit(lockState: LockState | undefined, userId: string): boolean {
        if (!lockState?.isLocked) return true;
        return lockState.lockedBy === userId; // Only locker can edit (or super admin logic here later)
    }
}
