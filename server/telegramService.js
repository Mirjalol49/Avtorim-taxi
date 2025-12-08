const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');

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

        // Menu
        btn_start_work: "🟢 Ishni Boshlash",
        btn_stop_work: "🔴 Ishni Yakunlash",
        btn_income: "💰 Kirim",
        btn_expense: "💸 Chiqim",
        btn_help: "🆘 Yordam",

        // Responses
        status_to_active: "✅ Status o'zgartirildi: Hozir ishdasiz.",
        status_to_inactive: "✅ Status o'zgartirildi: Dam olishdasiz.",
        ask_income: "💰 Qancha summa topdingiz?\n(Faqat raqam, masalan: 50000)",
        ask_expense: "💸 Qancha xarajat qildingiz?\n(Faqat raqam, masalan: 15000)",
        invalid_number: "⚠️ Iltimos, to'g'ri summa yozing (faqat raqam).",
        saved_income: "✅ +{amount} so'm qabul qilindi.",
        saved_expense: "✅ -{amount} so'm qabul qilindi.",
        help_text: `📞 Admin: ${SUPPORT_PHONE}`,
        error_generic: "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.",
        need_start: "⚠️ Iltimos, botni qayta ishga tushiring: /start"
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

        status_to_active: "✅ Статус изменен: Вы на работе.",
        status_to_inactive: "✅ Статус изменен: Вы отдыхаете.",
        ask_income: "💰 Сколько вы заработали?\n(Только цифры, например: 50000)",
        ask_expense: "💸 Сколько вы потратили?\n(Только цифры, например: 15000)",
        invalid_number: "⚠️ Пожалуйста, введите корректную сумму (только цифры).",
        saved_income: "✅ +{amount} сум принято.",
        saved_expense: "✅ -{amount} сум принято.",
        help_text: `📞 Админ: ${SUPPORT_PHONE}`,
        error_generic: "❌ Произошла ошибка. Попробуйте снова.",
        need_start: "⚠️ Пожалуйста, перезапустите бота: /start"
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

        status_to_active: "✅ Status changed: You are Working.",
        status_to_inactive: "✅ Status changed: You are Resting.",
        ask_income: "💰 How much did you earn?\n(Numbers only, e.g., 50000)",
        ask_expense: "💸 How much did you spend?\n(Numbers only, e.g., 15000)",
        invalid_number: "⚠️ Please enter a valid amount (numbers only).",
        saved_income: "✅ +{amount} UZS recorded.",
        saved_expense: "✅ -{amount} UZS recorded.",
        help_text: `📞 Admin: ${SUPPORT_PHONE}`,
        error_generic: "❌ An error occurred. Please try again.",
        need_start: "⚠️ Please restart the bot: /start"
    }
};

