/**
 * Thin localStorage cache — the Promed Pattern 1 equivalent for Supabase.
 *
 * Philosophy: never wait for the server to show data the user has already seen.
 * On every hook init, serve stale cache in <1ms. Let the live subscription
 * overwrite silently. The user never sees a blank grid again after their first load.
 *
 * TTL: 24 hours. Stale entries are auto-evicted on read.
 * Size guard: entries >500 KB are skipped to avoid QuotaExceededError.
 */

const CACHE_PREFIX = 'avtorim_dc_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const MAX_ENTRY_BYTES = 500 * 1024;        // 500 KB per entry

interface CacheEntry<T> {
    data: T[];
    ts: number; // epoch ms
}

/** Read cached data for a key. Returns [] if missing, expired, or corrupt. */
export const readCache = <T>(key: string): T[] => {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return [];
        const entry: CacheEntry<T> = JSON.parse(raw);
        if (Date.now() - entry.ts > CACHE_TTL_MS) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return [];
        }
        return entry.data ?? [];
    } catch {
        return [];
    }
};

/** Persist data to the cache. Silently skips entries that are too large. */
export const writeCache = <T>(key: string, data: T[]): void => {
    try {
        const entry: CacheEntry<T> = { data, ts: Date.now() };
        const serialized = JSON.stringify(entry);
        if (serialized.length > MAX_ENTRY_BYTES) return; // guard against QuotaExceededError
        localStorage.setItem(CACHE_PREFIX + key, serialized);
    } catch {
        // localStorage full or unavailable — silently ignore
    }
};

/** Remove a specific cache entry (e.g., on logout). */
export const clearCache = (key: string): void => {
    try {
        localStorage.removeItem(CACHE_PREFIX + key);
    } catch { /* ignore */ }
};

/** Remove ALL avtorim data cache entries (call on logout). */
export const clearAllCache = (): void => {
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k?.startsWith(CACHE_PREFIX)) keysToRemove.push(k);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
};
