const admin = require('firebase-admin');
const path = require('path');

// Service Account setup
try {
    const serviceAccount = require('./server/serviceAccountKey.json');
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
} catch (e) {
    console.error("Setup error:", e.message);
    process.exit(1);
}

async function checkPhones() {
    const db = admin.firestore();
    const snapshot = await db.collection('drivers').limit(10).get();

    console.log(`Found ${snapshot.size} drivers.`);
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}`);
        console.log(`Keys: ${Object.keys(data)}`);
        // Check likely phone fields
        const p = data.phone || data.phoneNumber || data.mobile || data.contact;
        console.log(`Phone Value: '${p}'`);
        console.log('---');
    });
}

checkPhones().catch(console.error);
