const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Telegraf, Markup } = require('telegraf');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// --- TRANSLATIONS & CONSTANTS ---
const SUPPORT_PHONE = "+998 93 748 91 41";

const TRANSLATIONS = {
    uz: {
        welcome: "🚖 **TAKSAPARK** tizimiga xush kelibsiz!\n\nIltimos, tilingizni tanlang:",
        share_contact: "📱 Telefon raqamni yuborish",
        contact_request: "Davom etish uchun telefon raqamingizni yuboring:",
        not_your_contact: "🚫 Iltimos, faqat o'zingizning raqamingizni yuboring.",
        driver_not_found: `🚫 Raqamingiz bazada topilmadi.\n\n📞 Admin: ${SUPPORT_PHONE}`,
        success_login: "✅ Xush kelibsiz, {name}!",
        btn_start_work: "🟢 Ishni Boshlash",
        btn_stop_work: "🔴 Ishni Yakunlash",
        btn_income: "💰 Kirim",
        btn_expense: "💸 Chiqim",
        btn_help: "🆘 Yordam",
        btn_settings: "🌐 Tilni o'zgartirish",
        status_to_active: "✅ Status o'zgartirildi: Hozir ishdasiz.",
        status_to_inactive: "✅ Status o'zgartirildi: Dam olishdasiz.",
        ask_income: "💰 Qancha summa topdingiz?\n(Faqat raqam, masalan: 50000)",
        ask_expense: "💸 Qancha xarajat qildingiz?\n(Faqat raqam, masalan: 15000)",
        ask_comment: "📝 Izoh qoldiring (masalan: Benzin, Tushlik):",
        invalid_number: "⚠️ Iltimos, to'g'ri summa yozing (faqat raqam).",
        saved_income: "✅ +{amount} so'm qabul qilindi.",
        saved_expense: "✅ -{amount} so'm qabul qilindi.\n📝 Izoh: {comment}",
        help_text: `📞 Admin: ${SUPPORT_PHONE}`,
        error_generic: "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.",
        need_start: "⚠️ Iltimos, botni qayta ishga tushiring: /start",
        lang_select: "🇺🇿 Tilni tanlang:",
        salary_received: "━━━━━━━━━━━━━━━━━━━━\n💸 *MAOSH TO'LANDI!* 💸\n━━━━━━━━━━━━━━━━━━━━\n\n🎉 Tabriklaymiz!\n\n💰 *Summa:* `{amount}`\n📅 *Sana:* {date}\n\n━━━━━━━━━━━━━━━━━━━━\n🚖 *TAKSAPARK* jamoasi bilan\nishlaganingiz uchun rahmat!\n\n⭐ Omad tilaymiz! ⭐\n━━━━━━━━━━━━━━━━━━━━"
    },
    ru: {
        welcome: "🚖 Добро пожаловать в **TAKSAPARK**!\n\nПожалуйста, выберите язык:",
        share_contact: "📱 Отправить номер",
        contact_request: "Для продолжения отправьте свой номер телефона:",
        not_your_contact: "🚫 Пожалуйста, отправьте только свой номер.",
        driver_not_found: `🚫 Ваш номер не найден в базе.\n\n📞 Админ: ${SUPPORT_PHONE}`,
        success_login: "✅ Добро пожаловать, {name}!",
        btn_start_work: "🟢 Начать работу",
        btn_stop_work: "🔴 Закончить работу",
        btn_income: "💰 Доход",
        btn_expense: "💸 Расход",
        btn_help: "🆘 Помощь",
        btn_settings: "🌐 Сменить язык",
        status_to_active: "✅ Статус изменен: Вы на работе.",
        status_to_inactive: "✅ Статус изменен: Вы отдыхаете.",
        ask_income: "💰 Сколько вы заработали?\n(Только цифры, например: 50000)",
        ask_expense: "💸 Сколько вы потратили?\n(Только цифры, например: 15000)",
        ask_comment: "📝 Напишите комментарий (например: Бензин, Обед):",
        invalid_number: "⚠️ Пожалуйста, введите корректную сумму (только цифры).",
        saved_income: "✅ +{amount} сум принято.",
        saved_expense: "✅ -{amount} сум принято.\n📝 Прим: {comment}",
        help_text: `📞 Админ: ${SUPPORT_PHONE}`,
        error_generic: "❌ Произошла ошибка. Попробуйте снова.",
        need_start: "⚠️ Пожалуйста, перезапустите бота: /start",
        lang_select: "🇷🇺 Выберите язык:",
        salary_received: "━━━━━━━━━━━━━━━━━━━━\n💸 *ЗАРПЛАТА ВЫПЛАЧЕНА!* 💸\n━━━━━━━━━━━━━━━━━━━━\n\n🎉 Поздравляем!\n\n💰 *Сумма:* `{amount}`\n📅 *Дата:* {date}\n\n━━━━━━━━━━━━━━━━━━━━\n🚖 Спасибо за работу с\n*TAKSAPARK*!\n\n⭐ Удачи на дорогах! ⭐\n━━━━━━━━━━━━━━━━━━━━"
    },
    en: {
        welcome: "🚖 Welcome to **TAKSAPARK**!\n\nPlease select your language:",
        share_contact: "📱 Share Contact",
        contact_request: "To proceed, please share your phone number:",
        not_your_contact: "🚫 Please share only your own contact.",
        driver_not_found: `🚫 Your number was not found.\n\n📞 Admin: ${SUPPORT_PHONE}`,
        success_login: "✅ Welcome, {name}!",
        btn_start_work: "🟢 Start Working",
        btn_stop_work: "🔴 Stop Working",
        btn_income: "💰 Income",
        btn_expense: "💸 Expense",
        btn_help: "🆘 Help",
        btn_settings: "🌐 Change Language",
        status_to_active: "✅ Status changed: You are Working.",
        status_to_inactive: "✅ Status changed: You are Resting.",
        ask_income: "💰 How much did you earn?\n(Numbers only, e.g., 50000)",
        ask_expense: "💸 How much did you spend?\n(Numbers only, e.g., 15000)",
        ask_comment: "📝 Enter a comment (e.g. Gas, Lunch):",
        invalid_number: "⚠️ Please enter a valid amount (numbers only).",
        saved_income: "✅ +{amount} UZS recorded.",
        saved_expense: "✅ -{amount} UZS recorded.\n📝 Note: {comment}",
        help_text: `📞 Admin: ${SUPPORT_PHONE}`,
        error_generic: "❌ An error occurred. Please try again.",
        need_start: "⚠️ Please restart the bot: /start",
        lang_select: "🇬🇧 Select language:",
        salary_received: "━━━━━━━━━━━━━━━━━━━━\n💸 *SALARY PAID!* 💸\n━━━━━━━━━━━━━━━━━━━━\n\n🎉 Congratulations!\n\n💰 *Amount:* `{amount}`\n📅 *Date:* {date}\n\n━━━━━━━━━━━━━━━━━━━━\n🚖 Thank you for being part of\nthe *TAKSAPARK* team!\n\n⭐ Good luck! ⭐\n━━━━━━━━━━━━━━━━━━━━"
    }
};

