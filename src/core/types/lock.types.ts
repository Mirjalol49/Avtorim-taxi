export interface LockState {
    isLocked: boolean;
    lockedBy?: string | null; // Admin ID
    lockedAt?: number | null; // Timestamp
    reason?: string | null;   // Optional context
    deviceId?: string; // For conflict resolution (future proofing)
}

export interface Lockable {
    lock?: LockState;
}

// Helper type to make any type lockable
export type WithLock<T> = T & Lockable;
