import { supabase } from '../../../../supabase';
import { LockState } from '../../../core/types/lock.types';

export class LockService {

    static async toggleLock(
        tableName: string,
        docId: string,
        userId: string,
        currentLockState?: LockState
    ): Promise<boolean> {
        const now = Date.now();
        const newIsLocked = !currentLockState?.isLocked;
        const newLockState: LockState = {
            isLocked: newIsLocked,
            lockedBy: newIsLocked ? userId : null,
            lockedAt: newIsLocked ? now : null,
        };

        const { error } = await supabase
            .from(tableName)
            .update({ lock: newLockState })
            .eq('id', docId);

        if (error) {
            console.error(`Failed to toggle lock for ${tableName}/${docId}:`, error);
            throw error;
        }
        return newIsLocked;
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