// Get bot token from Firebase config
const BOT_TOKEN = functions.config().telegram?.token || process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not configured!');
}

// Create bot instance
const bot = new Telegraf(BOT_TOKEN);

// --- HELPER FUNCTIONS ---

async function getSession(telegramId) {
    try {
        const docRef = db.collection('bot_sessions').doc(telegramId.toString());
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            return docSnap.data();
        }
        return null;
    } catch (e) {
        console.error('Session Get Error:', e);
        return null;
    }
}

async function updateSession(telegramId, data) {
    try {
        const docRef = db.collection('bot_sessions').doc(telegramId.toString());
        await docRef.set(data, { merge: true });
    } catch (e) {
        console.error('Session Update Error:', e);
    }
}

async function clearSession(telegramId) {
    try {
        await db.collection('bot_sessions').doc(telegramId.toString()).delete();
    } catch (e) {
        console.error('Session Clear Error:', e);
    }
}

async function verifyDrivers(phoneRaw) {
    const phoneNormalized = phoneRaw.replace(/\D/g, '');
    const suffix = phoneNormalized.slice(-9);
    const snapshot = await db.collectionGroup('drivers').get();
    const matches = [];
    snapshot.forEach(doc => {
        const d = doc.data();
        if (d.isDeleted) return;
        if (d.phone && d.phone.toString().replace(/\D/g, '').slice(-9) === suffix) {
            matches.push(doc);
        }
    });
    return matches;
}

