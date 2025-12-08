const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');

// --- TRANSLATIONS ---
const TRANSLATIONS = {
    uz: {
        welcome: "Assalomu alaykum! 🚕\n\nAvtorim Taxi Premium botiga xush kelibsiz.\nIltimos, tilingizni tanlang:",
        share_contact: "📱 Telefon raqamni yuborish",
        contact_request: "Davom etish uchun telefon raqamingizni yuboring:",
        not_your_contact: "🚫 Iltimos, faqat o'zingizning raqamingizni yuboring.",
        driver_not_found: "🚫 Raqamingiz bazada topilmadi.\nIltimos, rahbar bilan bog'laning.",
        success_login: "✅ Xush kelibsiz, {name}!\nSiz tizimga muvaffaqiyatli ulandingiz.",
        menu_income: "💰 Kirim",
        menu_expense: "💸 Chiqim",
        menu_working: "🟢 Ishlayapman",
        menu_resting: "🔴 Dam olyapman",
        status_working: "✅ Siz hozir ISH rejimidasiz. Yaxshi ish kunini tilaymiz! 🚀",
        status_resting: "✅ Siz hozir DAM OLISH rejimidasiz. Maroqli hordiq! ☕️",
        ask_income: "💰 Qancha summa topdingiz?\n(Faqat raqam yozing, masalan: 50000)",
        ask_expense: "💸 Qancha xarajat qildingiz?\n(Faqat raqam yozing, masalan: 15000)",
        invalid_number: "⚠️ Iltimos, to'g'ri summa yozing (faqat raqam).",
        saved_income: "✅ +{amount} so'm kirim yozildi.",
        saved_expense: "✅ -{amount} so'm chiqim yozildi.",
        error_generic: "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.",
        need_start: "⚠️ Iltimos, botni qayta ishga tushiring: /start"
    },
    ru: {
        welcome: "Здравствуйте! 🚕\n\nДобро пожаловать в Avtorim Taxi Premium.\nПожалуйста, выберите язык:",
        share_contact: "📱 Отправить номер",
        contact_request: "Для продолжения отправьте свой номер телефона:",
        not_your_contact: "🚫 Пожалуйста, отправьте только свой номер.",
        driver_not_found: "🚫 Ваш номер не найден в базе.\nПожалуйста, свяжитесь с администратором.",
        success_login: "✅ Добро пожаловать, {name}!\nВы успешно вошли в систему.",
        menu_income: "💰 Доход",
        menu_expense: "💸 Расход",
        menu_working: "🟢 Работаю",
        menu_resting: "🔴 Отдыхаю",
        status_working: "✅ Вы сейчас в режиме РАБОТЫ. Удачного дня! 🚀",
        status_resting: "✅ Вы сейчас в режиме ОТДЫХА. Хорошего отдыха! ☕️",
        ask_income: "💰 Сколько вы заработали?\n(Пишите только цифры, например: 50000)",
        ask_expense: "💸 Сколько вы потратили?\n(Пишите только цифры, например: 15000)",
        invalid_number: "⚠️ Пожалуйста, введите корректную сумму (только цифры).",
        saved_income: "✅ +{amount} сум записано.",
        saved_expense: "✅ -{amount} сум списано.",
        error_generic: "❌ Произошла ошибка. Попробуйте снова.",
        need_start: "⚠️ Пожалуйста, перезапустите бота: /start"
    },
    en: {
        welcome: "Hello! 🚕\n\nWelcome to Avtorim Taxi Premium.\nPlease select your language:",
        share_contact: "📱 Share Contact",
        contact_request: "To proceed, please share your phone number:",
        not_your_contact: "🚫 Please share only your own contact.",
        driver_not_found: "🚫 Your number was not found in the database.\nPlease contact support.",
        success_login: "✅ Welcome, {name}!\nYou have successfully logged in.",
        menu_income: "💰 Income",
        menu_expense: "💸 Expense",
        menu_working: "🟢 I am Working",
        menu_resting: "🔴 I am Resting",
        status_working: "✅ You are now in WORKING mode. Have a great day! 🚀",
        status_resting: "✅ You are now in RESTING mode. Enjoy your break! ☕️",
        ask_income: "💰 How much did you earn?\n(Enter numbers only, e.g., 50000)",
        ask_expense: "💸 How much did you spend?\n(Enter numbers only, e.g., 15000)",
        invalid_number: "⚠️ Please enter a valid amount (numbers only).",
        saved_income: "✅ +{amount} UZS recorded.",
        saved_expense: "✅ -{amount} UZS recorded.",
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
            console.log('✅ Telegram Bot launched successfully (Premium Version)');
        }).catch(err => {
            console.error('❌ Failed to launch Telegram Bot:', err);
        });
    }

    setupHandlers() {
        // middleware to hydrate context with translation helper
        this.bot.use(async (ctx, next) => {
            const userId = ctx.from?.id;
            // Attach 't' function
            ctx.t = async (key, params = {}) => {
                let lang = 'uz'; // Default
                if (userId) {
                    const s = await this.getSessionData(userId);
                    if (s && s.lang) lang = s.lang;
                }
                let text = TRANSLATIONS[lang][key] || TRANSLATIONS['uz'][key] || key;
                Object.keys(params).forEach(k => {
                    text = text.replace(`{${k}}`, params[k]);
                });
                return text;
            };
            return next();
        });

        // 1. /start - Language Selection
        this.bot.start(async (ctx) => {
            if (!ctx.from) return;
            await this.clearSessionState(ctx.from.id);
            // Default welcome in Uzbek/Russian mix or just Uzbek as entry point
            ctx.reply(
                TRANSLATIONS.uz.welcome,
                Markup.keyboard([
                    ['🇺🇿 O\'zbekcha', '🇷🇺 Русский', '🇬🇧 English']
                ]).resize().oneTime()
            );
        });

        // 2. Language Selection Handlers
        this.bot.hears(['🇺🇿 O\'zbekcha', '🇷🇺 Русский', '🇬🇧 English'], async (ctx) => {
            const text = ctx.message.text;
            let lang = 'uz';
            if (text.includes('Русский')) lang = 'ru';
            if (text.includes('English')) lang = 'en';

            await this.setSessionData(ctx.from.id, { lang: lang, step: 'awaiting_contact' });

            // Ask for phone in selected language
            const msg = TRANSLATIONS[lang].contact_request;
            const btnText = TRANSLATIONS[lang].share_contact;

            ctx.reply(msg, Markup.keyboard([
                Markup.button.contactRequest(btnText)
            ]).resize().oneTime());
        });

        // 3. Contact Verification
        this.bot.on('contact', async (ctx) => {
            const telegramId = ctx.from.id;
            const contact = ctx.message.contact;

            // Re-fetch lang
            const session = await this.getSessionData(telegramId);
            const lang = session?.lang || 'uz';

            // Allow user to share ONLY their own contact
            if (contact.user_id && contact.user_id !== telegramId) {
                return ctx.reply(TRANSLATIONS[lang].not_your_contact);
            }

            // Verify Driver
            const driverDoc = await this.verifyDriver(contact.phone_number);

            if (!driverDoc) {
                return ctx.reply(TRANSLATIONS[lang].driver_not_found);
            }

            // Update Driver with TelegramID & Language
            await driverDoc.ref.update({
                telegramId: telegramId.toString(),
                language: lang,
                lastActive: admin.firestore.FieldValue.serverTimestamp()
            });

            const driverData = driverDoc.data();
            const name = driverData.firstName || driverData.name || 'Driver';

            // Update session to 'authenticated'
            await this.setSessionData(telegramId, { lang: lang, step: 'idle', driverId: driverDoc.id });

            // Send Welcome & Dashboard
            const dash = await this.getDashboardKeyboard(lang, driverData.status);
            ctx.reply(
                TRANSLATIONS[lang].success_login.replace('{name}', name),
                dash
            );
        });

        // 4. Dashboard Actions (Status Toggle)
        // We match ALL languages because user might change language or we need to be safe
        const workingKeywords = [TRANSLATIONS.uz.menu_working, TRANSLATIONS.ru.menu_working, TRANSLATIONS.en.menu_working];
        const restingKeywords = [TRANSLATIONS.uz.menu_resting, TRANSLATIONS.ru.menu_resting, TRANSLATIONS.en.menu_resting];

        this.bot.hears([...workingKeywords, ...restingKeywords], async (ctx) => {
            const telegramId = ctx.from.id;
            const driverDoc = await this.findDriverByTelegramId(telegramId);

            if (!driverDoc) return ctx.reply(TRANSLATIONS.uz.need_start);

            const data = driverDoc.data();
            const lang = data.language || 'uz'; // Use driver's saved language

            // Update session lang just in case
            await this.setSessionData(telegramId, { lang });

            let newStatus = 'active';
            let replyMsg = '';

            const text = ctx.message.text;

            // If user clicked "I am Working" (Green), it means they want to work (Active)
            if (workingKeywords.includes(text)) {
                newStatus = 'active';
                replyMsg = TRANSLATIONS[lang].status_working;
            } else {
                // "I am Resting" (Red) -> Inactive
                newStatus = 'inactive';
                replyMsg = TRANSLATIONS[lang].status_resting;
            }

            // Update Firestore
            await driverDoc.ref.update({ status: newStatus });

            // Refresh Keyboard
            ctx.reply(replyMsg, await this.getDashboardKeyboard(lang, newStatus));
        });

        // 5. Income / Expense Start
        const incomeKeywords = [TRANSLATIONS.uz.menu_income, TRANSLATIONS.ru.menu_income, TRANSLATIONS.en.menu_income];
        const expenseKeywords = [TRANSLATIONS.uz.menu_expense, TRANSLATIONS.ru.menu_expense, TRANSLATIONS.en.menu_expense];

        this.bot.hears([...incomeKeywords, ...expenseKeywords], async (ctx) => {
            const telegramId = ctx.from.id;
            const text = ctx.message.text;

            const driverDoc = await this.findDriverByTelegramId(telegramId);
            if (!driverDoc) return ctx.reply(TRANSLATIONS.uz.need_start);

            const lang = driverDoc.data().language || 'uz';
            let action = 'income';
            let msg = TRANSLATIONS[lang].ask_income;

            if (expenseKeywords.includes(text)) {
                action = 'expense';
                msg = TRANSLATIONS[lang].ask_expense;
            }

            await this.setSessionData(telegramId, { lang, step: `awaiting_${action}`, action: action });
            // Should we remove keyboard? Sometimes easier for user to cancel by clicking 'Status'
            // But prompt says "Ask for amount... Validate input". 
            // Let's remove keyboard to force focus, or keep it. Removing is cleaner for "Input mode".
            ctx.reply(msg, Markup.removeKeyboard());
        });

        // 6. Handle Numeric Input for Transactions
        this.bot.on('text', async (ctx) => {
            const telegramId = ctx.from.id;
            const text = ctx.message.text;

            // Ignore commands
            if (text.startsWith('/')) return;

            // Check if it matches any menu button (in case they typed it manually or lag)
            const allKeywords = [...workingKeywords, ...restingKeywords, ...incomeKeywords, ...expenseKeywords];
            if (allKeywords.includes(text)) return;

            const session = await this.getSessionData(telegramId);
            if (!session || !session.step || !session.step.startsWith('awaiting_')) {
                // Not awaiting input. 
                // If authenticated, show dashboard.
                const driverDoc = await this.findDriverByTelegramId(telegramId);
                if (driverDoc) {
                    const d = driverDoc.data();
                    const lang = d.language || 'uz';
                    // Just acknowledge or re-show menu
                    return ctx.reply("👇", await this.getDashboardKeyboard(lang, d.status));
                }
                return;
            }

            const lang = session.lang || 'uz';

            // Validate Number
            const amountStr = text.replace(/\D/g, '');
            const amount = parseInt(amountStr);

            if (!amount || amount <= 0) {
                return ctx.reply(TRANSLATIONS[lang].invalid_number);
            }

            // Save Transaction
            try {
                const driverDoc = await this.findDriverByTelegramId(telegramId);
                if (!driverDoc) return ctx.reply(TRANSLATIONS[lang].need_start);

                const driverData = driverDoc.data();
                const type = session.action; // income or expense

                // Determine collection
                let transactionsRef;
                if (driverDoc.ref.parent.parent) {
                    // Fleet driver
                    transactionsRef = driverDoc.ref.parent.parent.collection('transactions');
                } else {
                    // Root driver
                    transactionsRef = this.db.collection('transactions');
                }

                await transactionsRef.add({
                    driverId: driverDoc.id,
                    driverName: driverData.firstName || driverData.name || 'Driver',
                    amount: amount,
                    type: type, // 'income' | 'expense'
                    category: 'Telegram',
                    date: new Date().toISOString(),
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    source: 'bot'
                });

                // Clear session step but keep lang
                await this.setSessionData(telegramId, { lang, step: 'idle' });

                const fmtAmount = amount.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU');
                const successMsgKey = type === 'income' ? 'saved_income' : 'saved_expense';

                ctx.reply(
                    TRANSLATIONS[lang][successMsgKey].replace('{amount}', fmtAmount),
                    await this.getDashboardKeyboard(lang, driverData.status)
                );

            } catch (err) {
                console.error('Transaction Error:', err);
                ctx.reply(TRANSLATIONS[lang].error_generic);
            }
        });
    }

    // --- HELPERS ---

    async getDashboardKeyboard(lang, status) {
        const l = TRANSLATIONS[lang] || TRANSLATIONS['uz'];

        // Status: 'active' (Working) vs 'inactive' (Resting)
        // If 'active', button should let them STOP (Resting icon)
        // If 'inactive', button should let them START (Working icon)
        // Wait, prompt specific requirement: 
        // "If status === 'active', show the '🔴 Stop Working' button." (which is menu_resting logic?)
        // Actually lets look at translation keys:
        // menu_working: "🟢 Ishlayapman" (I am working)
        // menu_resting: "🔴 Dam olyapman" (I am resting)

        // Logic: 
        // IF I am active, I am working. So the button should say "🔴 Dam olyapman" (Switch to resting).
        // IF I am inactive, I am resting. So the button should say "🟢 Ishlayapman" (Switch to working).

        let statusBtn = '';
        if (status === 'active') {
            statusBtn = l.menu_resting;
        } else {
            statusBtn = l.menu_working;
        }

        return Markup.keyboard([
            [l.menu_income, l.menu_expense],
            [statusBtn]
        ]).resize();
    }

    // Robust Phone Matching
    async verifyDriver(phoneRaw) {
        const phoneNormalized = phoneRaw.replace(/\D/g, '');
        const suffix = phoneNormalized.slice(-9);

        // Search in all 'drivers' collections
        const snapshot = await this.db.collectionGroup('drivers').get();

        let match = null;
        snapshot.forEach(doc => {
            if (match) return;
            const d = doc.data();
            if (d.phone) {
                const dPhone = d.phone.toString().replace(/\D/g, '');
                // Check if last 9 digits match
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

    // Session Management
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
        } catch (e) {
            console.error("Session Get Error:", e);
            return null;
        }
    }

    async clearSessionState(telegramId) {
        try {
            await this.db.collection('bot_sessions').doc(telegramId.toString()).delete();
        } catch (e) {
            console.error("Session Clear Error:", e);
        }
    }
}

module.exports = TelegramService;
