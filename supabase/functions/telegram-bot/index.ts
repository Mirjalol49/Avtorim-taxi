import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TG = `https://api.telegram.org/bot${BOT_TOKEN}`

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── Telegram API helpers ──────────────────────────────────────────────────────

async function tgPost(method: string, body: Record<string, unknown>) {
    await fetch(`${TG}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
}

async function sendMessage(chatId: number, text: string, extra: Record<string, unknown> = {}) {
    await tgPost('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra })
}

async function answerCbq(id: string) {
    await tgPost('answerCallbackQuery', { callback_query_id: id })
}

async function getTelegramFileUrl(fileId: string): Promise<string | null> {
    const res = await fetch(`${TG}/getFile?file_id=${fileId}`)
    const json = await res.json()
    if (!json.ok) return null
    return `https://api.telegram.org/file/bot${BOT_TOKEN}/${json.result.file_path}`
}

// ── Session ───────────────────────────────────────────────────────────────────

interface Session {
    chat_id: number
    state: string
    language: 'uz' | 'ru'
    driver_id: string | null
    driver_name: string | null
    driver_avatar: string | null
    fleet_id: string | null
    pending_amount: number | null
    updated_at: number
}

async function getSession(chatId: number): Promise<Session> {
    const { data } = await supabase
        .from('telegram_sessions')
        .select('*')
        .eq('chat_id', chatId)
        .maybeSingle()

    return (data as Session) ?? {
        chat_id: chatId,
        state: 'start',
        language: 'uz',
        driver_id: null,
        driver_name: null,
        driver_avatar: null,
        fleet_id: null,
        pending_amount: null,
        updated_at: Date.now(),
    }
}

async function saveSession(patch: Partial<Session> & { chat_id: number }) {
    await supabase.from('telegram_sessions').upsert({ ...patch, updated_at: Date.now() })
}

// ── Translations ──────────────────────────────────────────────────────────────

const T = {
    chooseLanguage: '🌐 Tilni tanlang / Выберите язык:',

    shareBtn:    { uz: '📲 Raqamni ulashish',          ru: '📲 Поделиться номером' },
    askPhone:    { uz: '📱 Telefon raqamingizni ulashing:', ru: '📱 Поделитесь своим номером телефона:' },
    notFound:    { uz: '❌ Siz tizimda topilmadingiz.\nIltimos, administrator bilan bog\'laning.', ru: '❌ Вы не найдены в системе.\nОбратитесь к администратору.' },
    welcome:     { uz: (n: string) => `👋 Xush kelibsiz, <b>${n}</b>! 🎉`, ru: (n: string) => `👋 Добро пожаловать, <b>${n}</b>! 🎉` },
    mainMenu:    { uz: '📋 Asosiy menyu:', ru: '📋 Главное меню:' },
    kirim:       { uz: '💰 Kirim',         ru: '💰 Kirim' },
    chooseType:  { uz: '💳 To\'lov turini tanlang:', ru: '💳 Выберите тип оплаты:' },
    cash:        { uz: '💵 Naqd',   ru: '💵 Наличные' },
    card:        { uz: '💳 Karta',  ru: '💳 Карта' },
    enterAmount: { uz: '💬 Miqdorni kiriting (UZS):', ru: '💬 Введите сумму (UZS):' },
    sendCheque:  { uz: '📸 Chek rasmini yuboring:', ru: '📸 Отправьте фото чека:' },
    badAmount:   { uz: '⚠️ Noto\'g\'ri miqdor. Faqat raqam kiriting.', ru: '⚠️ Неверная сумма. Введите только число.' },
    needPhoto:   { uz: '⚠️ Iltimos, rasm yuboring.', ru: '⚠️ Пожалуйста, отправьте фото.' },
    success:     { uz: (a: number, m: string) => `✅ Qabul qilindi!\n\n💰 <b>${fmt(a)} UZS</b>\n🧾 ${m}`, ru: (a: number, m: string) => `✅ Принято!\n\n💰 <b>${fmt(a)} UZS</b>\n🧾 ${m}` },
    methodLabel: { uz: { cash: 'Naqd', card: 'Karta' }, ru: { cash: 'Наличные', card: 'Карта' } },
}

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n))

// ── Main menu inline keyboard ─────────────────────────────────────────────────

