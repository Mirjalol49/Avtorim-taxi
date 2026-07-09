import { createClient } from '@supabase/supabase-js';

const DAY_MS = 24 * 60 * 60 * 1000;
const TELEGRAM_API = (token) => `https://api.telegram.org/bot${token}/sendMessage`;

async function sendTelegram(fetchImpl, botToken, chatId, text) {
    const res = await fetchImpl(TELEGRAM_API(botToken), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
        let detail = '';
        try { detail = JSON.stringify(await res.json()); } catch {}
        throw new Error(`Telegram send failed: ${res.status ?? 'unknown'} ${detail}`);
    }
}

async function insertAuditNotification(supabase, driver, message, nowMs) {
    const { error } = await supabase.from('notifications').insert({
        fleet_id: driver.fleet_id,
        title: `Telegram xabar: ${driver.name}`,
        message,
        type: 'payment_reminder',
        category: 'payment_reminder',
        priority: 'medium',
        target_users: 'role:admin',
        created_by: null,
        created_by_name: 'Dashboard',
        created_ms: nowMs,
        expires_at: nowMs + 7 * DAY_MS,
        min_account_age: null,
        delivery_tracking: {
            sent: nowMs,
            delivered: [],
            read: [],
            reminderType: 'telegram_custom_driver_message',
            fleetId: driver.fleet_id,
            driverId: driver.id,
            driverName: driver.name,
            telegramId: driver.telegram,
        },
    });
    if (error) throw error;
}

export async function sendDriverTelegramMessage({
    supabase,
    fetchImpl = fetch,
    botToken,
    fleetId,
    driverId,
    message,
    now = new Date(),
}) {
    const cleanMessage = String(message ?? '').trim();
    if (!botToken) return { ok: false, status: 500, error: 'TELEGRAM_BOT_TOKEN is required' };
    if (!fleetId || !driverId || !cleanMessage) {
        return { ok: false, status: 400, error: 'fleetId, driverId, and message are required' };
    }

    const { data: driver, error } = await supabase
        .from('drivers')
        .select('id,fleet_id,name,telegram,is_deleted')
        .eq('id', driverId)
        .eq('fleet_id', fleetId)
        .maybeSingle();

    if (error) throw error;
    if (!driver || driver.is_deleted) return { ok: false, status: 404, error: 'Driver not found' };
    if (!driver.telegram) return { ok: false, status: 400, error: 'Driver Telegram is not linked' };

    const text = `📩 Taksapark xabari\n\n${cleanMessage}`;
    await sendTelegram(fetchImpl, botToken, String(driver.telegram), text);
    await insertAuditNotification(supabase, driver, cleanMessage, now.getTime());

    return { ok: true, status: 200 };
}

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const result = await sendDriverTelegramMessage({
            supabase,
            botToken: process.env.TELEGRAM_BOT_TOKEN,
            fleetId: body.fleetId,
            driverId: body.driverId,
            message: body.message,
        });

        return {
            statusCode: result.status,
            body: JSON.stringify(result.ok ? { ok: true } : { error: result.error }),
        };
    } catch (error) {
        console.error('[send-driver-telegram-message] failed:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send Telegram message' }) };
    }
};
