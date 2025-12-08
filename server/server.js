const express = require('express');
const bodyParser = require('body-parser');
const auth = require('basic-auth');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const admin = require('firebase-admin');
const TelegramService = require('./telegramService');

const app = express();
const port = 3000;

const cors = require('cors');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize Firebase Admin
let firestore;
try {
    const serviceAccount = process.env.SERVICE_ACCOUNT_KEY
        ? JSON.parse(process.env.SERVICE_ACCOUNT_KEY)
        : require('./serviceAccountKey.json');

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    firestore = admin.firestore();
    console.log('✅ Firebase Admin Initialized in server.js');
} catch (error) {
    console.warn('⚠️ Firebase Admin could not be initialized:', error.message);
}

// Database Setup (SQLite for OwnTracks legacy)
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        createTable();
    }
});

// Initialize Telegram Bot
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
            // Initialize Telegram service with Firestore
            if (TELEGRAM_BOT_TOKEN && firestore) {
                telegramService = new TelegramService(TELEGRAM_BOT_TOKEN, firestore);
            } else {
                console.warn('⚠️  Telegram Bot not started: Missing Token or Firestore');
            }
        }
    });
}

// Basic Authentication Middleware
const basicAuth = (req, res, next) => {
    const credentials = auth(req);

    // Replace these with your actual secure credentials or load from environment variables
    // For this example, we use placeholders as requested
    const EXPECTED_USERNAME = process.env.OWNS_USERNAME || 'driver123';
    const EXPECTED_PASSWORD = process.env.OWNS_PASSWORD || 'secretKey';

    if (!credentials || credentials.name !== EXPECTED_USERNAME || credentials.pass !== EXPECTED_PASSWORD) {
        res.set('WWW-Authenticate', 'Basic realm="OwnTracks Server"');
        return res.status(401).send('Access denied');
    }
    next();
};

// Webhook Endpoint
app.post('/api/owntracks/location', basicAuth, (req, res) => {
    const data = req.body;

    console.log('Received data:', JSON.stringify(data));

    // Verify _type
    if (data._type !== 'location') {
        console.log(`Ignored event type: ${data._type}`);
        return res.status(200).json({ status: 'ignored', reason: 'not a location type' });
    }

    // Extract fields
    const { lat, lon, tst, tid } = data;

    // Use username from auth as driver_id, or fallback to tid if preferred. 
    // Request says: "derived from the authenticated username or tid"
    // We'll use the authenticated username to ensure it matches the authorized driver.
    const credentials = auth(req);
    const driver_id = credentials.name;

    if (!lat || !lon || !tst) {
        return res.status(400).json({ error: 'Missing required location fields' });
    }

    // Upsert into Database
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
        console.log(`Updated location for driver ${driver_id}`);
        res.status(200).json({ status: 'success' });
    });
});

