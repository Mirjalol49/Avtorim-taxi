
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findDriver(phoneSuffix) {
    console.log(`Searching for driver with phone suffix: ${phoneSuffix}...`);
    const snapshot = await db.collectionGroup('drivers').get();

    let found = false;
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.phone) {
            const p = data.phone.toString().replace(/\D/g, '');
            if (p.endsWith(phoneSuffix)) {
                console.log("------------------------------------------------");
                console.log("✅ MATCH FOUND");
                console.log("PATH:      ", doc.ref.path);
                console.log("NAME:      ", data.name || data.firstName || 'Unknown');
                console.log("PHONE:     ", data.phone);
                console.log("IS DELETED:", data.isDeleted);
                console.log("------------------------------------------------");
                found = true;
            }
        }
    });

    if (!found) {
        console.log("❌ No driver found with that number.");
    }
}

findDriver('937489141');