class TelegramService {
    constructor(token, db) {
        if (!token) {
            console.warn('⚠️ Telegram Bot token not provided.');
            return;
        }

        this.bot = new Telegraf(token);
        this.db = db;
        this.setupHandlers();

        // Graceful stop
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));

        this.bot.launch().then(() => {
            console.log('✅ Telegram Bot launched successfully (TAKSAPARK Premium)');
        }).catch(err => {
            console.error('❌ Failed to launch Telegram Bot:', err);
        });
    }

    setupHandlers() {
        // Hydrate context with helper
        this.bot.use(async (ctx, next) => {
            ctx.safeReply = async (text, extra) => {
                try {
                    return await ctx.reply(text, extra);
                } catch (e) {
                    console.error("Reply error:", e);
                }
            };
            return next();
        });

        // 1. /start - Language Selection
        this.bot.start(async (ctx) => {
            if (!ctx.from) return;
            await this.clearSessionState(ctx.from.id);
            // Default to uz for the initial message or English, let's use Uz as base
            ctx.safeReply(
                TRANSLATIONS.uz.welcome,
                Markup.keyboard([
                    ['🇺🇿 O\'zbekcha', '🇷🇺 Русский', '🇬🇧 English']
                ]).resize().oneTime()
            );
        });

        // 2. Language Handlers
        this.bot.hears(['🇺🇿 O\'zbekcha', '🇷🇺 Русский', '🇬🇧 English'], async (ctx) => {
            const text = ctx.message.text;
            let lang = 'uz';
            if (text.includes('Русский')) lang = 'ru';
            if (text.includes('English')) lang = 'en';

            await this.setSessionData(ctx.from.id, { lang: lang, step: 'awaiting_contact' });

            const t = TRANSLATIONS[lang];
            ctx.safeReply(t.contact_request, Markup.keyboard([
                Markup.button.contactRequest(t.share_contact)
            ]).resize().oneTime());
        });

        // 3. Contact Verification
        this.bot.on('contact', async (ctx) => {
            const telegramId = ctx.from.id;
            const contact = ctx.message.contact;

            // Get lang from session
            const session = await this.getSessionData(telegramId);
            const lang = session?.lang || 'uz';
            const t = TRANSLATIONS[lang];

            // Verify ownership
            if (contact.user_id && contact.user_id !== telegramId) {
                return ctx.safeReply(t.not_your_contact);
            }

            // Robust Match
            const driverDoc = await this.verifyDriver(contact.phone_number);

            if (!driverDoc) {
                return ctx.safeReply(t.driver_not_found);
            }

            // Update Driver
            await driverDoc.ref.update({
                telegramId: telegramId.toString(),
                language: lang,
                lastActive: admin.firestore.FieldValue.serverTimestamp()
            });

            // Set session to idle
            await this.setSessionData(telegramId, { lang, step: 'idle', driverId: driverDoc.id });

            const data = driverDoc.data();
            const name = data.firstName || data.name || 'Driver';
            const status = data.status || 'inactive';

            // Welcome + Menu
            ctx.safeReply(
                t.success_login.replace('{name}', name),
                await this.getMainMenu(lang, status)
            );
        });

        // 4. MAIN MENU & STATUS TOGGLE
        // We listen for ALL language variants of buttons
        this.bot.on('text', async (ctx, next) => {
            const text = ctx.message.text;
            // Filter out commands
            if (text.startsWith('/')) return next();

            const telegramId = ctx.from.id;
            // We need to know who this is to handle menu clicks context-aware
            const driverDoc = await this.findDriverByTelegramId(telegramId);

            if (!driverDoc) {
                // Check if we are in onboarding session?
                const session = await this.getSessionData(telegramId);
                if (session && session.step === 'awaiting_contact') {
                    // Ignore text, waiting for contact
                    return ctx.safeReply("👇");
                }
                // If no session and no driver doc, guid to start
                const isLangBtn = ['🇺🇿 O\'zbekcha', '🇷🇺 Русский', '🇬🇧 English'].includes(text);
                if (!isLangBtn) return ctx.safeReply(TRANSLATIONS.uz.need_start);
                return next(); // Pass to lang handler if it was that
            }

            const data = driverDoc.data();
            const lang = data.language || 'uz';
            const t = TRANSLATIONS[lang];

            // --- TOGGLE LOGIC ---
            if (text === t.btn_start_work || text === t.btn_stop_work) {
                const currentStatus = data.status || 'inactive';
                let newStatus = 'active';
                let replyMsg = '';

                // If currently active, button shown was "Stop Work"
                // If currently inactive, button shown was "Start Work"
                if (text === t.btn_start_work) {
                    newStatus = 'active';
                    replyMsg = t.status_to_active;
                } else {
                    newStatus = 'inactive';
                    replyMsg = t.status_to_inactive;
                }

                // Update DB
                await driverDoc.ref.update({ status: newStatus });
                // Reply & Update Keyboard
                return ctx.safeReply(replyMsg, await this.getMainMenu(lang, newStatus));
            }

            // --- INCOME / EXPENSE REQUEST ---
            if (text === t.btn_income) {
                await this.setSessionData(telegramId, { lang, step: 'awaiting_income' });
                return ctx.safeReply(t.ask_income, Markup.removeKeyboard());
            }
            if (text === t.btn_expense) {
                await this.setSessionData(telegramId, { lang, step: 'awaiting_expense' });
                return ctx.safeReply(t.ask_expense, Markup.removeKeyboard());
            }

            // --- SUPPORT ---
            if (text === t.btn_help) {
                return ctx.safeReply(t.help_text);
            }

            // --- TRANSACTION INPUT HANDLING ---
            const session = await this.getSessionData(telegramId);
            if (session && (session.step === 'awaiting_income' || session.step === 'awaiting_expense')) {
                const type = session.step === 'awaiting_income' ? 'income' : 'expense';

                // Validate
                let amountStr = text.replace(/[^\d]/g, ''); // strip all non-digits
                let amount = parseInt(amountStr);

                if (!amount || amount <= 0) {
                    return ctx.safeReply(t.invalid_number);
                }

                // Save
                try {
                    let transactionsRef;
                    if (driverDoc.ref.parent.parent) {
                        transactionsRef = driverDoc.ref.parent.parent.collection('transactions');
                    } else {
                        transactionsRef = this.db.collection('transactions');
                    }

                    await transactionsRef.add({
                        driverId: driverDoc.id,
                        driverName: data.firstName || data.name || 'Driver',
                        amount: amount,
                        type: type,
                        category: 'Telegram',
                        status: 'completed',
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        date: new Date().toISOString(),
                        source: 'bot'
                    });

                    // Success
                    const fmt = amount.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU');
                    const msg = type === 'income' ? t.saved_income : t.saved_expense;

                    await this.setSessionData(telegramId, { lang, step: 'idle' });

                    // Respond and restore menu
                    return ctx.safeReply(msg.replace('{amount}', fmt), await this.getMainMenu(lang, data.status));

                } catch (e) {
                    console.error("Trans save error:", e);
                    return ctx.safeReply(t.error_generic, await this.getMainMenu(lang, data.status));
                }
            }

            // If nothing matched, show menu again
            return ctx.safeReply("👇", await this.getMainMenu(lang, data.status));
        });
    }

    // --- HELPERS ---

    async getMainMenu(lang, status) {
        const t = TRANSLATIONS[lang] || TRANSLATIONS.uz;
        const currentStatus = status || 'inactive';

        // Row 1: Toggle
        // If inactive -> Show "Start Work" (Green)
        // If active -> Show "Stop Work" (Red)
        const toggleBtn = currentStatus === 'active' ? t.btn_stop_work : t.btn_start_work;

        return Markup.keyboard([
            [toggleBtn],
            [t.btn_income, t.btn_expense],
            [t.btn_help]
        ]).resize();
    }

    async verifyDriver(phoneRaw) {
        const phoneNormalized = phoneRaw.replace(/\D/g, '');
        const suffix = phoneNormalized.slice(-9);

        const snapshot = await this.db.collectionGroup('drivers').get();
        let match = null;

        snapshot.forEach(doc => {
            if (match) return;
            const d = doc.data();
            if (d.phone) {
                const dPhone = d.phone.toString().replace(/\D/g, '');
                if (dPhone.slice(-9) === suffix) {
                    match = doc;
                }
            }
        });
        return match;
    }

    async findDriverByTelegramId(telegramId) {
        const snapshot = await this.db.collectionGroup('drivers')
            .where('telegramId', '==', telegramId.toString())
            .limit(1)
            .get();
        if (snapshot.empty) return null;
        return snapshot.docs[0];
    }

    async setSessionData(telegramId, data) {
        try {
            await this.db.collection('bot_sessions').doc(telegramId.toString()).set(data, { merge: true });
        } catch (e) {
            console.error("Session Set Error:", e);
        }
    }

    async getSessionData(telegramId) {
        try {
            const doc = await this.db.collection('bot_sessions').doc(telegramId.toString()).get();
            return doc.exists ? doc.data() : null;
        } catch (e) { return null; }
    }

    async clearSessionState(telegramId) {
        try {
            await this.db.collection('bot_sessions').doc(telegramId.toString()).delete();
        } catch (e) { }
    }
}

module.exports = TelegramService;
