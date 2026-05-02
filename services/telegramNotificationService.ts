/**
 * telegramNotificationService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Frontend-side wrapper that sends transaction/event alerts to the admin's
 * Telegram chat via the backend server's /api/notifications/transaction route.
 *
 * All calls are fire-and-forget: they run silently in the background and
 * NEVER block or throw to the calling code, so UI remains unaffected if
 * the bot server is down or not configured.
 */

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

export interface TransactionAlertPayload {
    /** Fleet / admin user ID — used to look up the admin's Telegram chat ID */
    adminId: string;
    /** Optional: override stored chat ID for one-off sends */
    adminChatId?: string;
    driverName: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    description?: string;
    carName?: string;
    /** Username of the CRM user who created the transaction */
    performedBy?: string;
    timestamp?: number;
}

/**
 * Sends a real-time transaction alert to the admin via Telegram.
 * Fire-and-forget — safe to call without awaiting.
 */
export const notifyTransactionOnTelegram = (payload: TransactionAlertPayload): void => {
    if (typeof window === 'undefined') return;

    fetch(`${SERVER_URL}/api/notifications/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
        .then((res) => res.json())
        .then((data) => {
            if (!data.success && data.error) {
                console.debug('[Telegram] Alert skipped:', data.error);
            }
        })
        .catch((err) => {
            console.debug('[Telegram] Alert failed (server down?):', err.message);
        });
};

// ── Admin chat ID configuration helpers ──────────────────────────────────────

/** Fetches the admin's currently stored Telegram chat ID. */
export const getAdminTelegramChatId = async (adminId: string): Promise<string | null> => {
    try {
        const res = await fetch(`${SERVER_URL}/api/admin/telegram-chat?adminId=${encodeURIComponent(adminId)}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.chatId ?? null;
    } catch {
        return null;
    }
};

/** Saves/updates the admin's Telegram chat ID on the server. */
export const setAdminTelegramChatId = async (adminId: string, chatId: string): Promise<void> => {
    const res = await fetch(`${SERVER_URL}/api/admin/telegram-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, chatId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error ?? 'Failed to save chat ID');
};
