const admin = require('firebase-admin');
const path = require('path');

// Service Account setup
try {
    // Try to find the service account key
    // It might be in server/serviceAccountKey.json or just serviceAccountKey.json
    let serviceAccount;
    try {
        serviceAccount = require('./server/serviceAccountKey.json');
    } catch (e) {
        serviceAccount = require('./serviceAccountKey.json');
    }

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
    const snapshot = await db.collection('drivers').limit(5).get();

    console.log(`Found ${snapshot.size} drivers.`);
    snapshot.forEach(doc => {
        const data = doc.data();
        // Log all keys to see field names
        console.log(`ID: ${doc.id}`);
        console.log(`Fields: ${Object.keys(data).join(', ')}`);
        console.log(`Phone values:`, {
            phone: data.phone,
            phoneNumber: data.phoneNumber,
            mobile: data.mobile,
            contact: data.contact,
            tel: data.tel
        });
        console.log('---');
    });
}

checkPhones().catch(err => {
    console.error(err);
    process.exit(1);
});
