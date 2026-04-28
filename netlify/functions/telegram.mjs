import { createClient } from '@supabase/supabase-js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

const SUPPORT_PHONE = '+998 93 748 91 41';

const T = {
    uz: {
        welcome: '🚖 *TAKSAPARK* tizimiga xush kelibsiz!\n\nTilingizni tanlang:',
        share_contact: '📱 Telefon raqamni yuborish',
        contact_request: 'Davom etish uchun telefon raqamingizni yuboring:',
        not_your_contact: '🚫 Iltimos, faqat o\'zingizning raqamingizni yuboring.',
        driver_not_found: `🚫 Raqamingiz bazada topilmadi.\n\n📞 Admin: ${SUPPORT_PHONE}`,
        success_login: '✅ Xush kelibsiz, {name}!',
        btn_start_work: '🟢 Ishni Boshlash',
        btn_stop_work: '🔴 Ishni Yakunlash',
        btn_income: '💰 Kirim',
        btn_expense: '💸 Chiqim',
        btn_help: '🆘 Yordam',
        btn_settings: '🌐 Tilni o\'zgartirish',
        status_active: '✅ Hozir ishdasiz.',
        status_offline: '✅ Dam olishdasiz.',
        ask_income: '💰 Qancha summa topdingiz?\n(Faqat raqam, masalan: 50000)',
        ask_expense: '💸 Qancha xarajat qildingiz?\n(Faqat raqam, masalan: 15000)',
        ask_comment: '📝 Izoh qoldiring (masalan: Benzin, Tushlik):',
        invalid_number: '⚠️ Iltimos, to\'g\'ri summa yozing (faqat raqam).',
        saved_income: '✅ +{amount} so\'m qabul qilindi.',
        saved_expense: '✅ -{amount} so\'m qabul qilindi.\n📝 Izoh: {comment}',
        help_text: `📞 Admin: ${SUPPORT_PHONE}`,
        error: '❌ Xatolik yuz berdi. Qaytadan urinib ko\'ring.',
        need_start: '⚠️ Botni qayta ishga tushiring: /start',
        salary_msg: '✅ *Maosh To\'landi!*\n\n💰 Summa: *{amount}*\n📅 Sana: {date}\n\nRahmat! 🚀',
    },
    ru: {
        welcome: '🚖 Добро пожаловать в *TAKSAPARK*!\n\nВыберите язык:',
        share_contact: '📱 Отправить номер',
        contact_request: 'Отправьте свой номер телефона для продолжения:',
        not_your_contact: '🚫 Пожалуйста, отправьте только свой номер.',
        driver_not_found: `🚫 Ваш номер не найден.\n\n📞 Админ: ${SUPPORT_PHONE}`,
        success_login: '✅ Добро пожаловать, {name}!',
        btn_start_work: '🟢 Начать работу',
        btn_stop_work: '🔴 Закончить работу',
        btn_income: '💰 Доход',
        btn_expense: '💸 Расход',
        btn_help: '🆘 Помощь',
        btn_settings: '🌐 Сменить язык',
        status_active: '✅ Вы на работе.',
        status_offline: '✅ Вы отдыхаете.',
        ask_income: '💰 Сколько заработали?\n(Только цифры, например: 50000)',
        ask_expense: '💸 Сколько потратили?\n(Только цифры, например: 15000)',
        ask_comment: '📝 Напишите комментарий (например: Бензин, Обед):',
        invalid_number: '⚠️ Введите корректную сумму (только цифры).',
        saved_income: '✅ +{amount} сум принято.',
        saved_expense: '✅ -{amount} сум принято.\n📝 Прим: {comment}',
        help_text: `📞 Админ: ${SUPPORT_PHONE}`,
        error: '❌ Произошла ошибка. Попробуйте снова.',
        need_start: '⚠️ Перезапустите бота: /start',
        salary_msg: '✅ *Зарплата Выплачена!*\n\n💰 Сумма: *{amount}*\n📅 Дата: {date}\n\nСпасибо! 🚀',
    },
    en: {
        welcome: '🚖 Welcome to *TAKSAPARK*!\n\nSelect your language:',
        share_contact: '📱 Share Contact',
        contact_request: 'Share your phone number to continue:',
        not_your_contact: '🚫 Please share only your own contact.',
        driver_not_found: `🚫 Your number was not found.\n\n📞 Admin: ${SUPPORT_PHONE}`,
        success_login: '✅ Welcome, {name}!',
        btn_start_work: '🟢 Start Working',
        btn_stop_work: '🔴 Stop Working',
        btn_income: '💰 Income',
        btn_expense: '💸 Expense',
        btn_help: '🆘 Help',
        btn_settings: '🌐 Change Language',
        status_active: '✅ You are working.',
        status_offline: '✅ You are resting.',
        ask_income: '💰 How much did you earn?\n(Numbers only, e.g. 50000)',
        ask_expense: '💸 How much did you spend?\n(Numbers only, e.g. 15000)',
        ask_comment: '📝 Add a comment (e.g. Gas, Lunch):',
        invalid_number: '⚠️ Enter a valid amount (numbers only).',
        saved_income: '✅ +{amount} UZS recorded.',
        saved_expense: '✅ -{amount} UZS recorded.\n📝 Note: {comment}',
        help_text: `📞 Admin: ${SUPPORT_PHONE}`,
        error: '❌ An error occurred. Please try again.',
        need_start: '⚠️ Please restart the bot: /start',
        salary_msg: '✅ *Salary Paid!*\n\n💰 Amount: *{amount}*\n📅 Date: {date}\n\nThank you! 🚀',
    },
};

