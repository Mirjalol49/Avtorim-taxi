import { createClient } from '@supabase/supabase-js';

const TOKEN       = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT  = process.env.TELEGRAM_ADMIN_CHAT_ID;
const API         = `https://api.telegram.org/bot${TOKEN}`;

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

const SUPPORT_PHONE = '+998 93 748 91 41';

const T = {
    uz: {
        welcome:          '🚖 *TAKSAPARK* tizimiga xush kelibsiz!\n\nTilingizni tanlang:',
        share_contact:    '📱 Telefon raqamni yuborish',
        contact_request:  'Davom etish uchun telefon raqamingizni yuboring:',
        not_your_contact: '🚫 Iltimos, faqat o\'zingizning raqamingizni yuboring.',
        driver_not_found: `🚫 Raqamingiz bazada topilmadi.\n\n📞 Admin: ${SUPPORT_PHONE}`,
        success_login:    '✅ Xush kelibsiz, {name}!\n\nKirim qo\'shish uchun tugmani bosing.',
        btn_income:       '💰 Kirim qo\'shish',
        btn_help:         '🆘 Yordam',
        btn_settings:     '🌐 Tilni o\'zgartirish',
        ask_amount:       '💰 Qancha summa topdingiz?\n\n_(Faqat raqam kiriting, masalan: 500000)_',
        ask_photo:        '📸 Endi karta cheki yoki to\'lov rasmini yuboring:',
        invalid_number:   '⚠️ Iltimos, to\'g\'ri summa yozing (faqat raqam).',
        send_photo_first: '📸 Iltimos, chek rasmini yuboring. Matn qabul qilinmaydi.',
        saved:            '✅ *{amount} so\'m* kirim sifatida saqlandi!\n\nRahmat! 💪',
        help_text:        `📞 Admin: ${SUPPORT_PHONE}`,
        error:            '❌ Xatolik yuz berdi. Qaytadan urinib ko\'ring.',
        need_start:       '⚠️ Botni qayta ishga tushiring: /start',
        salary_msg:       '✅ *Maosh To\'landi!*\n\n💰 Summa: *{amount}*\n📅 Sana: {date}\n\nRahmat! 🚀',
        admin_notify:     '💰 *Yangi kirim!*\n\n👤 Haydovchi: *{name}*\n💵 Summa: *{amount} so\'m*\n📅 Sana: {date}',
    },
    ru: {
        welcome:          '🚖 Добро пожаловать в *TAKSAPARK*!\n\nВыберите язык:',
        share_contact:    '📱 Отправить номер',
        contact_request:  'Отправьте свой номер телефона для продолжения:',
        not_your_contact: '🚫 Пожалуйста, отправьте только свой номер.',
        driver_not_found: `🚫 Ваш номер не найден.\n\n📞 Админ: ${SUPPORT_PHONE}`,
        success_login:    '✅ Добро пожаловать, {name}!\n\nНажмите кнопку для добавления дохода.',
        btn_income:       '💰 Добавить доход',
        btn_help:         '🆘 Помощь',
        btn_settings:     '🌐 Сменить язык',
        ask_amount:       '💰 Сколько вы заработали?\n\n_(Только цифры, например: 500000)_',
        ask_photo:        '📸 Теперь отправьте фото чека или скриншот оплаты:',
        invalid_number:   '⚠️ Введите корректную сумму (только цифры).',
        send_photo_first: '📸 Пожалуйста, отправьте фото чека. Текст не принимается.',
        saved:            '✅ *{amount} сум* записано как доход!\n\nСпасибо! 💪',
        help_text:        `📞 Админ: ${SUPPORT_PHONE}`,
        error:            '❌ Произошла ошибка. Попробуйте снова.',
        need_start:       '⚠️ Перезапустите бота: /start',
        salary_msg:       '✅ *Зарплата Выплачена!*\n\n💰 Сумма: *{amount}*\n📅 Дата: {date}\n\nСпасибо! 🚀',
        admin_notify:     '💰 *Новый доход!*\n\n👤 Водитель: *{name}*\n💵 Сумма: *{amount} сум*\n📅 Дата: {date}',
    },
    en: {
        welcome:          '🚖 Welcome to *TAKSAPARK*!\n\nSelect your language:',
        share_contact:    '📱 Share Contact',
        contact_request:  'Share your phone number to continue:',
        not_your_contact: '🚫 Please share only your own contact.',
        driver_not_found: `🚫 Your number was not found.\n\n📞 Admin: ${SUPPORT_PHONE}`,
        success_login:    '✅ Welcome, {name}!\n\nPress the button to add income.',
        btn_income:       '💰 Add Income',
        btn_help:         '🆘 Help',
        btn_settings:     '🌐 Change Language',
        ask_amount:       '💰 How much did you earn?\n\n_(Numbers only, e.g. 500000)_',
        ask_photo:        '📸 Now send a photo of the card receipt or payment screenshot:',
        invalid_number:   '⚠️ Enter a valid amount (numbers only).',
        send_photo_first: '📸 Please send a photo of the receipt. Text is not accepted.',
        saved:            '✅ *{amount} UZS* recorded as income!\n\nThank you! 💪',
        help_text:        `📞 Admin: ${SUPPORT_PHONE}`,
        error:            '❌ An error occurred. Please try again.',
        need_start:       '⚠️ Please restart the bot: /start',
        salary_msg:       '✅ *Salary Paid!*\n\n💰 Amount: *{amount}*\n📅 Date: {date}\n\nThank you! 🚀',
        admin_notify:     '💰 *New Income!*\n\n👤 Driver: *{name}*\n💵 Amount: *{amount} UZS*\n📅 Date: {date}',
    },
};

