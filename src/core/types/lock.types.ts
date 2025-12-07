export interface LockState {
    isLocked: boolean;
    lockedBy?: string; // Admin ID
    lockedAt?: number; // Timestamp
    reason?: string;   // Optional context
    deviceId?: string; // For conflict resolution (future proofing)
}

export interface Lockable {
    lock?: LockState;
}

// Helper type to make any type lockable
export type WithLock<T> = T & Lockable;
