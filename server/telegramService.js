const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');

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
            console.log('✅ Telegram Bot launched successfully (Delightful Version)');
        }).catch(err => {
            console.error('❌ Failed to launch Telegram Bot:', err);
        });
    }

    setupHandlers() {
        // Debug middleware
        this.bot.use((ctx, next) => {
            // console.log(`[Bot] Update from ${ctx.from?.id}`);
            return next();
        });

        // 1. /start - Friendly Welcome
        this.bot.start((ctx) => {
            ctx.reply(
                "Assalomu alaykum! 🚕\n\nAvtorim Taxi tizimiga xush kelibsiz.\nDavom etish uchun telefon raqamingizni yuboring:",
                Markup.keyboard([
                    Markup.button.contactRequest('📱 Telefon raqamni yuborish')
                ]).resize().oneTime()
            );
        });

        // 2. Contact Verification - ROBUST MATCHING
        this.bot.on('contact', async (ctx) => {
            const contact = ctx.message.contact;
            const telegramId = ctx.from.id;

            if (contact.user_id && contact.user_id !== telegramId) {
                return ctx.reply("🚫 Iltimos, faqat o'zingizning raqamingizni yuboring.");
            }

            // Normalize Telegram phone: remove ALL non-digits
            const telegramPhoneRaw = contact.phone_number;
            const telegramPhoneNormalized = telegramPhoneRaw.replace(/\D/g, '');
            // Create a suffix (last 9 digits) for safer matching (ignores +998 vs 998 vs 91)
            const telegramSuffix = telegramPhoneNormalized.slice(-9);

            console.log(`🔎 Verifying Contact: ${telegramPhoneRaw} (Norm: ${telegramPhoneNormalized}, Suffix: ${telegramSuffix})`);

            try {
                const driversRef = this.db.collection('drivers');
                const snapshot = await driversRef.get();

                let driverDoc = null;
                let driverData = null;

                // Client-side filtering for robust matching
                snapshot.forEach(doc => {
                    if (driverDoc) return; // Already found

                    const data = doc.data();
                    if (!data.phone) return;

                    const dbPhoneRaw = data.phone.toString();
                    const dbPhoneNormalized = dbPhoneRaw.replace(/\D/g, '');
                    const dbSuffix = dbPhoneNormalized.slice(-9);

                    // Match if suffixes match (last 9 digits same)
                    if (dbSuffix === telegramSuffix) {
                        driverDoc = doc;
                        driverData = data;
                        console.log(`   ✅ MATCH: DB Phone ${dbPhoneRaw} matches.`);
                    }
                });

                if (!driverDoc) {
                    console.log(`   ❌ NO MATCH FOUND for ${telegramPhoneRaw}`);
                    return ctx.reply(
                        `🚫 Raqamingiz bazada topilmadi (${contact.phone_number}).\n\n` +
                        `Iltimos, rahbar bilan bog'laning va raqamingiz to'g'ri kiritilganligini tekshiring.`
                    );
                }

                // Update Telegram ID
                await driverDoc.ref.update({
                    telegramId: telegramId.toString(),
                    lastActive: admin.firestore.FieldValue.serverTimestamp()
                });

                const name = driverData.firstName || driverData.name || 'Haydovchi';
                ctx.reply(
                    `✅ Assalomu alaykum, ${name}! Tizimga muvaffaqiyatli ulandingiz.`,
                    this.getMainMenu()
                );

            } catch (error) {
                console.error("Error confirming driver:", error);
                ctx.reply("❌ Tizim xatoligi. Qaytadan urinib ko'ring.");
            }
        });

        // 3. Main Menu Handlers
        this.bot.hears('💰 Kirim', async (ctx) => {
            await this.setSessionState(ctx.from.id, 'awaiting_income');
            ctx.reply("💰 Qancha summa topdingiz? (Faqat raqam yozing)", Markup.removeKeyboard());
        });

        this.bot.hears('💸 Chiqim', (ctx) => {
            ctx.reply("🚧 Chiqim funksiyasi tez orada ishga tushadi!", this.getMainMenu());
        });

        this.bot.hears('📊 Mening Balansim', async (ctx) => {
            // Placeholder: fetch actual balance if possible, or just show feature placeholder
            // In a real scenario, we'd query transactions or driver doc
            ctx.reply("📊 Balans hisoboti tez orada qo'shiladi.", this.getMainMenu());
        });

        // 4. Transaction Logic (Stateful)
        this.bot.on('text', async (ctx) => {
            const telegramId = ctx.from.id;
            const text = ctx.message.text;

            // Ignore commands if they slip through
            if (text.startsWith('/')) return;

            const sessionData = await this.getSessionState(telegramId);
            const isIncome = sessionData?.action === 'awaiting_income';

            // If not in a known state, check if verified and show menu
            if (!isIncome) {
                if (['💰 Kirim', '💸 Chiqim', '📊 Mening Balansim'].includes(text)) return;

                const driverId = await this.getDriverIdByTelegramId(telegramId);
                if (driverId) {
                    return ctx.reply("Quyidagi menyudan tanlang:", this.getMainMenu());
                } else {
                    return ctx.reply("Iltimos, avval /start ni bosing.");
                }
            }

            // === Handle 'awaiting_income' ===
            const amountStr = text.replace(/\D/g, '');
            const amount = parseInt(amountStr);

            if (!amount || amount <= 0) {
                return ctx.reply("⚠️ Iltimos, to'g'ri summa yozing (faqat raqam).");
            }

            try {
                const driverId = await this.getDriverIdByTelegramId(telegramId);
                if (!driverId) {
                    await this.clearSessionState(telegramId);
                    return ctx.reply("❌ Sizning hisobingiz topilmadi. /start tugmasini bosing.");
                }

                // Use a database look up to get name for the receipt
                const driverDoc = await this.db.collection('drivers').doc(driverId).get();
                const driverData = driverDoc.data();
                const driverName = driverData.firstName
                    ? `${driverData.firstName} ${driverData.lastName || ''}`.trim()
                    : (driverData.name || 'Noma\'lum');

                await this.db.collection('transactions').add({
                    driverId: driverId,
                    driverName: driverName,
                    amount: amount,
                    type: 'income',
                    category: 'Trip',
                    date: new Date().toISOString(),
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    source: 'telegram_bot'
                });

                await this.clearSessionState(telegramId);

                const fmtAmount = amount.toLocaleString('uz-UZ');
                ctx.reply(`✅ Qabul qilindi! +${fmtAmount} so'm.`, this.getMainMenu());

            } catch (error) {
                console.error("Transaction save error:", error);
                ctx.reply("❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.", this.getMainMenu());
            }
        });
    }

    getMainMenu() {
        return Markup.keyboard([
            ['💰 Kirim', '💸 Chiqim'],
            ['📊 Mening Balansim']
        ]).resize();
    }

    // --- Helpers ---

    async getDriverIdByTelegramId(telegramId) {
        try {
            const snapshot = await this.db.collection('drivers')
                .where('telegramId', '==', telegramId.toString())
                .limit(1)
                .get();
            if (snapshot.empty) return null;
            return snapshot.docs[0].id;
        } catch (error) {
            console.error("Get Driver error:", error);
            return null;
        }
    }

    async setSessionState(telegramId, action) {
        try {
            await this.db.collection('bot_sessions').doc(telegramId.toString()).set({
                action: action,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) { console.error("Session set error:", e); }
    }

    async getSessionState(telegramId) {
        try {
            const doc = await this.db.collection('bot_sessions').doc(telegramId.toString()).get();
            return doc.exists ? doc.data() : null;
        } catch (e) { return null; }
    }

    async clearSessionState(telegramId) {
        try {
            await this.db.collection('bot_sessions').doc(telegramId.toString()).delete();
        } catch (e) { console.error("Session clear error:", e); }
    }
}

module.exports = TelegramService;