async function findDriverByTelegramId(telegramId) {
    try {
        const snapshot = await db.collectionGroup('drivers').get();
        let match = null;
        const targetId = telegramId.toString();
        snapshot.forEach(doc => {
            if (match) return;
            const d = doc.data();
            if (d.isDeleted) return;
            if (d.telegramId && d.telegramId.toString() === targetId) {
                match = doc;
            }
        });
        return match;
    } catch (e) {
        console.error("findDriver error:", e);
        return null;
    }
}

function getMainMenu(lang, status) {
    const t = TRANSLATIONS[lang] || TRANSLATIONS.uz;
    const currentStatus = status || 'OFFLINE';
    const isActive = currentStatus === 'active' || currentStatus === 'ACTIVE';
    const toggleBtn = isActive ? t.btn_stop_work : t.btn_start_work;
    return Markup.keyboard([
        [toggleBtn],
        [t.btn_income, t.btn_expense],
        [t.btn_help, t.btn_settings]
    ]).resize();
}

async function saveTransaction(ctx, driver, amount, type, comment, lang, t) {
    try {
        const tid = ctx.from.id;
        let transactionsRef;
        const pathSegments = driver.ref.path.split('/');

        if (pathSegments.length > 2) {
            transactionsRef = driver.ref.parent.parent.collection('transactions');
        } else {
            transactionsRef = db.collection('transactions');
        }

        await transactionsRef.add({
            driverId: pathSegments[pathSegments.length - 1],
            driverName: driver.data().name || 'Driver',
            amount: Math.abs(amount),
            type: type,
            category: 'Telegram',
            description: comment || '',
            status: 'COMPLETED',
            timestamp: Date.now(),
            source: 'bot'
        });

        const fmt = amount.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU');
        const msg = type === 'INCOME' ? t.saved_income : t.saved_expense;

        await updateSession(tid, { step: 'idle' });
        const replyText = msg.replace('{amount}', fmt).replace('{comment}', comment);

        return ctx.reply(replyText, getMainMenu(lang, driver.data().status));

    } catch (e) {
        console.error("Trans Error:", e);
        return ctx.reply(t.error_generic, getMainMenu(lang, driver.data().status));
    }
}

// --- BOT HANDLERS ---

// 1. /start
bot.start(async (ctx) => {
    if (!ctx.from) return;
    const id = ctx.from.id;
    await clearSession(id);
    ctx.reply(TRANSLATIONS.uz.welcome, Markup.keyboard([["🇺🇿 O'zbekcha", "🇷🇺 Русский", "🇬🇧 English"]]).resize().oneTime());
});

// 2. Language selection
bot.hears(["🇺🇿 O'zbekcha", "🇷🇺 Русский", "🇬🇧 English"], async (ctx) => {
    const text = ctx.message.text;
    let lang = 'uz';
    if (text.includes('Русский')) lang = 'ru';
    if (text.includes('English')) lang = 'en';

    await updateSession(ctx.from.id, { lang, step: 'awaiting_contact' });

    // Check if already registered
    const driver = await findDriverByTelegramId(ctx.from.id);
    if (driver) {
        const dData = driver.data();
        await driver.ref.update({ language: lang });
        const name = dData.name || 'Driver';
        return ctx.reply(TRANSLATIONS[lang].success_login.replace('{name}', name), getMainMenu(lang, dData.status));
    }

    const t = TRANSLATIONS[lang];
    ctx.reply(t.contact_request, Markup.keyboard([Markup.button.contactRequest(t.share_contact)]).resize().oneTime());
});