const mainMenuKeyboard = (lang: 'uz' | 'ru') => ({
    reply_markup: {
        inline_keyboard: [[{ text: T.kirim[lang], callback_data: 'kirim' }]],
    },
})

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
    if (req.method !== 'POST') return new Response('OK')

    let body: Record<string, unknown>
    try { body = await req.json() } catch { return new Response('OK') }

    const msg = body.message as Record<string, unknown> | undefined
    const cbq = body.callback_query as Record<string, unknown> | undefined

    const chatId: number = (msg?.chat as any)?.id ?? (cbq?.message as any)?.chat?.id
    if (!chatId) return new Response('OK')

    const session = await getSession(chatId)
    const lang = session.language

    // ── /start ────────────────────────────────────────────────────────────────
    if ((msg?.text as string) === '/start') {
        await saveSession({ chat_id: chatId, state: 'awaiting_language', language: 'uz', driver_id: null, driver_name: null, driver_avatar: null, fleet_id: null, pending_amount: null })
        await sendMessage(chatId, T.chooseLanguage, {
            reply_markup: {
                inline_keyboard: [[
                    { text: "🇺🇿 O'zbek", callback_data: 'lang_uz' },
                    { text: '🇷🇺 Русский', callback_data: 'lang_ru' },
                ]],
            },
        })
        return new Response('OK')
    }

    // ── Callback queries ──────────────────────────────────────────────────────
    if (cbq) {
        const data = cbq.data as string
        await answerCbq(cbq.id as string)

        // Language pick
        if (data === 'lang_uz' || data === 'lang_ru') {
            const l = data === 'lang_uz' ? 'uz' : 'ru'
            await saveSession({ chat_id: chatId, state: 'awaiting_phone', language: l })
            await sendMessage(chatId, T.askPhone[l], {
                reply_markup: {
                    keyboard: [[{ text: T.shareBtn[l], request_contact: true }]],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            })
            return new Response('OK')
        }

        // Kirim
        if (data === 'kirim') {
            await saveSession({ chat_id: chatId, state: 'awaiting_payment_type' })
            await sendMessage(chatId, T.chooseType[lang], {
                reply_markup: {
                    inline_keyboard: [[
                        { text: T.cash[lang], callback_data: 'pay_cash' },
                        { text: T.card[lang], callback_data: 'pay_card' },
                    ]],
                },
            })
            return new Response('OK')
        }

        // Cash
        if (data === 'pay_cash') {
            await saveSession({ chat_id: chatId, state: 'awaiting_amount_cash' })
            await sendMessage(chatId, T.enterAmount[lang])
            return new Response('OK')
        }

        // Card
        if (data === 'pay_card') {
            await saveSession({ chat_id: chatId, state: 'awaiting_amount_card' })
            await sendMessage(chatId, T.enterAmount[lang])
            return new Response('OK')
        }

        return new Response('OK')
    }

    // ── Phone contact ─────────────────────────────────────────────────────────
    if (msg?.contact && session.state === 'awaiting_phone') {
        const rawPhone = ((msg.contact as any).phone_number as string).replace(/\D/g, '')

        const { data: drivers } = await supabase
            .from('drivers')
            .select('id, name, avatar, fleet_id, phone')
            .eq('is_deleted', false)

        const driver = (drivers ?? []).find((d: any) => {
            const dp: string = (d.phone ?? '').replace(/\D/g, '')
            return dp === rawPhone || dp.endsWith(rawPhone) || rawPhone.endsWith(dp)
        })

        if (!driver) {
            await sendMessage(chatId, T.notFound[lang], { reply_markup: { remove_keyboard: true } })
            await saveSession({ chat_id: chatId, state: 'start' })
            return new Response('OK')
        }

        await saveSession({
            chat_id: chatId,
            state: 'main_menu',
            driver_id: driver.id,
            driver_name: driver.name,
            driver_avatar: driver.avatar || null,
            fleet_id: driver.fleet_id,
        })

        await sendMessage(chatId, T.welcome[lang](driver.name), {
            parse_mode: 'HTML',
            reply_markup: { remove_keyboard: true },
        })
        await sendMessage(chatId, T.mainMenu[lang], mainMenuKeyboard(lang))
        return new Response('OK')
    }

    // ── Amount for cash ───────────────────────────────────────────────────────
    if (msg?.text && session.state === 'awaiting_amount_cash') {
        const amount = parseFloat((msg.text as string).replace(/[\s,]/g, '').replace(',', '.'))
        if (!amount || amount <= 0) {
            await sendMessage(chatId, T.badAmount[lang])
            return new Response('OK')
        }

        const now = Date.now()
        await supabase.from('transactions').insert({
            driver_id: session.driver_id,
            driver_name: session.driver_name,
            amount,
            type: 'INCOME',
            status: 'COMPLETED',
            description: 'Telegram orqali naqd kirim',
            payment_method: 'cash',
            timestamp_ms: now,
            created_ms: now,
            fleet_id: session.fleet_id,
        })

        await notifyAdmin(session, amount, 'cash', null, now)
        await saveSession({ chat_id: chatId, state: 'main_menu', pending_amount: null })
        await sendMessage(chatId, T.success[lang](amount, T.methodLabel[lang].cash), { parse_mode: 'HTML' })
        await sendMessage(chatId, T.mainMenu[lang], mainMenuKeyboard(lang))
        return new Response('OK')
    }

    // ── Amount for card (before photo) ────────────────────────────────────────
    if (msg?.text && session.state === 'awaiting_amount_card') {
        const amount = parseFloat((msg.text as string).replace(/[\s,]/g, '').replace(',', '.'))
        if (!amount || amount <= 0) {
            await sendMessage(chatId, T.badAmount[lang])
            return new Response('OK')
        }
        await saveSession({ chat_id: chatId, state: 'awaiting_cheque', pending_amount: amount })
        await sendMessage(chatId, T.sendCheque[lang])
        return new Response('OK')
    }

    // ── Cheque photo ──────────────────────────────────────────────────────────
    if (msg?.photo && session.state === 'awaiting_cheque') {
        const photos = msg.photo as any[]
        const best = photos[photos.length - 1]
        const fileUrl = await getTelegramFileUrl(best.file_id)

        let chequeImageUrl: string | null = null

        if (fileUrl) {
            try {
                const imgRes = await fetch(fileUrl)
                const imgBuffer = await imgRes.arrayBuffer()
                const fileName = `telegram/${session.driver_id}_${Date.now()}.jpg`

                const { data: up, error: upErr } = await supabase.storage
                    .from('cheques')
                    .upload(fileName, imgBuffer, { contentType: 'image/jpeg', upsert: false })

                if (!upErr && up) {
                    const { data: pub } = supabase.storage.from('cheques').getPublicUrl(fileName)
                    chequeImageUrl = pub.publicUrl
                }
            } catch (e) {
                console.error('[TelegramBot] Storage upload failed:', e)
            }
        }

        const amount = session.pending_amount ?? 0
        const now = Date.now()

        await supabase.from('transactions').insert({
            driver_id: session.driver_id,
            driver_name: session.driver_name,
            amount,
            type: 'INCOME',
            status: 'COMPLETED',
            description: 'Telegram orqali karta kirim',
            payment_method: 'card',
            cheque_image: chequeImageUrl,
            timestamp_ms: now,
            created_ms: now,
            fleet_id: session.fleet_id,
        })

        await notifyAdmin(session, amount, 'card', chequeImageUrl, now)
        await saveSession({ chat_id: chatId, state: 'main_menu', pending_amount: null })
        await sendMessage(chatId, T.success[lang](amount, T.methodLabel[lang].card), { parse_mode: 'HTML' })
        await sendMessage(chatId, T.mainMenu[lang], mainMenuKeyboard(lang))
        return new Response('OK')
    }

    // ── Wrong input during awaiting_cheque ────────────────────────────────────
    if (session.state === 'awaiting_cheque') {
        await sendMessage(chatId, T.needPhoto[lang])
        return new Response('OK')
    }

    // ── Fallback for logged-in users ──────────────────────────────────────────
    if (session.state === 'main_menu' && session.driver_id) {
        await sendMessage(chatId, T.mainMenu[lang], mainMenuKeyboard(lang))
    }

    return new Response('OK')
})