// ── Telegram helpers ────────────────────────────────────────────────────────
async function tgPost(method, body) {
    const res = await fetch(`${API}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.json();
}

function mainMenu(lang, status) {
    const t = T[lang] || T.uz;
    const isActive = status === 'ACTIVE';
    return {
        keyboard: [
            [isActive ? t.btn_stop_work : t.btn_start_work],
            [t.btn_income, t.btn_expense],
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

async function reply(chatId, text, replyMarkup) {
    const body = { chat_id: chatId, text, parse_mode: 'Markdown' };
    if (replyMarkup) body.reply_markup = replyMarkup;
    await tgPost('sendMessage', body);
}

// ── Session management ──────────────────────────────────────────────────────
async function getSession(telegramId) {
    const { data } = await supabase
        .from('bot_sessions')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();
    return data;
}

async function setSession(telegramId, patch) {
    await supabase.from('bot_sessions').upsert({
        telegram_id: telegramId,
        updated_at: new Date().toISOString(),
        ...patch,
    }, { onConflict: 'telegram_id' });
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

// ── Message handler ─────────────────────────────────────────────────────────
async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId) return;

    const text = msg.text;
    const contact = msg.contact;

    // /start
    if (text === '/start') {
        await clearSession(userId);
        await reply(chatId, T.uz.welcome, langMenu());
        return;
    }

    // Language selection
    const langMap = { "🇺🇿 O'zbekcha": 'uz', '🇷🇺 Русский': 'ru', '🇬🇧 English': 'en' };
    if (text && langMap[text]) {
        const lang = langMap[text];
        // Check if driver already linked
        const driver = await findDriverByTelegramId(userId);
        if (driver) {
            await setSession(userId, { lang, step: 'idle', driver_id: driver.id });
            await reply(chatId,
                T[lang].success_login.replace('{name}', driver.name || 'Driver'),
                mainMenu(lang, driver.status)
            );
        } else {
            await setSession(userId, { lang, step: 'awaiting_contact' });
            await reply(chatId, T[lang].contact_request, contactMenu(lang));
        }
        return;
    }

    // Contact shared
    if (contact) {
        const session = await getSession(userId);
        const lang = session?.lang || 'uz';
        const t = T[lang];

        if (contact.user_id && contact.user_id !== userId) {
            await reply(chatId, t.not_your_contact);
            return;
        }

        const driver = await findDriverByPhone(contact.phone_number);
        if (!driver) {
            await reply(chatId, t.driver_not_found, langMenu());
            return;
        }

        // Link telegram ID to driver
        await supabase.from('drivers')
            .update({ telegram: userId.toString() })
            .eq('id', driver.id);

        await setSession(userId, { lang, step: 'idle', driver_id: driver.id });
        await reply(chatId,
            t.success_login.replace('{name}', driver.name || 'Driver'),
            mainMenu(lang, driver.status)
        );
        return;
    }

    if (!text) return;

    // Load session + driver
    const session = await getSession(userId);
    const lang = session?.lang || 'uz';
    const t = T[lang];

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

    // ── Settings ──
    if (text === t.btn_settings) {
        await reply(chatId, T.uz.welcome, langMenu());
        return;
    }

    // ── Help ──
    if (text === t.btn_help) {
        await reply(chatId, t.help_text, mainMenu(lang, driver.status));
        return;
    }

    // ── Status toggle ──
    if (text === t.btn_start_work || text === t.btn_stop_work) {
        const newStatus = text === t.btn_start_work ? 'ACTIVE' : 'OFFLINE';
        await supabase.from('drivers').update({ status: newStatus }).eq('id', driver.id);
        driver.status = newStatus;
        const msg2 = newStatus === 'ACTIVE' ? t.status_active : t.status_offline;
        await reply(chatId, msg2, mainMenu(lang, newStatus));
        return;
    }

    // ── Income/Expense trigger ──
    if (text === t.btn_income) {
        await setSession(userId, { ...session, step: 'awaiting_amount', type: 'INCOME', driver_id: driver.id });
        await reply(chatId, t.ask_income, { remove_keyboard: true });
        return;
    }
    if (text === t.btn_expense) {
        await setSession(userId, { ...session, step: 'awaiting_expense_amount', type: 'EXPENSE', driver_id: driver.id });
        await reply(chatId, t.ask_expense, { remove_keyboard: true });
        return;
    }

    // ── Amount input ──
    if (session?.step === 'awaiting_amount' || session?.step === 'awaiting_expense_amount') {
        const amount = parseInt(text.replace(/\D/g, ''), 10);
        if (!amount || amount <= 0) {
            await reply(chatId, t.invalid_number);
            return;
        }
        const isExpense = session.type === 'EXPENSE';
        if (isExpense) {
            await setSession(userId, { ...session, step: 'awaiting_comment', temp_amount: amount });
            await reply(chatId, t.ask_comment, { remove_keyboard: true });
        } else {
            await saveTransaction(driver, amount, 'INCOME', '');
            const fmt = amount.toLocaleString('uz-UZ');
            await setSession(userId, { ...session, step: 'idle', temp_amount: null });
            await reply(chatId, t.saved_income.replace('{amount}', fmt), mainMenu(lang, driver.status));
        }
        return;
    }

    // ── Comment input ──
    if (session?.step === 'awaiting_comment') {
        const amount = session.temp_amount;
        const comment = text;
        await saveTransaction(driver, amount, 'EXPENSE', comment);
        const fmt = amount.toLocaleString('uz-UZ');
        await setSession(userId, { ...session, step: 'idle', temp_amount: null });
        await reply(chatId,
            t.saved_expense.replace('{amount}', fmt).replace('{comment}', comment),
            mainMenu(lang, driver.status)
        );
        return;
    }

    // Default
    await reply(chatId, '👇', mainMenu(lang, driver.status));
}

async function saveTransaction(driver, amount, type, comment) {
    await supabase.from('transactions').insert({
        driver_id: driver.id,
        driver_name: driver.name,
        amount: Math.abs(amount),
        type,
        category: 'Telegram',
        description: comment || '',
        status: 'COMPLETED',
        timestamp: Date.now(),
        source: 'bot',
    });
}

// ── Handler ─────────────────────────────────────────────────────────────────
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
