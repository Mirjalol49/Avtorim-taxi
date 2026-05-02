export interface CarDocument {
    name: string;
    type: string;      // MIME type
    data: string;      // base64 data URL
    category: 'id_card' | 'insurance' | 'technical_passport' | 'other';
}

/**
 * Immutable snapshot of a daily plan change.
 * When a car's dailyPlan is updated, a new entry is appended here.
 * Never modify or delete past entries — they are the source of truth
 * for historical debt / payment calculations.
 */
export interface PlanHistoryEntry {
    plan: number;          // The daily plan amount in UZS
    effectiveFrom: number; // Unix ms — the first millisecond this plan was active
}

/**
 * A per-day override for a specific calendar date.
 * Key format in dayOverrides map: 'YYYY-MM-DD'
 *
 * OFF      — the day is treated as a day off (plan = 0, not counted in target)
 * DISCOUNT — the day has a custom reduced plan (customPlan UZS instead of normal)
 */
export interface DayOverride {
    type: 'OFF' | 'DISCOUNT';
    customPlan?: number; // only used when type === 'DISCOUNT'
}

export interface Car {
    id: string;
    fleetId?: string;
    name: string;           // e.g. "Chevrolet Cobalt"
    licensePlate: string;   // e.g. "01 A 777 AA"
    avatar?: string;        // car photo
    documents?: CarDocument[];
    assignedDriverId?: string | null;
    dailyPlan?: number;     // current plan (for display & new entries)
    /** Full history of plan changes, oldest first. Used for accurate historical debt. */
    planHistory?: PlanHistoryEntry[];
    /**
     * Per-day overrides keyed by 'YYYY-MM-DD'.
     * Used to mark specific future (or past) days as OFF or DISCOUNT.
     */
    dayOverrides?: Record<string, DayOverride>;
    isDeleted?: boolean;
    createdAt?: number;
}
