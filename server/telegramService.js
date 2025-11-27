// Telegram Bot Service for handling live geolocation
const TelegramBot = require('node-telegram-bot-api');

class TelegramService {
    constructor(token, db) {
        if (!token) {
            console.warn('⚠️  Telegram Bot token not provided. Bot features will be disabled.');
            console.warn('   To enable: Set TELEGRAM_BOT_TOKEN environment variable');
            this.bot = null;
            this.db = db;
            return;
        }

        this.bot = new TelegramBot(token, { polling: true });
        this.db = db;
        this.setupHandlers();
        console.log('✅ Telegram Bot initialized successfully');
    }

    setupHandlers() {
        if (!this.bot) return;

        // Handle /start command - driver registration
        this.bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            const username = msg.from.username || msg.from.first_name;

            this.bot.sendMessage(chatId,
                `🚕 *Welcome to Avtorim Taxi Driver Portal*\n\n` +
                `Your Telegram ID: \`${userId}\`\n` +
                `Username: ${username}\n\n` +
                `To start sharing your location:\n` +
                `1. Ask your administrator to register this ID\n` +
                `2. Once approved, share your live location using the button below\n` +
                `3. Your location will appear on the admin dashboard in real-time\n\n` +
                `Use /help for more information.`,
                { parse_mode: 'Markdown' }
            );
        });

        // Handle /help command
        this.bot.onText(/\/help/, (msg) => {
            const chatId = msg.chat.id;
            this.bot.sendMessage(chatId,
                `📍 *How to Share Live Location:*\n\n` +
                `1. Click the 📎 attachment icon\n` +
                `2. Select "Location"\n` +
                `3. Choose "Share Live Location"\n` +
                `4. Set duration (1hr, 8hrs)\n` +
                `5. Send!\n\n` +
                `Your location will update automatically every few seconds.\n\n` +
                `Use /status to check if you're sharing location.`,
                { parse_mode: 'Markdown' }
            );
        });

        // Handle /status command
        this.bot.onText(/\/status/, (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;

            this.checkDriverStatus(userId, (isRegistered, isSharing, lastUpdate) => {
                let statusMessage = `📊 *Your Status*\n\n`;
                statusMessage += `Telegram ID: \`${userId}\`\n`;
                statusMessage += `Registered: ${isRegistered ? '✅ Yes' : '❌ No'}\n`;

                if (isRegistered) {
                    statusMessage += `Location Sharing: ${isSharing ? '✅ Active' : '❌ Not sharing'}\n`;
                    if (lastUpdate) {
                        const updateTime = new Date(lastUpdate * 1000);
                        statusMessage += `Last Update: ${updateTime.toLocaleString()}\n`;
                    }
                }

                this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
            });
        });

        // Handle live location updates
        this.bot.on('location', (msg) => {
            this.handleLocationUpdate(msg);
        });

        // Handle edited location (live location updates)
        this.bot.on('edited_message', (msg) => {
            if (msg.location) {
                this.handleLocationUpdate(msg);
            }
        });
    }

    handleLocationUpdate(msg) {
        const userId = msg.from.id;
        const chatId = msg.chat.id;
        const location = msg.location;

        console.log(`📍 Location update from user ${userId}:`, location);

        // Check if user is registered as a driver
        this.getDriverIdByTelegramId(userId, (driverId) => {
            if (!driverId) {
                this.bot.sendMessage(chatId,
                    `⚠️ You are not registered as a driver yet.\n` +
                    `Please contact your administrator with your Telegram ID: \`${userId}\``,
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            // Save location to database
            const sql = `
                INSERT INTO drivers_location (driver_id, latitude, longitude, last_update_ts, telegram_user_id, heading, is_live)
                VALUES (?, ?, ?, ?, ?, ?, 1)
                ON CONFLICT(driver_id) DO UPDATE SET
                    latitude = excluded.latitude,
                    longitude = excluded.longitude,
                    last_update_ts = excluded.last_update_ts,
                    telegram_user_id = excluded.telegram_user_id,
                    heading = excluded.heading,
                    is_live = 1
            `;

            const timestamp = Math.floor(Date.now() / 1000);
            const heading = location.heading || null;

            this.db.run(sql, [driverId, location.latitude, location.longitude, timestamp, userId, heading], (err) => {
                if (err) {
                    console.error('❌ Error saving location:', err.message);
                    return;
                }
                console.log(`✅ Location updated for driver ${driverId}`);
            });
        });
    }

    getDriverIdByTelegramId(telegramId, callback) {
        const sql = "SELECT driver_id FROM drivers_location WHERE telegram_user_id = ?";
        this.db.get(sql, [telegramId], (err, row) => {
            if (err) {
                console.error('Error querying driver:', err.message);
                callback(null);
                return;
            }
            callback(row ? row.driver_id : null);
        });
    }

    checkDriverStatus(telegramId, callback) {
        const sql = "SELECT driver_id, last_update_ts, is_live FROM drivers_location WHERE telegram_user_id = ?";
        this.db.get(sql, [telegramId], (err, row) => {
            if (err) {
                console.error('Error checking status:', err.message);
                callback(false, false, null);
                return;
            }

            if (!row) {
                callback(false, false, null);
                return;
            }

            const isSharing = row.is_live === 1;
            callback(true, isSharing, row.last_update_ts);
        });
    }

    // Register a driver with their Telegram ID
    registerDriver(driverId, telegramId, callback) {
        const sql = `
            INSERT INTO drivers_location (driver_id, telegram_user_id, latitude, longitude, last_update_ts, is_live)
            VALUES (?, ?, 0, 0, 0, 0)
            ON CONFLICT(driver_id) DO UPDATE SET telegram_user_id = excluded.telegram_user_id
        `;

        this.db.run(sql, [driverId, telegramId], function (err) {
            if (err) {
                console.error('Error registering driver:', err.message);
                callback(false, err.message);
                return;
            }
            console.log(`✅ Driver ${driverId} registered with Telegram ID ${telegramId}`);
            callback(true, null);
        });
    }
}

module.exports = TelegramService;
