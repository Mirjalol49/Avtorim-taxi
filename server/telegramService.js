const { Telegraf, Markup } = require('telegraf');

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
        salary_received: "✅ **Maosh To'landi!**\n\n💰 Summa: **{amount}**\n📅 Sana: {date}\n\nHar doim biz bilan bo'lganingiz uchun rahmat! 🚀"
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
        salary_received: "✅ **Зарплата Выплачена!**\n\n💰 Сумма: **{amount}**\n📅 Дата: {date}\n\nСпасибо, что вы с нами! 🚀"
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
        salary_received: "✅ **Salary Paid!**\n\n💰 Amount: **{amount}**\n📅 Date: {date}\n\nThanks for being with us! 🚀"
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

        this.driverCache = new Map();
        this.driverCache = new Map();
        // this.sessionCache = new Map(); // Removed in favor of Firestore

        console.log('[BOT] Initializing Service (v3.4 - SALARY NOTIFICATIONS)...');
        this.setupHandlers();

        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));

        console.log('[BOT] Attempting to launch Telegraf...');

        // 1. Verify Connection First (Quick check)
        this.bot.telegram.getMe().then((botInfo) => {
            console.log(`✅ Telegram Bot Connected: @${botInfo.username}`);
            this.isReady = true;

            // 2. Start Polling (Async, don't await)
            this.bot.launch().then(() => {
                console.log('✅ Polling started.');
            }).catch(err => {
                console.error('❌ Polling Error:', err.message);
                this.isReady = false; // Disable if polling fails fatally
            });

        }).catch(err => {
            console.error('❌ Failed to Connect to Telegram (Auth/Net):', err.message);
            this.isReady = false;
            this.launchError = err.message;
        });
    }

    // --- SESSION MANAGEMENT (Moved to Firestore) ---

    async getSession(telegramId) {
        // Try memory cache first for speed (optional, but let's stick to Firestore for persistence)
        // Or better: Use Firestore.
        try {
            const docRef = this.db.collection('bot_sessions').doc(telegramId.toString());
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

    async updateSession(telegramId, data) {
        try {
            const docRef = this.db.collection('bot_sessions').doc(telegramId.toString());
            // Merge true to preserve other fields
            await docRef.set(data, { merge: true });
        } catch (e) {
            console.error('Session Update Error:', e);
        }
    }

    async clearSession(telegramId) {
        try {
            await this.db.collection('bot_sessions').doc(telegramId.toString()).delete();
        } catch (e) {
            console.error('Session Clear Error:', e);
        }
    }

    setupHandlers() {
        this.bot.use(async (ctx, next) => {
            ctx.safeReply = async (text, extra) => {
                try {
                    return await ctx.reply(text, extra);
                } catch (e) { console.error("Reply err:", e); }
            };
            return next();
        });

        // 1. /start
        this.bot.start(async (ctx) => {
            if (!ctx.from) return;
            // HARD RESET
            const id = ctx.from.id;
            await this.clearSession(id);
            this.driverCache.delete(id.toString());

            ctx.safeReply(TRANSLATIONS.uz.welcome, Markup.keyboard([['🇺🇿 O\'zbekcha', '🇷🇺 Русский', '🇬🇧 English']]).resize().oneTime());
        });

        // 2. Language
        this.bot.hears(['🇺🇿 O\'zbekcha', '🇷🇺 Русский', '🇬🇧 English'], async (ctx) => {
            const text = ctx.message.text;
            let lang = 'uz';
            if (text.includes('Русский')) lang = 'ru';
            if (text.includes('English')) lang = 'en';

            await this.updateSession(ctx.from.id, { lang, step: 'awaiting_contact' });

            const driver = this.getDriverFromCache(ctx.from.id);
            if (driver) {
                driver.data.language = lang;
                this.cacheDriver(ctx.from.id, driver.data, driver.path);
                this.db.doc(driver.path).update({ language: lang }).catch(console.error);
                return ctx.safeReply(TRANSLATIONS[lang].success_login.replace('{name}', driver.data.firstName || driver.data.name || 'Driver'), await this.getMainMenu(lang, driver.data.status));
            }

            const t = TRANSLATIONS[lang];
            ctx.safeReply(t.contact_request, Markup.keyboard([Markup.button.contactRequest(t.share_contact)]).resize().oneTime());
        });

        // 3. Contact
        this.bot.on('contact', async (ctx) => {
            const tid = ctx.from.id;
            const contact = ctx.message.contact;
            const session = await this.getSession(tid);
            const lang = session?.lang || 'uz';
            const t = TRANSLATIONS[lang];

            if (contact.user_id && contact.user_id !== tid) return ctx.safeReply(t.not_your_contact);

            const driverDoc = await this.verifyDriver(contact.phone_number);
            if (!driverDoc) return ctx.safeReply(t.driver_not_found);

            await driverDoc.ref.update({
                telegramId: tid.toString(),
                language: lang,
                lastActive: admin.firestore.FieldValue.serverTimestamp()
            });

            const dData = driverDoc.data();
            this.cacheDriver(tid, dData, driverDoc.ref.path);

            await this.updateSession(tid, { lang, step: 'idle' });
            const name = dData.firstName || dData.name || 'Driver';
            ctx.safeReply(t.success_login.replace('{name}', name), await this.getMainMenu(lang, dData.status));
        });

        // 4. Main Logic
        this.bot.on('text', async (ctx, next) => {
            const text = ctx.message.text;
            if (text.startsWith('/')) return next();
            const tid = ctx.from.id;

            let driver = this.getDriverFromCache(tid);

            if (!driver) {
                const doc = await this.findDriverByTelegramId(tid);
                if (doc) {
                    this.cacheDriver(tid, doc.data(), doc.ref.path);
                    driver = this.getDriverFromCache(tid);
                }
            }

            const session = await this.getSession(tid);
            if (!driver) {
                if (session?.step === 'awaiting_contact') return ctx.safeReply("👇");
                const isLang = ['🇺🇿 O\'zbekcha', '🇷🇺 Русский', '🇬🇧 English'].includes(text);
                if (!isLang) return ctx.safeReply(TRANSLATIONS.uz.need_start);
                return next();
            }

            const lang = driver.data.language || session?.lang || 'uz';
            const t = TRANSLATIONS[lang];
            const driverRef = this.db.doc(driver.path);

            // A. Settings
            if (text === t.btn_settings) {
                return ctx.safeReply(t.lang_select, Markup.keyboard([['🇺🇿 O\'zbekcha', '🇷🇺 Русский', '🇬🇧 English']]).resize().oneTime());
            }

            // B. Status Toggle
            if (text === t.btn_start_work || text === t.btn_stop_work) {
                const newStatus = text === t.btn_start_work ? 'ACTIVE' : 'OFFLINE';
                const reply = newStatus === 'ACTIVE' ? t.status_to_active : t.status_to_inactive;

                driver.data.status = newStatus;
                this.cacheDriver(tid, driver.data, driver.path);

                driverRef.update({ status: newStatus }).catch(e => console.error("Status update err:", e));

                return ctx.safeReply(reply, await this.getMainMenu(lang, newStatus));
            }

            // C. Income/Expense Trigger
            if (text === t.btn_income) {
                await this.updateSession(tid, { lang, step: 'awaiting_amount', type: 'INCOME' });
                return ctx.safeReply(t.ask_income, Markup.removeKeyboard());
            }
            if (text === t.btn_expense) {
                await this.updateSession(tid, { lang, step: 'awaiting_amount', type: 'EXPENSE' });
                return ctx.safeReply(t.ask_expense, Markup.removeKeyboard());
            }

            // D. Support
            if (text === t.btn_help) return ctx.safeReply(t.help_text);

            // E. Transaction Flow - Step 1
            if (session && session.step === 'awaiting_amount') {
                const amtStr = text.replace(/[^\d]/g, '');
                const amount = parseInt(amtStr);
                if (!amount || amount <= 0) return ctx.safeReply(t.invalid_number);

                const isExpense = session.type === 'EXPENSE';

                if (isExpense) {
                    await this.updateSession(tid, {
                        ...session,
                        step: 'awaiting_comment',
                        tempAmount: amount
                    });
                    return ctx.safeReply(t.ask_comment);
                } else {
                    await this.saveTransaction(ctx, tid, driver, amount, 'INCOME', '', lang, t);
                    return;
                }
            }

            // F. Transaction Flow - Step 2 (Comment)
            if (session && session.step === 'awaiting_comment') {
                const amount = session.tempAmount;
                const type = session.type || 'EXPENSE';
                const comment = text;

                await this.saveTransaction(ctx, tid, driver, amount, type, comment, lang, t);
                return;
            }

            return ctx.safeReply("👇", await this.getMainMenu(lang, driver.data.status));
        });
    }

    async saveTransaction(ctx, tid, driver, amount, type, comment, lang, t) {
        try {
            let transactionsRef;
            const pathSegments = driver.path.split('/');
            const dRef = this.db.doc(driver.path);
            if (pathSegments.length > 2) {
                transactionsRef = dRef.parent.parent.collection('transactions');
            } else {
                transactionsRef = this.db.collection('transactions');
            }

            await transactionsRef.add({
                driverId: pathSegments[pathSegments.length - 1],
                driverName: driver.data.firstName || driver.data.name || 'Driver',
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

            await this.updateSession(tid, { step: 'idle' });
            const replyText = msg.replace('{amount}', fmt).replace('{comment}', comment);

            return ctx.safeReply(replyText, await this.getMainMenu(lang, driver.data.status));

        } catch (e) {
            console.error("Trans Error:", e);
            return ctx.safeReply(t.error_generic, await this.getMainMenu(lang, driver.data.status));
        }
    }

    // --- Helpers ---

    cacheDriver(tid, data, path) {
        this.driverCache.set(tid.toString(), {
            data,
            path,
            expires: Date.now() + 1000 * 60 * 60 * 2 // 2 hours
        });
    }

    getDriverFromCache(tid) {
        const c = this.driverCache.get(tid.toString());
        if (c && c.expires > Date.now()) return c;
        return null;
    }

    // Old session methods removed (getSession, updateSession, clearSession) - used new ones above

    async getMainMenu(lang, status) {
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

    async verifyDriver(phoneRaw) {
        const phoneNormalized = phoneRaw.replace(/\D/g, '');
        const suffix = phoneNormalized.slice(-9);
        const snapshot = await this.db.collectionGroup('drivers').get();
        let match = null;
        snapshot.forEach(doc => {
            if (match) return;
            const d = doc.data();
            if (d.isDeleted) return;
            if (d.phone && d.phone.toString().replace(/\D/g, '').slice(-9) === suffix) match = doc;
        });
        return match;
    }

    async findDriverByTelegramId(telegramId) {
        try {
            const snapshot = await this.db.collectionGroup('drivers').get();
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
            console.error("[BOT DEBUG] findDriver error:", e);
            return null;
        }
    }

    async registerDriver(driver_id, telegram_user_id, callback) {
        try {
            console.log(`[BOT] Registering/Linking driver ${driver_id} with Telegram ID: ${telegram_user_id}`);

            // Update the driver document in Firestore
            await this.db.collection('drivers').doc(driver_id).update({
                telegramId: telegram_user_id.toString(), // Store as string to be safe
                // We can also store extra metadata if needed
                telegramLinkedAt: Date.now()
            });

            console.log(`[BOT] Successfully linked driver ${driver_id} <-> ${telegram_user_id}`);
            if (callback) callback(true);
        } catch (error) {
            console.error(`[BOT] Failed to register driver ${driver_id}:`, error);
            if (callback) callback(false, error.message);
        }
    }

    /**
     * Sends a salary notification to a driver via Telegram.
     * @param {string} driverId - The Firestore document ID of the driver.
     * @param {number} amount - The salary amount.
     * @param {string} date - The formatted date string.
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async sendSalaryNotification(driverId, amount, date) {
        try {
            if (!this.isReady) {
                console.warn('[BOT] Service not ready or failed to launch:', this.launchError);
                return { success: false, error: `Bot not active: ${this.launchError || 'Initializing'}` };
            }
            console.log(`[BOT] Sending salary notification to driver: ${driverId}`);

            // 1. Fetch Driver
            let driverDoc;
            // First check if it's a direct path ID
            try {
                const d = await this.db.collection('drivers').doc(driverId).get();
                if (d.exists) driverDoc = d;
            } catch (e) { }

            // If not found, try scan
            if (!driverDoc || !driverDoc.exists) {
                const snapshot = await this.db.collectionGroup('drivers').get();
                snapshot.forEach(d => {
                    if (d.id === driverId) driverDoc = d;
                });
            }

            if (!driverDoc || !driverDoc.exists) {
                console.warn(`[BOT] Driver not found: ${driverId}`);
                return { success: false, error: 'Driver not found' };
            }

            const data = driverDoc.data();
            const telegramId = data.telegramId;

            if (!telegramId) {
                console.warn(`[BOT FAIL] Driver ${driverId} (Name: ${data.name}) found but has NULL telegramId.`);
                console.log('[BOT DEBUG] Driver Data Dump:', JSON.stringify(data, null, 2));
                return { success: false, error: 'Telegram not linked (Driver found, but no ID)' };
            }
            console.log(`[BOT SUCCESS] Found Telegram ID: ${telegramId} for driver ${data.name}`);

            // 2. Prepare Message
            const lang = data.language || 'uz';
            const t = TRANSLATIONS[lang] || TRANSLATIONS.uz;
            const fmtAmount = amount.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU') + (lang === 'en' ? ' UZS' : " so'm");

            const message = t.salary_received
                .replace('{amount}', fmtAmount)
                .replace('{date}', date);

            // 3. Send
            await this.bot.telegram.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
            console.log(`[BOT] Notification sent to ${telegramId}`);

            return { success: true };

        } catch (error) {
            console.error('[BOT] Failed to send notification:', error);
            return { success: false, error: error.message };
        }
    }

}

module.exports = TelegramService;