// ── Telegram API helpers ────────────────────────────────────────────────────
async function tgPost(method, body) {
    const res = await fetch(`${API}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.json();
}

async function reply(chatId, text, replyMarkup) {
    const body = { chat_id: chatId, text, parse_mode: 'Markdown' };
    if (replyMarkup) body.reply_markup = replyMarkup;
    return tgPost('sendMessage', body);
}

async function sendPhoto(chatId, fileId, caption) {
    return tgPost('sendPhoto', {
        chat_id: chatId,
        photo: fileId,
        caption,
        parse_mode: 'Markdown',
    });
}

function mainMenu(lang) {
    const t = T[lang] || T.uz;
    return {
        keyboard: [
            [t.btn_income],
            [t.btn_help, t.btn_settings],
        ],
        resize_keyboard: true,
    };
}

function langMenu() {
    return {
        keyboard: [["🇺🇿 O'zbekcha", '🇷🇺 Русский', '🇬🇧 English']],
        resize_keyboard: true,
        one_time_keyboard: true,
    };
}

function contactMenu(lang) {
    const t = T[lang] || T.uz;
    return {
        keyboard: [[{ text: t.share_contact, request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
    };
}

// ── Session management (Supabase) ───────────────────────────────────────────
async function getSession(telegramId) {
    const { data } = await supabase
        .from('bot_sessions')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();
    return data;
}

async function setSession(telegramId, patch) {
    await supabase.from('bot_sessions').upsert(
        { telegram_id: telegramId, updated_at: new Date().toISOString(), ...patch },
        { onConflict: 'telegram_id' }
    );
}

async function clearSession(telegramId) {
    await supabase.from('bot_sessions').delete().eq('telegram_id', telegramId);
}

// ── Driver lookup ───────────────────────────────────────────────────────────
async function findDriverByPhone(raw) {
    const suffix = raw.replace(/\D/g, '').slice(-9);
    const { data } = await supabase.from('drivers').select('*').eq('is_deleted', false);
    if (!data) return null;
    return data.find(d => d.phone && d.phone.replace(/\D/g, '').slice(-9) === suffix) ?? null;
}

async function findDriverByTelegramId(telegramId) {
    const { data } = await supabase
        .from('drivers')
        .select('*')
        .eq('telegram', telegramId.toString())
        .eq('is_deleted', false)
        .maybeSingle();
    return data;
}

// ── Get Telegram file public URL ────────────────────────────────────────────
async function getTelegramFileUrl(fileId) {
    const res = await tgPost('getFile', { file_id: fileId });
    if (!res.ok || !res.result?.file_path) return null;
    return `https://api.telegram.org/file/bot${TOKEN}/${res.result.file_path}`;
}

// ── Save income + notify admin ──────────────────────────────────────────────
async function saveIncomeAndNotify(driver, amount, photoFileId, lang) {
    const t = T[lang] || T.uz;
    const now = new Date();
    const dateStr = now.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
    const fmt = amount.toLocaleString('uz-UZ');

    // Get public URL for the photo
    const chequeUrl = await getTelegramFileUrl(photoFileId);

    // Save to Supabase transactions — exact columns from addTransaction in firestoreService
    const nowMs = Date.now();
    const { error: txError } = await supabase.from('transactions').insert({
        fleet_id:       driver.fleet_id ?? null,
        driver_id:      driver.id,
        driver_name:    driver.name,
        amount:         Math.abs(amount),
        type:           'INCOME',
        status:         'ACTIVE',
        description:    'Karta/chek orqali kirim (bot)',
        note:           null,
        payment_method: 'CARD',
        cheque_image:   chequeUrl ?? null,
        timestamp_ms:   nowMs,
        created_ms:     nowMs,
    });
    if (txError) console.error('Transaction insert error:', JSON.stringify(txError));

    // Insert in-app notification — must include fleet_id so app sees it
    const { error: notifError } = await supabase.from('notifications').insert({
        fleet_id:         driver.fleet_id ?? null,
        title:            `💰 Yangi kirim: ${driver.name}`,
        message:          `${driver.name} — ${fmt} so'm (karta/chek orqali)`,
        type:             'payment_reminder',
        category:         'payment_reminder',
        priority:         'high',
        target_users:     'role:admin',
        created_by_name:  'Telegram Bot',
        created_ms:       nowMs,
        expires_at:       nowMs + 7 * 24 * 60 * 60 * 1000,
        delivery_tracking: {
            sent: nowMs, delivered: [], read: [],
            driverId: driver.id,
            driverAvatar: driver.avatar_url ?? null,
        },
    });
    if (notifError) console.error('Notification insert error:', JSON.stringify(notifError));

    // Forward photo to admin Telegram chat
    if (ADMIN_CHAT) {
        const caption = t.admin_notify
            .replace('{name}', driver.name)
            .replace('{amount}', fmt)
            .replace('{date}', dateStr);
        await sendPhoto(ADMIN_CHAT, photoFileId, caption);
    }
}

// ── Main message handler ────────────────────────────────────────────────────
async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId) return;

    const text    = msg.text;
    const contact = msg.contact;
    const photo   = msg.photo; // array of PhotoSize, last is largest

    // /start — reset and show language picker
    if (text === '/start') {
        await clearSession(userId);
        await reply(chatId, T.uz.welcome, langMenu());
        return;
    }

    // Language selection
    const langMap = { "🇺🇿 O'zbekcha": 'uz', '🇷🇺 Русский': 'ru', '🇬🇧 English': 'en' };
    if (text && langMap[text]) {
        const lang   = langMap[text];
        const driver = await findDriverByTelegramId(userId);
        if (driver) {
            await setSession(userId, { lang, step: 'idle', driver_id: driver.id });
            await reply(chatId,
                T[lang].success_login.replace('{name}', driver.name || 'Driver'),
                mainMenu(lang)
            );
        } else {
            await setSession(userId, { lang, step: 'awaiting_contact' });
            await reply(chatId, T[lang].contact_request, contactMenu(lang));
        }
        return;
    }

    // Contact shared → link driver
    if (contact) {
        const session = await getSession(userId);
        const lang    = session?.lang || 'uz';
        const t       = T[lang];

        if (contact.user_id && contact.user_id !== userId) {
            await reply(chatId, t.not_your_contact);
            return;
        }

        const driver = await findDriverByPhone(contact.phone_number);
        if (!driver) {
            await reply(chatId, t.driver_not_found, langMenu());
            return;
        }

        await supabase.from('drivers').update({ telegram: userId.toString() }).eq('id', driver.id);
        await setSession(userId, { lang, step: 'idle', driver_id: driver.id });
        await reply(chatId,
            t.success_login.replace('{name}', driver.name || 'Driver'),
            mainMenu(lang)
        );
        return;
    }

    // Load session + driver for all further steps
    const session = await getSession(userId);
    const lang    = session?.lang || 'uz';
    const t       = T[lang];

    let driver = session?.driver_id
        ? (await supabase.from('drivers').select('*').eq('id', session.driver_id).maybeSingle()).data
        : await findDriverByTelegramId(userId);

    if (!driver) {
        await reply(chatId, t.need_start);
        return;
    }

    if (!session?.driver_id) {
        await setSession(userId, { lang, step: 'idle', driver_id: driver.id });
    }

    // ── Photo received (step: awaiting_photo) ──
    if (photo && photo.length > 0) {
        if (session?.step !== 'awaiting_photo') {
            await reply(chatId, '👇', mainMenu(lang));
            return;
        }
        const amount     = session.temp_amount;
        const fileId     = photo[photo.length - 1].file_id; // largest size
        const fmt        = amount.toLocaleString('uz-UZ');

        await saveIncomeAndNotify(driver, amount, fileId, lang);
        await setSession(userId, { lang, step: 'idle', temp_amount: null, driver_id: driver.id });
        await reply(chatId, t.saved.replace('{amount}', fmt), mainMenu(lang));
        return;
    }

    if (!text) return;

    // ── Settings ──
    if (text === t.btn_settings) {
        await reply(chatId, T.uz.welcome, langMenu());
        return;
    }

    // ── Help ──
    if (text === t.btn_help) {
        await reply(chatId, t.help_text, mainMenu(lang));
        return;
    }

    // ── Kirim button ──
    if (text === t.btn_income) {
        await setSession(userId, { lang, step: 'awaiting_amount', driver_id: driver.id });
        await reply(chatId, t.ask_amount, { remove_keyboard: true });
        return;
    }

    // ── Amount entered ──
    if (session?.step === 'awaiting_amount') {
        const amount = parseInt(text.replace(/\D/g, ''), 10);
        if (!amount || amount <= 0) {
            await reply(chatId, t.invalid_number);
            return;
        }
        await setSession(userId, { lang, step: 'awaiting_photo', temp_amount: amount, driver_id: driver.id });
        await reply(chatId, t.ask_photo, { remove_keyboard: true });
        return;
    }

    // ── Text sent when photo expected ──
    if (session?.step === 'awaiting_photo') {
        await reply(chatId, t.send_photo_first);
        return;
    }

    // Default fallback
    await reply(chatId, '👇', mainMenu(lang));
}

// ── Netlify handler ─────────────────────────────────────────────────────────
export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 200, body: 'Telegram webhook active.' };
    }
    try {
        const update = JSON.parse(event.body || '{}');
        if (update.message) await handleMessage(update.message);
    } catch (err) {
        console.error('Webhook error:', err);
    }
    return { statusCode: 200, body: 'OK' };
};