// 3. Contact sharing
bot.on('contact', async (ctx) => {
    const tid = ctx.from.id;
    const contact = ctx.message.contact;
    const session = await getSession(tid);
    const lang = session?.lang || 'uz';
    const t = TRANSLATIONS[lang];

    if (contact.user_id && contact.user_id !== tid) {
        return ctx.reply(t.not_your_contact);
    }

    const matchingDrivers = await verifyDrivers(contact.phone_number);

    if (matchingDrivers.length === 0) {
        return ctx.reply(t.driver_not_found);
    }

    // Single match - register directly
    if (matchingDrivers.length === 1) {
        const driverDoc = matchingDrivers[0];
        await driverDoc.ref.update({
            telegramId: tid.toString(),
            language: lang,
            lastActive: admin.firestore.FieldValue.serverTimestamp()
        });

        const dData = driverDoc.data();
        await updateSession(tid, { lang, step: 'idle' });
        const name = dData.name || 'Driver';
        return ctx.reply(t.success_login.replace('{name}', name), getMainMenu(lang, dData.status));
    }

    // Multiple matches - show selection buttons
    const selectMessage = lang === 'uz'
        ? `📋 Ushbu raqam bilan ${matchingDrivers.length} ta haydovchi topildi.\n\nQaysi biri siz?`
        : lang === 'ru'
            ? `📋 Найдено ${matchingDrivers.length} водителей с этим номером.\n\nКто вы?`
            : `📋 Found ${matchingDrivers.length} drivers with this number.\n\nWhich one are you?`;

    // Store pending drivers in session
    const driverOptions = matchingDrivers.map((doc, idx) => ({
        id: doc.id,
        path: doc.ref.path,
        name: doc.data().name || 'Driver'
    }));

    await updateSession(tid, {
        lang,
        step: 'awaiting_driver_selection',
        pendingDrivers: driverOptions
    });

    // Create inline keyboard with driver names
    const buttons = driverOptions.map(d => [
        Markup.button.callback(`👤 ${d.name}`, `select_driver:${d.id}`)
    ]);

    return ctx.reply(selectMessage, Markup.inlineKeyboard(buttons));
});

// 3b. Handle driver selection callback
bot.action(/^select_driver:(.+)$/, async (ctx) => {
    const tid = ctx.from.id;
    const selectedDriverId = ctx.match[1];
    const session = await getSession(tid);
    const lang = session?.lang || 'uz';
    const t = TRANSLATIONS[lang];

    if (session?.step !== 'awaiting_driver_selection' || !session?.pendingDrivers) {
        return ctx.answerCbQuery(lang === 'uz' ? 'Xatolik. Qaytadan /start bosing.' : 'Error. Please /start again.');
    }

    // Find the selected driver from session
    const selectedDriver = session.pendingDrivers.find(d => d.id === selectedDriverId);
    if (!selectedDriver) {
        return ctx.answerCbQuery(lang === 'uz' ? 'Haydovchi topilmadi' : 'Driver not found');
    }

    try {
        // Update driver with telegram ID
        const driverRef = db.doc(selectedDriver.path);
        await driverRef.update({
            telegramId: tid.toString(),
            language: lang,
            lastActive: admin.firestore.FieldValue.serverTimestamp()
        });

        // Get driver data for status
        const driverSnap = await driverRef.get();
        const dData = driverSnap.data();

        // Clear session and set to idle
        await updateSession(tid, { lang, step: 'idle', pendingDrivers: null });

        // Answer callback and send welcome message
        await ctx.answerCbQuery('✅');
        await ctx.deleteMessage(); // Remove the selection buttons

        const name = selectedDriver.name || 'Driver';
        return ctx.reply(t.success_login.replace('{name}', name), getMainMenu(lang, dData?.status));
    } catch (error) {
        console.error('Driver selection error:', error);
        return ctx.answerCbQuery(t.error_generic);
    }
});

