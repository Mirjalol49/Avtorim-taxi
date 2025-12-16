
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize App
let serviceAccount;
try {
    serviceAccount = require('./serviceAccountKey.json');
} catch (e) {
    console.error('Error loading serviceAccountKey.json:', e);
    process.exit(1);
}

const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function testId(id) {
    console.log(`\n🧪 Testing Database ID: "${id}" ...`);
    try {
        // In firebase-admin, passing internal ID to getFirestore retrieves that named instance
        const db = getFirestore(app, id);
        const collections = await db.listCollections();
        console.log(`✅ SUCCESS! Found ${collections.length} collections.`);
        return true;
    } catch (e) {
        console.log(`❌ FAILED: ${e.code} - ${e.message}`);
        return false;
    }
}

async function testDefault() {
    console.log(`\n🧪 Testing Default (no ID provided) ...`);
    try {
        const db = getFirestore(app);
        const collections = await db.listCollections();
        console.log(`✅ SUCCESS! Found ${collections.length} collections.`);
        return true;
    } catch (e) {
        console.log(`❌ FAILED: ${e.code} - ${e.message}`);
        return false;
    }
}

async function run() {
    await testDefault();
    await testId('default'); // Named 'default'
    await testId('(default)'); // Standard default
    await testId('taksapark-3e375'); // Project ID
}

run();
