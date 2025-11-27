const express = require('express');
const bodyParser = require('body-parser');
const auth = require('basic-auth');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const TelegramService = require('./telegramService');

const app = express();
const port = 3000;

const cors = require('cors');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Setup
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        createTable();
    }
});

// Initialize Telegram Bot (token from environment variable)
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
            // Initialize Telegram service after database is ready
            telegramService = new TelegramService(TELEGRAM_BOT_TOKEN, db);
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

// Start Server
app.listen(port, () => {
    console.log(`🚀 Server listening at http://localhost:${port}`);
    console.log(`📍 OwnTracks webhook: POST /api/owntracks/location`);
    console.log(`🤖 Telegram registration: POST /api/telegram/register`);
    if (TELEGRAM_BOT_TOKEN) {
        console.log(`✅ Telegram Bot is ACTIVE`);
    } else {
        console.log(`⚠️  Telegram Bot is DISABLED (no token provided)`);
        console.log(`   Set TELEGRAM_BOT_TOKEN environment variable to enable`);
    }
});
