const express = require('express');
const bodyParser = require('body-parser');
const auth = require('basic-auth');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const TelegramService = require('./telegramService');
const { supabase } = require('./supabaseAdmin');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// SQLite for OwnTracks legacy
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        createTable();
    }
});

// Telegram bot
let telegramService = null;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function createTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS drivers_location (
            driver_id TEXT PRIMARY KEY,
            latitude REAL,
            longitude REAL,
            last_update_ts INTEGER,
            telegram_user_id INTEGER,
            heading INTEGER,
            is_live INTEGER DEFAULT 0
        )
    `;
    db.run(sql, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        } else {
            console.log('Table drivers_location ready.');
            if (TELEGRAM_BOT_TOKEN) {
                telegramService = new TelegramService(TELEGRAM_BOT_TOKEN, supabase);
            } else {
                console.warn('Telegram Bot not started: TELEGRAM_BOT_TOKEN not set');
            }
        }
    });
}

// Basic auth for OwnTracks / admin endpoints
const basicAuth = (req, res, next) => {
    const credentials = auth(req);
    const EXPECTED_USERNAME = process.env.OWNS_USERNAME || 'driver123';
    const EXPECTED_PASSWORD = process.env.OWNS_PASSWORD || 'secretKey';

    if (!credentials || credentials.name !== EXPECTED_USERNAME || credentials.pass !== EXPECTED_PASSWORD) {
        res.set('WWW-Authenticate', 'Basic realm="OwnTracks Server"');
        return res.status(401).send('Access denied');
    }
    next();
};

// OwnTracks webhook
app.post('/api/owntracks/location', basicAuth, (req, res) => {
    const data = req.body;

    if (data._type !== 'location') {
        return res.status(200).json({ status: 'ignored', reason: 'not a location type' });
    }

    const { lat, lon, tst } = data;
    const credentials = auth(req);
    const driver_id = credentials.name;

    if (!lat || !lon || !tst) {
        return res.status(400).json({ error: 'Missing required location fields' });
    }

    const sql = `
        INSERT INTO drivers_location (driver_id, latitude, longitude, last_update_ts)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(driver_id) DO UPDATE SET
            latitude = excluded.latitude,
            longitude = excluded.longitude,
            last_update_ts = excluded.last_update_ts
    `;

    db.run(sql, [driver_id, lat, lon, tst], function (err) {
        if (err) {
            console.error('Error upserting location:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(200).json({ status: 'success' });
    });
});

app.get('/api/drivers', (req, res) => {
    db.all('SELECT * FROM drivers_location', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.post('/api/telegram/register', (req, res) => {
    const { driver_id, telegram_user_id } = req.body;
    if (!driver_id || !telegram_user_id) {
        return res.status(400).json({ error: 'driver_id and telegram_user_id are required' });
    }
    if (!telegramService) return res.status(503).json({ error: 'Telegram service not available' });

    telegramService.registerDriver(driver_id, telegram_user_id, (success, error) => {
        if (success) {
            res.json({ success: true, message: `Driver ${driver_id} registered successfully` });
        } else {
            res.status(500).json({ error: error || 'Registration failed' });
        }
    });
});

app.get('/api/telegram/drivers', (req, res) => {
    db.all('SELECT driver_id, telegram_user_id, is_live FROM drivers_location WHERE telegram_user_id IS NOT NULL', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.post('/api/notifications/salary', async (req, res) => {
    const { driverId, amount, date } = req.body;
    if (!driverId || !amount || !date) {
        return res.status(400).json({ error: 'Missing required fields: driverId, amount, date' });
    }
    if (!telegramService) return res.status(503).json({ error: 'Telegram service not available' });

    try {
        const result = await telegramService.sendSalaryNotification(driverId, amount, date);
        if (result.success) {
            res.json({ success: true, message: 'Notification sent' });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Notification API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Transaction alert → admin Telegram ─────────────────────────────────────
app.post('/api/notifications/transaction', async (req, res) => {
    const { adminId, driverName, amount, type, description, carName, performedBy, timestamp, adminChatId } = req.body;
    if (!amount || !type) {
        return res.status(400).json({ error: 'Missing required fields: amount, type' });
    }
    if (!telegramService) {
        // Bot not configured — silently succeed so the frontend isn't blocked
        return res.json({ success: false, error: 'Telegram service not available' });
    }

    try {
        const result = await telegramService.sendTransactionAlert({
            adminId, driverName, amount, type, description, carName, performedBy, timestamp, adminChatId
        });
        res.json(result);
    } catch (error) {
        console.error('Transaction alert error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Admin Telegram chat ID config ───────────────────────────────────────────────
// GET  /api/admin/telegram-chat?adminId=xxx  → { chatId }
// POST /api/admin/telegram-chat              → { adminId, chatId }
app.get('/api/admin/telegram-chat', async (req, res) => {
    const { adminId } = req.query;
    if (!adminId) return res.status(400).json({ error: 'adminId required' });
    if (!supabase) return res.json({ chatId: null });
    try {
        const { data } = await supabase
            .from('admin_settings')
            .select('telegram_chat_id')
            .eq('admin_id', adminId)
            .single();
        res.json({ chatId: data?.telegram_chat_id ?? null });
    } catch (e) {
        res.json({ chatId: null });
    }
});

app.post('/api/admin/telegram-chat', async (req, res) => {
    const { adminId, chatId } = req.body;
    if (!adminId || !chatId) return res.status(400).json({ error: 'adminId and chatId required' });
    if (!supabase) return res.status(503).json({ error: 'Database not available' });
    try {
        const { error } = await supabase.from('admin_settings').upsert({
            admin_id: adminId,
            telegram_chat_id: chatId.toString(),
            updated_at: new Date().toISOString()
        }, { onConflict: 'admin_id' });
        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin API routes
const adminController = require('./adminController');

app.post('/api/admin/create-account', basicAuth, adminController.createAccount);
app.post('/api/admin/create-account-enhanced', basicAuth, adminController.createAccountEnhanced);
app.post('/api/admin/verify-email', adminController.verifyEmail);
app.post('/api/admin/approve-account', basicAuth, adminController.approveAccount);
app.post('/api/admin/reject-account', basicAuth, adminController.rejectAccount);
app.get('/api/admin/pending-accounts', basicAuth, adminController.getPendingAccounts);
app.post('/api/admin/toggle-status', basicAuth, adminController.toggleAccountStatus);
app.get('/api/admin/accounts', basicAuth, adminController.listAccounts);
app.post('/api/admin/validate-password', basicAuth, adminController.validatePassword);
app.post('/api/admin/change-password', basicAuth, adminController.changePassword);
app.post('/api/admin/mfa/setup', basicAuth, adminController.setupMFA);
app.post('/api/admin/mfa/verify', basicAuth, adminController.verifyMFA);
app.post('/api/admin/mfa/verify-backup', basicAuth, adminController.verifyBackupCode);
app.get('/api/admin/mfa/status/:userId', basicAuth, adminController.getMFAStatus);
app.post('/api/admin/mfa/regenerate-codes', basicAuth, adminController.regenerateBackupCodes);
app.get('/api/admin/sessions/:userId', basicAuth, adminController.getSessions);
app.post('/api/admin/logout-all', basicAuth, adminController.logoutAllSessions);
app.get('/api/admin/audit-logs', basicAuth, adminController.getAuditLogs);

// ==================== PUBLIC AUTH ENDPOINT ====================
app.post('/api/auth/login', async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ success: false, error: 'Password required' });
    }

    if (!supabase) {
        return res.status(503).json({ success: false, error: 'Database not configured' });
    }

    try {
        const { data: users } = await supabase
            .from('admin_users')
            .select('id, username, role, active, password_hash, password, avatar, mfa_enabled');

        for (const user of (users || [])) {
            if (!user.active) continue;

            // Bcrypt hash check
            if (user.password_hash) {
                const match = await bcrypt.compare(password, user.password_hash);
                if (match) {
                    await supabase.from('audit_logs').insert({
                        action: 'LOGIN_SUCCESS',
                        target_id: user.id,
                        target_name: user.username,
                        timestamp_ms: Date.now()
                    });

                    return res.json({
                        success: true,
                        user: {
                            id: user.id,
                            username: user.username,
                            role: user.role || 'admin',
                            active: user.active,
                            avatar: user.avatar,
                            mfaEnabled: user.mfa_enabled || false
                        }
                    });
                }
            }

            // Legacy: plain-text password (migration support)
            if (user.password && user.password === password) {
                await supabase.from('audit_logs').insert({
                    action: 'LOGIN_SUCCESS_LEGACY',
                    target_id: user.id,
                    target_name: user.username,
                    timestamp_ms: Date.now()
                });

                return res.json({
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        role: user.role || 'admin',
                        active: user.active,
                        avatar: user.avatar,
                        mfaEnabled: user.mfa_enabled || false
                    },
                    warning: 'Password migration recommended'
                });
            }
        }

        await supabase.from('audit_logs').insert({
            action: 'LOGIN_FAILED',
            details: { reason: 'Invalid credentials' },
            timestamp_ms: Date.now()
        });

        return res.status(401).json({ success: false, error: 'Invalid password' });
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({ success: false, error: 'Authentication system error' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening at http://0.0.0.0:${port}`);
    console.log(`OwnTracks webhook: POST /api/owntracks/location`);
    console.log(`Auth: POST /api/auth/login`);
    console.log(`Admin API: POST /api/admin/*`);
    if (TELEGRAM_BOT_TOKEN) {
        console.log('Telegram Bot is ACTIVE');
    } else {
        console.log('Telegram Bot DISABLED (set TELEGRAM_BOT_TOKEN to enable)');
    }
});