// Get All Drivers Location
app.get('/api/drivers', (req, res) => {
    const sql = "SELECT * FROM drivers_location";
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching drivers:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Register Driver with Telegram ID
app.post('/api/telegram/register', (req, res) => {
    const { driver_id, telegram_user_id } = req.body;

    if (!driver_id || !telegram_user_id) {
        return res.status(400).json({ error: 'driver_id and telegram_user_id are required' });
    }

    if (!telegramService) {
        return res.status(503).json({ error: 'Telegram service not available' });
    }

    telegramService.registerDriver(driver_id, telegram_user_id, (success, error) => {
        if (success) {
            res.json({ success: true, message: `Driver ${driver_id} registered successfully` });
        } else {
            res.status(500).json({ error: error || 'Registration failed' });
        }
    });
});

// Get all registered drivers with Telegram
app.get('/api/telegram/drivers', (req, res) => {
    const sql = "SELECT driver_id, telegram_user_id, is_live FROM drivers_location WHERE telegram_user_id IS NOT NULL";
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching telegram drivers:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Import Admin Controller
const adminController = require('./adminController');

// --- SUPER ADMIN API ---

// Account Management
app.post('/api/admin/create-account', basicAuth, adminController.createAccount);
app.post('/api/admin/create-account-enhanced', basicAuth, adminController.createAccountEnhanced);
app.post('/api/admin/verify-email', adminController.verifyEmail);
app.post('/api/admin/approve-account', basicAuth, adminController.approveAccount);
app.post('/api/admin/reject-account', basicAuth, adminController.rejectAccount);
app.get('/api/admin/pending-accounts', basicAuth, adminController.getPendingAccounts);
app.post('/api/admin/toggle-status', basicAuth, adminController.toggleAccountStatus);
app.get('/api/admin/accounts', basicAuth, adminController.listAccounts);

// Password Management
app.post('/api/admin/validate-password', basicAuth, adminController.validatePassword);
app.post('/api/admin/change-password', basicAuth, adminController.changePassword);

// MFA Management
app.post('/api/admin/mfa/setup', basicAuth, adminController.setupMFA);
app.post('/api/admin/mfa/verify', basicAuth, adminController.verifyMFA);
app.post('/api/admin/mfa/verify-backup', basicAuth, adminController.verifyBackupCode);
app.get('/api/admin/mfa/status/:userId', basicAuth, adminController.getMFAStatus);
app.post('/api/admin/mfa/regenerate-codes', basicAuth, adminController.regenerateBackupCodes);

// Session Management
app.get('/api/admin/sessions/:userId', basicAuth, adminController.getSessions);
app.post('/api/admin/logout-all', basicAuth, adminController.logoutAllSessions);

// Audit Logs
app.get('/api/admin/audit-logs', basicAuth, adminController.getAuditLogs);

// ==================== PUBLIC AUTH ENDPOINT ====================
// This endpoint is used for login - no basicAuth required
const bcrypt = require('bcryptjs');
app.post('/api/auth/login', async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ success: false, error: 'Password required' });
    }

    try {
        const db = admin.firestore();
        const snapshot = await db.collection('admin_users').get();

        for (const doc of snapshot.docs) {
            const userData = doc.data();

            // Check if account is active first
            if (!userData.active) continue;

            // Check bcrypt hash
            if (userData.passwordHash) {
                const match = await bcrypt.compare(password, userData.passwordHash);
                if (match) {
                    // Log successful login
                    await db.collection('audit_logs').add({
                        action: 'LOGIN_SUCCESS',
                        targetId: doc.id,
                        targetName: userData.username,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });

                    return res.json({
                        success: true,
                        user: {
                            id: doc.id,
                            username: userData.username,
                            role: userData.role || 'admin',
                            active: userData.active,
                            avatar: userData.avatar,
                            mfaEnabled: userData.mfaEnabled || false
                        }
                    });
                }
            }

            // Legacy: Check plain text password (migration support)
            if (userData.password && userData.password === password) {
                // Log and return
                await db.collection('audit_logs').add({
                    action: 'LOGIN_SUCCESS_LEGACY',
                    targetId: doc.id,
                    targetName: userData.username,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });

                return res.json({
                    success: true,
                    user: {
                        id: doc.id,
                        username: userData.username,
                        role: userData.role || 'admin',
                        active: userData.active,
                        avatar: userData.avatar,
                        mfaEnabled: userData.mfaEnabled || false
                    },
                    warning: 'Password migration recommended'
                });
            }
        }

        // No match found
        await db.collection('audit_logs').add({
            action: 'LOGIN_FAILED',
            reason: 'Invalid credentials',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(401).json({ success: false, error: 'Invalid password' });
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({ success: false, error: 'Authentication system error' });
    }
});


// Start Server
app.listen(port, () => {
    console.log(`🚀 Server listening at http://localhost:${port}`);
    console.log(`📍 OwnTracks webhook: POST /api/owntracks/location`);
    console.log(`🤖 Telegram registration: POST /api/telegram/register`);
    console.log(`🔐 Admin API: POST /api/admin/*`);
    console.log(`🔑 Security APIs:`);
    console.log(`   - Login: POST /api/auth/login`);
    console.log(`   - Password validation: POST /api/admin/validate-password`);
    console.log(`   - MFA setup: POST /api/admin/mfa/setup`);
    console.log(`   - Audit logs: GET /api/admin/audit-logs`);

    if (TELEGRAM_BOT_TOKEN) {
        console.log(`✅ Telegram Bot is ACTIVE`);
    } else {
        console.log(`⚠️  Telegram Bot is DISABLED (no token provided)`);
        console.log(`   Set TELEGRAM_BOT_TOKEN environment variable to enable`);
    }
});
