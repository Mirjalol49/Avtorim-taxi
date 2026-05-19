const CHUNK_LOAD_PATTERN =
    /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk|Failed to import/i;

const RECOVERY_STATE_KEY = 'avtorim_chunk_recovery_state';
const RECOVERY_WINDOW_MS = 2 * 60 * 1000;
const MAX_RECOVERY_ATTEMPTS = 3;

type RecoveryState = {
    firstAttemptAt: number;
    attempts: number;
};

const getRecoveryState = (): RecoveryState => {
    try {
        const raw = sessionStorage.getItem(RECOVERY_STATE_KEY);
        if (!raw) return { firstAttemptAt: Date.now(), attempts: 0 };

        const parsed = JSON.parse(raw) as RecoveryState;
        if (!parsed.firstAttemptAt || Date.now() - parsed.firstAttemptAt > RECOVERY_WINDOW_MS) {
            return { firstAttemptAt: Date.now(), attempts: 0 };
        }

        return parsed;
    } catch {
        return { firstAttemptAt: Date.now(), attempts: 0 };
    }
};

const clearAppCaches = async () => {
    await Promise.allSettled([
        'serviceWorker' in navigator
            ? navigator.serviceWorker.getRegistrations().then(registrations =>
                Promise.allSettled(registrations.map(registration => registration.unregister())),
            )
            : Promise.resolve(),
        'caches' in window
            ? caches.keys().then(keys => Promise.allSettled(keys.map(key => caches.delete(key))))
            : Promise.resolve(),
    ]);
};

export const isChunkLoadError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return CHUNK_LOAD_PATTERN.test(message);
};

export const clearChunkRecoveryState = () => {
    sessionStorage.removeItem(RECOVERY_STATE_KEY);
};

export const recoverFromChunkLoadError = async () => {
    const state = getRecoveryState();

    if (state.attempts >= MAX_RECOVERY_ATTEMPTS) {
        return false;
    }

    sessionStorage.setItem(
        RECOVERY_STATE_KEY,
        JSON.stringify({
            firstAttemptAt: state.firstAttemptAt,
            attempts: state.attempts + 1,
        }),
    );

    await clearAppCaches();

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('app_reload', Date.now().toString());
    window.location.replace(nextUrl.toString());

    return true;
};
