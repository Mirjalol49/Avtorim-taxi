const admin = require('firebase-admin');

// Service Account setup
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

async function checkPhones() {
    const db = admin.firestore();
    const snapshot = await db.collection('drivers').get();

    console.log(`Found ${snapshot.size} drivers.`);
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}`);
        console.log(`Keys: ${Object.keys(data).join(', ')}`);
        console.log('Phone Data:', {
            phone: data.phone,
            phoneNumber: data.phoneNumber,
            mobile: data.mobile,
            contact: data.contact,
            normalized: data.phone ? data.phone.replace(/\D/g, '') : 'N/A'
        });
        console.log('---');
    });
}

checkPhones().catch(console.error);
