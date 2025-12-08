const admin = require('firebase-admin');

try {
    const serviceAccount = require('./serviceAccountKey.json');
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
} catch (e) {
    console.error("Setup error:", e.message);
    process.exit(1);
}

// Target numbers to check (raw and robust)
const targets = ['+998 93 748 91 41', '998937489141', '937489141'];

async function checkSpecificPhone() {
    const db = admin.firestore();
    const snapshot = await db.collection('drivers').get();

    console.log(`Scanning ${snapshot.size} drivers...`);
    let found = false;

    snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.phone) return;

        const dbPhone = data.phone;
        const normalized = dbPhone.replace(/\D/g, '');

        // Check fuzzy match
        if (normalized.includes('937489141')) {
            console.log(`✅ FOUND A MATCH!`);
            console.log(`ID: ${doc.id}`);
            console.log(`DB Phone: '${dbPhone}'`);
            console.log(`Normalized: '${normalized}'`);
            console.log(`Telegram ID: ${data.telegramId || 'None'}`);
            found = true;
        }
    });

    if (!found) {
        console.log("❌ NO MATCH FOUND for 93 748 91 41");
    }
}

checkSpecificPhone().catch(console.error);