// ── Send notification to platform bell ───────────────────────────────────────

async function notifyAdmin(
    session: Session,
    amount: number,
    method: 'cash' | 'card',
    chequeUrl: string | null,
    timestamp: number,
) {
    const d = new Date(timestamp)
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
    const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`
    const methodUz = method === 'cash' ? 'naqd' : 'karta orqali'
    const amountStr = fmt(amount)

    const deliveryTracking: Record<string, unknown> = {
        sent: timestamp,
        delivered: [],
        read: [],
    }
    if (session.driver_avatar) deliveryTracking.driverAvatar = session.driver_avatar
    if (session.driver_id) deliveryTracking.driverId = session.driver_id
    if (chequeUrl) deliveryTracking.chequeImage = chequeUrl

    await supabase.from('notifications').insert({
        title: `${method === 'cash' ? '💵' : '💳'} ${session.driver_name} — ${amountStr} UZS`,
        message: `${session.driver_name} ${dateStr} soat ${timeStr} da ${methodUz} ${amountStr} UZS kirim qildi`,
        type: 'payment_reminder',
        category: 'payment_reminder',
        priority: 'medium',
        target_users: 'role:admin',
        created_by: null,
        created_by_name: 'Telegram Bot',
        created_ms: timestamp,
        expires_at: timestamp + 7 * 24 * 60 * 60 * 1000,
        delivery_tracking: deliveryTracking,
        min_account_age: null,
    })
}
