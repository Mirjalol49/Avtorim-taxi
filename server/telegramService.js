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
    constructor(token, supabase) {
        if (!token) {
            console.warn('⚠️ Telegram Bot token not provided.');
            return;
        }

        this.bot = new Telegraf(token);
        this.db = supabase; // Supabase client

        this.driverCache = new Map();
        // adminSessions: telegramId → { adminId, authenticated, step, tempAmount, type, lang }
        this.adminSessions = new Map();

        console.log('[BOT] Initializing Service (v4.0 - ADMIN COMMANDS + AUTO ALERTS)...');
        this.setupHandlers();

        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));

        this.bot.telegram.getMe().then((botInfo) => {
            console.log(`✅ Telegram Bot Connected: @${botInfo.username}`);
            this.isReady = true;
            this.bot.launch().then(() => {
                console.log('✅ Polling started.');
            }).catch(err => {
                console.error('❌ Polling Error:', err.message);
                this.isReady = false;
            });
        }).catch(err => {
            console.error('❌ Failed to Connect to Telegram:', err.message);
            this.isReady = false;
            this.launchError = err.message;
        });
    }

    // --- SESSION MANAGEMENT (Supabase-backed, memory cache fallback) ---

    async getSession(telegramId) {
        if (!this.db) return null;
        try {
            const { data } = await this.db
                .from('bot_sessions')
                .select('session_data')
                .eq('telegram_id', telegramId.toString())
                .single();
            return data?.session_data ?? null;
        } catch {
            return null;
        }
    }

    async updateSession(telegramId, data) {
        if (!this.db) return;
        try {
            await this.db.from('bot_sessions').upsert({
                telegram_id: telegramId.toString(),
                session_data: data,
                updated_at: new Date().toISOString()
            }, { onConflict: 'telegram_id' });
        } catch (e) {
            console.error('Session Update Error:', e.message);
        }
    }

    async clearSession(telegramId) {
        if (!this.db) return;
        try {
            await this.db.from('bot_sessions').delete().eq('telegram_id', telegramId.toString());
        } catch (e) {
            console.error('Session Clear Error:', e.message);
        }
    }

    setupHandlers() {
        this.bot.use(async (ctx, next) => {
            ctx.safeReply = async (text, extra) => {
                try {
                    return await ctx.reply(text, extra);
                } catch (e) { console.error("Reply err:", e.message); }
            };
            return next();
        });

        // ── /start ──────────────────────────────────────────────────────
        this.bot.start(async (ctx) => {
            if (!ctx.from) return;
            const id = ctx.from.id;
            await this.clearSession(id);
            this.driverCache.delete(id.toString());
            ctx.safeReply(TRANSLATIONS.uz.welcome, Markup.keyboard([['🇺🇿 O\'zbekcha', '🇷🇺 Русский', '🇬🇧 English']]).resize().oneTime());
        });

        // ── /admin — Admin login in bot ─────────────────────────────────
        this.bot.command('admin', async (ctx) => {
            const tid = ctx.from.id;
            // Auto-auth: check if this Telegram ID is already linked to an admin
            const aSess = this.adminSessions.get(tid.toString());
            if (aSess?.authenticated) {
                return ctx.safeReply(
                    `✅ *Admin paneli*\n\nXush kelibsiz, ${aSess.username}!`,
                    Markup.inlineKeyboard([
                        [Markup.button.callback('📊 So\'nggi tranzaksiyalar', 'admin_txlist')],
                        [Markup.button.callback('🔗 Chat ID yangilash', 'admin_getchatid')],
                        [Markup.button.callback('🚪 Chiqish', 'admin_logout')]
                    ])
                );
            }
            // Try auto-auth by Telegram ID
            const admin = await this.findAdminByTelegramId(tid);
            if (admin) {
                this.adminSessions.set(tid.toString(), {
                    step: 'idle', authenticated: true,
                    adminId: admin.id, username: admin.username
                });
                return ctx.safeReply(
                    `✅ *Admin paneli*\n\nXush kelibsiz, ${admin.username}!`,
                    Markup.inlineKeyboard([
                        [Markup.button.callback('📊 So\'nggi tranzaksiyalar', 'admin_txlist')],
                        [Markup.button.callback('🔗 Chat ID yangilash', 'admin_getchatid')],
                        [Markup.button.callback('🚪 Chiqish', 'admin_logout')]
                    ])
                );
            }
            // Not linked yet — ask for password once
            this.adminSessions.set(tid.toString(), { step: 'awaiting_password', authenticated: false });
            return ctx.safeReply('🔐 Admin parolini kiriting:');
        });

        // ── Admin inline button actions ─────────────────────────────────
        this.bot.action('admin_txlist', async (ctx) => {
            await ctx.answerCbQuery();
            const tid = ctx.from.id;
            const aSess = await this.resolveAdminSession(tid);
            if (!aSess) return ctx.safeReply('❌ Avval /admin orqali kiring.');
            await this.sendRecentTransactions(ctx, aSess.adminId);
        });

        this.bot.action('admin_getchatid', async (ctx) => {
            await ctx.answerCbQuery();
            const tid = ctx.from.id;
            const aSess = await this.resolveAdminSession(tid);
            if (!aSess) return ctx.safeReply('❌ Avval /admin orqali kiring.');
            if (this.db && aSess.adminId) {
                await this.setAdminChatId(aSess.adminId, tid.toString());
            }
            return ctx.safeReply(
                `✅ *Chat ID saqlandi!*\n\n\`${tid}\`\n\nEndi barcha tranzaksiya xabarnomalari shu chatga yuboriladi.`,
                { parse_mode: 'Markdown' }
            );
        });

        this.bot.action('admin_logout', async (ctx) => {
            await ctx.answerCbQuery();
            this.adminSessions.delete(ctx.from.id.toString());
            return ctx.safeReply('✅ Admin sessiyasidan chiqdingiz.');
        });

        // ── /transactions — auto-auth by Telegram ID ────────────────────
        this.bot.command('transactions', async (ctx) => {
            const tid = ctx.from.id;
            const aSess = await this.resolveAdminSession(tid);
            if (!aSess) return ctx.safeReply('❌ Avval /admin orqali kiring va akkauntingizni bog\'lang.');
            await this.sendRecentTransactions(ctx, aSess.adminId);
        });

        // ── /mychatid — quick helper ───────────────────────────────────
        this.bot.command('mychatid', async (ctx) => {
            return ctx.safeReply(`📬 Sizning Chat ID: \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
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
                if (this.db && driver.data.id) {
                    this.db.from('drivers').update({ language: lang }).eq('id', driver.data.id).catch(() => {});
                }
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

            // Update driver's telegram_id and language via Supabase
            await driverDoc.ref.update({
                telegram_id: tid.toString(),
                language: lang,
            });

            const dData = driverDoc.data();
            this.cacheDriver(tid, dData, `drivers/${driverDoc.id}`);

            await this.updateSession(tid, { lang, step: 'idle' });
            const name = dData.firstName || dData.first_name || dData.name || 'Driver';
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
                    this.cacheDriver(tid, doc.data(), `drivers/${doc.id}`);
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

        // ── Admin password handler (catches text when in admin auth flow) ──
        this.bot.on('text', async (ctx) => {
            const tid = ctx.from.id;
            const text = ctx.message.text;
            const aSess = this.adminSessions.get(tid.toString());
            if (aSess?.step === 'awaiting_password') {
                return this.handleAdminPassword(ctx, tid, text);
            }
        });
    }

    async saveTransaction(ctx, tid, driver, amount, type, comment, lang, t) {
        try {
            if (!this.db) throw new Error('Database not connected');

            const driverName = driver.data.firstName || driver.data.name || 'Driver';
            // Driver's fleet owner id — stored in driver.data.adminId or fleet_id
            const fleetId = driver.data.adminId || driver.data.fleet_id || driver.data.fleetId || null;
            const driverId = driver.data.id || driver.path.split('/').pop();

            // Insert into Supabase
            const { data: txData, error: txError } = await this.db
                .from('transactions')
                .insert({
                    driver_id: driverId,
                    driver_name: driverName,
                    fleet_id: fleetId,
                    amount: Math.abs(amount),
                    type: type,
                    category: 'Telegram',
                    description: comment || '',
                    status: 'COMPLETED',
                    timestamp_ms: Date.now(),
                    source: 'bot',
                    created_ms: Date.now(),
                })
                .select('id')
                .single();

            if (txError) throw txError;

            // ── Notify the fleet admin on Telegram (fire-and-forget) ──
            if (fleetId) {
                this.notifyAdminOfBotTransaction({
                    adminId: fleetId,
                    driverName,
                    amount: Math.abs(amount),
                    type,
                    description: comment || undefined,
                }).catch(() => {});
            }

            const fmt = Math.abs(amount).toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU');
            const msg = type === 'INCOME' ? t.saved_income : t.saved_expense;
            await this.updateSession(tid, { step: 'idle' });
            const replyText = msg.replace('{amount}', fmt).replace('{comment}', comment);
            return ctx.safeReply(replyText, await this.getMainMenu(lang, driver.data.status));

        } catch (e) {
            console.error("Trans Error:", e.message);
            return ctx.safeReply(t.error_generic, await this.getMainMenu(lang, driver.data.status));
        }
    }

    // ── Admin helper: handle password during /admin flow ─────────────
    async handleAdminPassword(ctx, tid, text) {
        if (!this.db) return ctx.safeReply('❌ Server xatosi.');
        // Look up admin by password in Supabase admin_users table
        const { data: users } = await this.db
            .from('admin_users')
            .select('id, username, role, active')
            .eq('active', true);

        let matchedAdmin = null;
        for (const u of (users || [])) {
            // Simple plain-text match (bcrypt not available without separate dep on this path)
            const { data: row } = await this.db
                .from('admin_users')
                .select('password')
                .eq('id', u.id)
                .single();
            if (row?.password && row.password === text) {
                matchedAdmin = u;
                break;
            }
        }

        if (!matchedAdmin) {
            this.adminSessions.set(tid.toString(), { step: 'awaiting_password', authenticated: false });
            return ctx.safeReply('❌ Noto\'g\'ri parol. Qayta urinib ko\'ring:');
        }

        this.adminSessions.set(tid.toString(), {
            step: 'idle',
            authenticated: true,
            adminId: matchedAdmin.id,
            username: matchedAdmin.username
        });

        // Auto-save their chat ID
        await this.setAdminChatId(matchedAdmin.id, tid.toString());

        return ctx.safeReply(
            `✅ *Xush kelibsiz, ${matchedAdmin.username}!*\n\n` +
            `Chat ID avtomatik saqlandi: \`${tid}\`\n` +
            `Endi barcha bot tranzaksiyalari sizga yuboriladi.`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('📊 So\'nggi tranzaksiyalar', 'admin_txlist')],
                    [Markup.button.callback('🔗 Chat ID yangilash', 'admin_getchatid')],
                    [Markup.button.callback('🚪 Chiqish', 'admin_logout')]
                ])
            }
        );
    }

    // ── Find admin by Telegram ID (auto-auth) ────────────────────────
    async findAdminByTelegramId(telegramId) {
        if (!this.db) return null;
        try {
            // admin_settings stores telegram_chat_id per admin_id
            const { data: setting } = await this.db
                .from('admin_settings')
                .select('admin_id, telegram_chat_id')
                .eq('telegram_chat_id', telegramId.toString())
                .single();
            if (!setting) return null;
            // fetch admin username
            const { data: admin } = await this.db
                .from('admin_users')
                .select('id, username, role')
                .eq('id', setting.admin_id)
                .single();
            return admin || null;
        } catch {
            return null;
        }
    }

    // ── Resolve admin session (memory → DB fallback) ─────────────────
    async resolveAdminSession(telegramId) {
        const key = telegramId.toString();
        const cached = this.adminSessions.get(key);
        if (cached?.authenticated) return cached;
        // Try auto-auth from DB
        const admin = await this.findAdminByTelegramId(telegramId);
        if (!admin) return null;
        const sess = { step: 'idle', authenticated: true, adminId: admin.id, username: admin.username };
        this.adminSessions.set(key, sess);
        return sess;
    }

    // ── Admin helper: send last 10 transactions ───────────────────────
    async sendRecentTransactions(ctx, adminId) {
        if (!this.db) return ctx.safeReply('❌ Server xatosi.');
        try {
            const { data: txs } = await this.db
                .from('transactions')
                .select('driver_name, amount, type, description, timestamp_ms, source')
                .eq('fleet_id', adminId)
                .neq('status', 'DELETED')
                .order('timestamp_ms', { ascending: false })
                .limit(10);

            if (!txs || txs.length === 0) {
                return ctx.safeReply('📭 Hozircha tranzaksiyalar yo\'q.');
            }

            const fmtNum = (n) => new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)));
            const fmtDate = (ts) => {
                const d = new Date(ts);
                return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            };

            let msg = `📊 *So'nggi 10 ta tranzaksiya*\n━━━━━━━━━━━━━━━\n`;
            txs.forEach((tx, i) => {
                const icon = tx.type === 'INCOME' ? '💰' : '💸';
                const sign = tx.type === 'INCOME' ? '+' : '-';
                const src = tx.source === 'bot' ? ' 🤖' : '';
                msg += `${i + 1}. ${icon} ${sign}${fmtNum(tx.amount)} UZS${src}\n`;
                msg += `   👤 ${tx.driver_name || '—'}`;
                if (tx.description) msg += ` · ${tx.description}`;
                msg += `\n   🕐 ${fmtDate(tx.timestamp_ms)}\n`;
            });

            return ctx.safeReply(msg, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback('🔄 Yangilash', 'admin_txlist')]])
            });
        } catch (e) {
            console.error('[BOT] sendRecentTransactions error:', e.message);
            return ctx.safeReply('❌ Ma\'lumot olishda xatolik.');
        }
    }

    // ── Notify admin of a transaction submitted via bot ───────────────
    async notifyAdminOfBotTransaction({ adminId, driverName, amount, type, description }) {
        if (!this.isReady || !this.db) return;
        const chatId = await this.getAdminChatId(adminId);
        if (!chatId) return;

        const fmtNum = (n) => new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)));
        const isIncome = type === 'INCOME';
        const icon = isIncome ? '💰' : '💸';
        const label = isIncome ? "Kirim (Bot orqali)" : "Chiqim (Bot orqali)";
        const amtStr = `${isIncome ? '+' : '-'}${fmtNum(amount)} UZS`;

        let msg = `${icon} *Bot tranzaksiyasi*\n`;
        msg += `━━━━━━━━━━━━━━━\n`;
        msg += `👤 *Haydovchi:* ${driverName}\n`;
        msg += `📊 *Tur:* ${label}\n`;
        msg += `💵 *Summa:* \`${amtStr}\`\n`;
        if (description) msg += `📝 *Izoh:* ${description}\n`;
        msg += `━━━━━━━━━━━━━━━\n_TAKSAPARK CRM_`;

        try {
            await this.bot.telegram.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
            console.log(`[BOT] Admin alert sent to ${chatId}`);
        } catch (e) {
            console.error('[BOT] notifyAdminOfBotTransaction error:', e.message);
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
        if (!this.db) return null;
        const phoneNormalized = phoneRaw.replace(/\D/g, '');
        const suffix = phoneNormalized.slice(-9);
        try {
            const { data } = await this.db
                .from('drivers')
                .select('*')
                .eq('is_deleted', false);
            if (!data) return null;
            const match = data.find(d => d.phone && d.phone.replace(/\D/g, '').slice(-9) === suffix);
            if (!match) return null;
            // Wrap in a firestore-like doc interface for compatibility
            return { data: () => match, ref: { update: async (upd) => {
                await this.db.from('drivers').update(upd).eq('id', match.id);
            }}, id: match.id };
        } catch (e) {
            console.error('[BOT] verifyDriver error:', e.message);
            return null;
        }
    }

    async findDriverByTelegramId(telegramId) {
        if (!this.db) return null;
        try {
            const { data } = await this.db
                .from('drivers')
                .select('*')
                .eq('telegram_id', telegramId.toString())
                .eq('is_deleted', false)
                .single();
            if (!data) return null;
            return { data: () => data, ref: { update: async (upd) => {
                await this.db.from('drivers').update(upd).eq('id', data.id);
            }}, id: data.id, path: `drivers/${data.id}` };
        } catch {
            return null;
        }
    }

    async registerDriver(driver_id, telegram_user_id, callback) {
        try {
            console.log(`[BOT] Linking driver ${driver_id} with Telegram ID: ${telegram_user_id}`);
            if (this.db) {
                const { error } = await this.db
                    .from('drivers')
                    .update({ telegram_id: telegram_user_id.toString() })
                    .eq('id', driver_id);
                if (error) throw error;
            }
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
    /**
     * Returns the admin's Telegram chat ID from Supabase admin_settings, or null if not set.
     */
    async getAdminChatId(adminId) {
        if (!this.db) return null;
        try {
            const { data } = await this.db
                .from('admin_settings')
                .select('telegram_chat_id')
                .eq('admin_id', adminId)
                .single();
            return data?.telegram_chat_id || null;
        } catch {
            return null;
        }
    }

    /**
     * Stores the admin's Telegram chat ID in Supabase admin_settings.
     */
    async setAdminChatId(adminId, chatId) {
        if (!this.db) throw new Error('DB not available');
        const { error } = await this.db.from('admin_settings').upsert({
            admin_id: adminId,
            telegram_chat_id: chatId.toString(),
            updated_at: new Date().toISOString()
        }, { onConflict: 'admin_id' });
        if (error) throw error;
    }

    /**
     * Sends a transaction alert to the admin's Telegram chat.
     * @param {{
     *   adminId: string,
     *   driverName: string,
     *   amount: number,
     *   type: 'INCOME' | 'EXPENSE',
     *   description?: string,
     *   carName?: string,
     *   performedBy?: string,
     *   timestamp?: number
     * }} payload
     */
    async sendTransactionAlert(payload) {
        try {
            if (!this.isReady) {
                return { success: false, error: `Bot not active: ${this.launchError || 'Initializing'}` };
            }

            const { adminId, driverName, amount, type, description, carName, performedBy, timestamp } = payload;

            // Resolve admin chat ID — prefer payload override, then Firestore lookup
            let chatId = payload.adminChatId || null;
            if (!chatId && adminId) {
                chatId = await this.getAdminChatId(adminId);
            }

            if (!chatId) {
                return { success: false, error: 'Admin Telegram chat ID not configured' };
            }

            const fmtNum = (n) => new Intl.NumberFormat('uz-UZ').format(Math.round(Math.abs(n)));
            const fmtDate = (ts) => {
                const d = new Date(ts || Date.now());
                const pad = (n) => String(n).padStart(2, '0');
                return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
            };

            const isIncome  = type === 'INCOME';
            const typeIcon  = isIncome ? '💰' : '💸';
            const typeLabel = isIncome ? "To'landi (Kirim)" : "Chiqim";
            const amtStr    = `${isIncome ? '+' : '-'}${fmtNum(amount)} UZS`;

            let msg = `${typeIcon} *Yangi tranzaksiya*\n`;
            msg += `━━━━━━━━━━━━━━━\n`;
            msg += `👤 *Haydovchi:* ${driverName || "Noma'lum"}\n`;
            if (carName) msg += `🚗 *Avtomobil:* ${carName}\n`;
            msg += `📊 *Tur:* ${typeLabel}\n`;
            msg += `💵 *Summa:* \`${amtStr}\`\n`;
            if (description) msg += `📝 *Izoh:* ${description}\n`;
            if (performedBy) msg += `👮 *Kim tomonidan:* ${performedBy}\n`;
            msg += `🕐 *Vaqt:* ${fmtDate(timestamp)}\n`;
            msg += `━━━━━━━━━━━━━━━\n`;
            msg += `_TAKSAPARK CRM_`;

            await this.bot.telegram.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
            console.log(`[BOT] Transaction alert sent to chat ${chatId}`);
            return { success: true };

        } catch (error) {
            console.error('[BOT] sendTransactionAlert error:', error);
            return { success: false, error: error.message };
        }
    }

    async sendSalaryNotification(driverId, amount, date) {
        try {
            if (!this.isReady) {
                return { success: false, error: `Bot not active: ${this.launchError || 'Initializing'}` };
            }
            if (!this.db) return { success: false, error: 'Database not connected' };

            const { data, error } = await this.db
                .from('drivers')
                .select('*')
                .eq('id', driverId)
                .single();

            if (error || !data) {
                console.warn(`[BOT] Driver not found: ${driverId}`);
                return { success: false, error: 'Driver not found' };
            }

            const telegramId = data.telegram_id || data.telegramId;
            if (!telegramId) {
                return { success: false, error: 'Telegram not linked' };
            }

            const lang = data.language || 'uz';
            const t = TRANSLATIONS[lang] || TRANSLATIONS.uz;
            const fmtAmount = amount.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU') + (lang === 'en' ? ' UZS' : " so'm");
            const message = t.salary_received
                .replace('{amount}', fmtAmount)
                .replace('{date}', date);

            await this.bot.telegram.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
            console.log(`[BOT] Salary notification sent to ${telegramId}`);
            return { success: true };

        } catch (error) {
            console.error('[BOT] Failed to send salary notification:', error.message);
            return { success: false, error: error.message };
        }
    }

}

module.exports = TelegramService;
