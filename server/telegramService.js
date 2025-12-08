const { Telegraf, Markup } = require('telegraf');

class TelegramService {
    constructor(token, db) {
        if (!token) {
            console.warn('⚠️ Telegram Bot token not provided.');
            return;
        }

        this.bot = new Telegraf(token);
        this.db = db; // Firestore instance
        this.setupHandlers();

        // Graceful stop
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));

        this.bot.launch().then(() => {
            console.log('✅ Telegram Bot launched successfully');
        }).catch(err => {
            console.error('❌ Failed to launch Telegram Bot:', err);
        });
    }

    setupHandlers() {
        // middleware to debug
        this.bot.use((ctx, next) => {
            // console.log(`[Bot] Update from ${ctx.from?.id}`);
            return next();
        });

        // /start - Ask for Phone Number
        this.bot.start((ctx) => {
            ctx.reply(
                "Assalomu alaykum! Iltimos, telefon raqamingizni yuboring:",
                Markup.keyboard([
                    Markup.button.contactRequest('📱 Raqamni yuborish')
                ]).resize().oneTime()
            );
        });

        // Handle Contact Share
        this.bot.on('contact', async (ctx) => {
            const contact = ctx.message.contact;
            const telegramId = ctx.from.id;

            // Validate that the contact belongs to the user sending it
            if (contact.user_id && contact.user_id !== telegramId) {
                return ctx.reply("Iltimos, o'zingizning raqamingizni yuboring.");
            }

            // Normalize Telegram phone (remove all non-digits)
            const telegramPhone = contact.phone_number.replace(/\D/g, '');

            try {
                // Search 'drivers' collection
                const driversRef = this.db.collection('drivers');
                const snapshot = await driversRef.get();

                let driverDoc = null;
                let driverData = null;

                // Match last 9 digits to handle country code differences (e.g. 998 vs no 998)
                const telegramSuffix = telegramPhone.slice(-9);
                console.log(`🔎 Checking contact: ${telegramPhone} (Suffix: ${telegramSuffix})`);

                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.phone) {
                        const dbPhone = data.phone.toString().replace(/\D/g, ''); // Normalize DB phone
                        const dbSuffix = dbPhone.slice(-9); // Get last 9 digits

                        // console.log(`   Comparing DB: ${dbPhone} (Suffix: ${dbSuffix})`);

                        if (dbSuffix === telegramSuffix) {
                            driverDoc = doc;
                            driverData = data;
                            console.log(`   ✅ MATCH FOUND: ${data.firstName || data.name}`);
                        }
                    }
                });

                if (!driverDoc) {
                    console.log(`❌ No match found for ${telegramPhone}`);
                    return ctx.reply(`❌ Raqam bazada topilmadi: ${contact.phone_number}\nIltimos, avval haydovchi sifatida ro'yxatdan o'ting.`);
                }

                // Link Driver to Telegram
                await driverDoc.ref.update({
                    telegramId: telegramId.toString()
                });

                ctx.reply(`✅ Xush kelibsiz, ${driverData.firstName || driverData.name || 'Haydovchi'}!`,
                    this.getMainMenu()
                );

            } catch (error) {
                console.error("Error confirming driver:", error);
                ctx.reply("Tizimda xatolik yuz berdi. Qaytadan urinib ko'ring.");
            }
        });

        // Handle Income Button
        this.bot.hears('💰 Kirim', async (ctx) => {
            await this.setSessionState(ctx.from.id, 'income');
            ctx.reply("Kirim summasini yozing (faqat raqam):", Markup.removeKeyboard());
        });

        // Handle Expense Button
        this.bot.hears('💸 Chiqim', (ctx) => {
            ctx.reply("🚧 Chiqim funksiyasi tez orada qo'shiladi!", this.getMainMenu());
        });

        // Handle Status Buttons
        this.bot.hears('🟢 Online', async (ctx) => {
            await this.updateDriverStatus(ctx, 'active');
        });

        this.bot.hears('🔴 Offline', async (ctx) => {
            await this.updateDriverStatus(ctx, 'inactive');
        });

        // Handle Text (The Money)
        this.bot.on('text', async (ctx) => {
            const telegramId = ctx.from.id;
            const text = ctx.message.text;
            const sessionData = await this.getSessionState(telegramId);

            // If we are not waiting for income, check if it is a restart command or ignore
            if (!sessionData || sessionData.action !== 'income') {
                if (['/start', '💰 Kirim', '💸 Chiqim', '🟢 Online', '🔴 Offline'].includes(text)) return;

                // If verified, show menu
                const driverId = await this.getDriverIdByTelegramId(telegramId);
                if (driverId) {
                    return ctx.reply("Menyuni tanlang:", this.getMainMenu());
                }
                return;
            }

            // Parse amount: remove non-digits
            const amount = parseInt(text.replace(/\D/g, ''));

            if (!amount || amount <= 0) {
                return ctx.reply("Iltimos, to'g'ri summa yozing (masalan 50000).");
            }

            try {
                // Get Driver Info
                const driversRef = this.db.collection('drivers');
                const snapshot = await driversRef.where('telegramId', '==', telegramId.toString()).limit(1).get();

                if (snapshot.empty) {
                    return ctx.reply("⚠️ Xatolik: Siz ro'yxatdan o'tmagansiz. /start ni bosing.");
                }

                const driverDoc = snapshot.docs[0];
                const driverData = driverDoc.data();
                const driverName = driverData.firstName
                    ? `${driverData.firstName} ${driverData.lastName || ''}`.trim()
                    : (driverData.name || 'Unknown Driver');

                // Save to Firebase
                await this.db.collection('transactions').add({
                    driverId: driverDoc.id,
                    driverName: driverName,
                    amount: amount,
                    type: 'income',
                    date: new Date().toISOString(),
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    source: 'telegram_bot'
                });

                // Clear session
                await this.clearSessionState(telegramId);

                // Format amount nicely (e.g. 50 000)
                const formattedAmount = amount.toLocaleString('uz-UZ');

                ctx.reply(`✅ ${formattedAmount} so'm qabul qilindi!`,
                    this.getMainMenu()
                );

            } catch (error) {
                console.error("Error saving transaction:", error);
                ctx.reply("❌ Xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
            }
        });
    }

    // Helpers
    getMainMenu() {
        return Markup.keyboard([
            ['🟢 Online', '🔴 Offline'],
            ['💰 Kirim', '💸 Chiqim']
        ]).resize();
    }

    async updateDriverStatus(ctx, status) {
        const telegramId = ctx.from.id;
        const driverId = await this.getDriverIdByTelegramId(telegramId);

        if (!driverId) {
            return ctx.reply("⚠️ Avval ro'yxatdan o'ting: /start");
        }

        try {
            await this.db.collection('drivers').doc(driverId).update({
                status: status,
                lastActive: admin.firestore.FieldValue.serverTimestamp()
            });

            const msg = status === 'active' ? "✅ Siz hozir ONLAYN rejimidasiz." : "🔴 Siz hozir OFLAYN rejimidasiz.";
            ctx.reply(msg, this.getMainMenu());
        } catch (error) {
            console.error("Status update error:", error);
            ctx.reply("❌ Statusni o'zgartirishda xatolik.");
        }
    }

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

    // Session Management in 'bot_sessions'
    async setSessionState(telegramId, action) {
        try {
            await this.db.collection('bot_sessions').doc(telegramId.toString()).set({
                action: action,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error("Session set error:", e);
        }
    }

    async getSessionState(telegramId) {
        try {
            const doc = await this.db.collection('bot_sessions').doc(telegramId.toString()).get();
            return doc.exists ? doc.data() : null;
        } catch (e) {
            console.error("Session get error:", e);
            return null;
        }
    }

    async clearSessionState(telegramId) {
        try {
            await this.db.collection('bot_sessions').doc(telegramId.toString()).delete();
        } catch (e) {
            console.error("Session clear error:", e);
        }
    }
}

// Need to import admin for FieldValue
const admin = require('firebase-admin');

module.exports = TelegramService;
