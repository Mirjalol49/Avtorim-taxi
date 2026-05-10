export interface CarDocument {
    name: string;
    type: string;      // MIME type
    data: string;      // base64 data URL
    category: 'id_card' | 'insurance' | 'technical_passport' | 'other';
}

// ─── Car Damage / Scratch Recorder ───────────────────────────────────────────

/** One photo attached to a damage record. */
export interface DamageImage {
    name: string;
    type: string;   // MIME type (image/*)
    /** Public Supabase Storage URL — preferred for new uploads. */
    url?: string;
    /** Legacy base64 data URL — only present on old records. */
    data?: string;
}

export type DamageSeverity = 'minor' | 'moderate' | 'severe';

/** A single scratch / damage record for a car. */
export interface CarDamage {
    id: string;               // unique ID (Date.now().toString(36) + random)
    partKey: string;          // key from CAR_PARTS, e.g. 'front_bumper'
    severity: DamageSeverity;
    description: string;
    images: DamageImage[];    // base64, same pattern as CarDocument
    recordedAt: number;       // epoch ms
    recordedBy: string;       // admin display name
}

/** All selectable car parts. */
export const CAR_PARTS: { key: string; label: string; icon: string }[] = [
    { key: 'front_bumper',       label: "Old bufer",           icon: '⬆️' },
    { key: 'rear_bumper',        label: "Orqa bufer",          icon: '⬇️' },
    { key: 'hood',               label: "Kaput",               icon: '🔲' },
    { key: 'trunk',              label: "Bagaj",               icon: '📦' },
    { key: 'roof',               label: "Tom",                 icon: '🏠' },
    { key: 'front_windshield',   label: "Old oyna",            icon: '🪟' },
    { key: 'rear_windshield',    label: "Orqa oyna",           icon: '🪟' },
    { key: 'front_left_door',    label: "Old chap eshik",      icon: '🚪' },
    { key: 'front_right_door',   label: "Old o'ng eshik",      icon: '🚪' },
    { key: 'rear_left_door',     label: "Orqa chap eshik",     icon: '🚪' },
    { key: 'rear_right_door',    label: "Orqa o'ng eshik",     icon: '🚪' },
    { key: 'front_left_fender',  label: "Old chap qanot",      icon: '⚡' },
    { key: 'front_right_fender', label: "Old o'ng qanot",      icon: '⚡' },
    { key: 'rear_left_fender',   label: "Orqa chap qanot",     icon: '⚡' },
    { key: 'rear_right_fender',  label: "Orqa o'ng qanot",     icon: '⚡' },
    { key: 'left_mirror',        label: "Chap ko'zgu",         icon: '🪞' },
    { key: 'right_mirror',       label: "O'ng ko'zgu",         icon: '🪞' },
    { key: 'headlight_fl',       label: "Old chap chiroq",     icon: '💡' },
    { key: 'headlight_fr',       label: "Old o'ng chiroq",     icon: '💡' },
    { key: 'taillight_rl',       label: "Orqa chap chiroq",    icon: '🔴' },
    { key: 'taillight_rr',       label: "Orqa o'ng chiroq",    icon: '🔴' },
    { key: 'other',              label: "Boshqa",              icon: '🔩' },
];

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
    type: 'OFF' | 'DISCOUNT' | 'NOT_WORKING';
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
    /** Scratch / damage history for this car. Persisted as JSONB in the cars table. */
    damage?: CarDamage[];
}