// 4. Text message handler
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;
    const tid = ctx.from.id;

    const driver = await findDriverByTelegramId(tid);
    const session = await getSession(tid);

    if (!driver) {
        if (session?.step === 'awaiting_contact') return ctx.reply("👇");
        const isLang = ["🇺🇿 O'zbekcha", "🇷🇺 Русский", "🇬🇧 English"].includes(text);
        if (!isLang) return ctx.reply(TRANSLATIONS.uz.need_start);
        return;
    }

    const dData = driver.data();
    const lang = dData.language || session?.lang || 'uz';
    const t = TRANSLATIONS[lang];

    // Settings
    if (text === t.btn_settings) {
        return ctx.reply(t.lang_select, Markup.keyboard([["🇺🇿 O'zbekcha", "🇷🇺 Русский", "🇬🇧 English"]]).resize().oneTime());
    }

    // Status Toggle
    if (text === t.btn_start_work || text === t.btn_stop_work) {
        const newStatus = text === t.btn_start_work ? 'ACTIVE' : 'OFFLINE';
        const reply = newStatus === 'ACTIVE' ? t.status_to_active : t.status_to_inactive;
        await driver.ref.update({ status: newStatus });
        return ctx.reply(reply, getMainMenu(lang, newStatus));
    }

    // Income/Expense
    if (text === t.btn_income) {
        await updateSession(tid, { lang, step: 'awaiting_amount', type: 'INCOME' });
        return ctx.reply(t.ask_income, Markup.removeKeyboard());
    }
    if (text === t.btn_expense) {
        await updateSession(tid, { lang, step: 'awaiting_amount', type: 'EXPENSE' });
        return ctx.reply(t.ask_expense, Markup.removeKeyboard());
    }

    // Help
    if (text === t.btn_help) return ctx.reply(t.help_text);

    // Transaction Flow - Amount
    if (session && session.step === 'awaiting_amount') {
        const amtStr = text.replace(/[^\d]/g, '');
        const amount = parseInt(amtStr);
        if (!amount || amount <= 0) return ctx.reply(t.invalid_number);

        const isExpense = session.type === 'EXPENSE';

        if (isExpense) {
            await updateSession(tid, {
                ...session,
                step: 'awaiting_comment',
                tempAmount: amount
            });
            return ctx.reply(t.ask_comment);
        } else {
            await saveTransaction(ctx, driver, amount, 'INCOME', '', lang, t);
            return;
        }
    }

    // Transaction Flow - Comment
    if (session && session.step === 'awaiting_comment') {
        const amount = session.tempAmount;
        const type = session.type || 'EXPENSE';
        const comment = text;
        await saveTransaction(ctx, driver, amount, type, comment, lang, t);
        return;
    }

    return ctx.reply("👇", getMainMenu(lang, dData.status));
});

// --- WEBHOOK CLOUD FUNCTION ---
exports.telegramBot = functions.https.onRequest(async (req, res) => {
    console.log('📩 Received webhook request');

    if (req.method !== 'POST') {
        return res.status(200).send('Bot is running');
    }

    try {
        await bot.handleUpdate(req.body);
        res.status(200).send('OK');
    } catch (error) {
        console.error('❌ Error handling update:', error);
        res.status(500).send('Error');
    }
});

// --- SALARY NOTIFICATION FUNCTION (Called from your app) ---
exports.sendSalaryNotification = functions.https.onRequest(async (req, res) => {
    // Enable CORS for all responses
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }

    const { driverId, amount, date } = req.body;

    if (!driverId || !amount || !date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        console.log(`📩 Salary notification request: driverId=${driverId}, amount=${amount}, date=${date}`);

        // Find driver using collectionGroup to search all fleets
        let driverDoc;
        const snapshot = await db.collectionGroup('drivers').get();
        console.log(`🔍 Found ${snapshot.size} total drivers in database`);

        snapshot.forEach(d => {
            if (d.id === driverId) {
                console.log(`✅ Found matching driver: ${d.id} at path ${d.ref.path}`);
                driverDoc = d;
            }
        });

        if (!driverDoc) {
            console.warn(`❌ Driver not found: ${driverId}`);
            return res.status(404).json({ error: 'Driver not found', driverId });
        }

        const data = driverDoc.data();
        const telegramId = data.telegramId;
        console.log(`👤 Driver data: name=${data.name}, telegramId=${telegramId || 'NOT LINKED'}`);

        if (!telegramId) {
            console.warn(`❌ Driver ${driverId} has no telegramId linked`);
            return res.status(400).json({ error: 'Telegram not linked', driverName: data.name });
        }

        const lang = data.language || 'uz';
        const t = TRANSLATIONS[lang] || TRANSLATIONS.uz;
        const fmtAmount = amount.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU') + (lang === 'en' ? ' UZS' : " so'm");

        const message = t.salary_received
            .replace('{amount}', fmtAmount)
            .replace('{date}', date);

        console.log(`📤 Sending message to telegramId=${telegramId}`);
        await bot.telegram.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
        console.log(`✅ Message sent successfully!`);

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Notification error:', error);
        res.status(500).json({ error: error.message });
    }
});
