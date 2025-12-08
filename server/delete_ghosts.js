
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const pathsToDelete = [
    'drivers/0zxDCUi0dUV47eGWopFF', // Abdusattor
    'drivers/L56A06cSztPAkxO1A65P', // Mirjalol
    'drivers/NJn3O9Cqz9sih7CzL98t'  // Josh
];

async function deleteGhosts() {
    console.log("🔥 Starting Hard Delete of Ghost Drivers...");

    for (const path of pathsToDelete) {
        try {
            await db.doc(path).delete();
            console.log(`✅ Deleted: ${path}`);
        } catch (e) {
            console.error(`❌ Failed to delete ${path}:`, e.message);
        }
    }

    console.log("🎉 Cleanup Complete.");
}

deleteGhosts();
