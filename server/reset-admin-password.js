
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
let serviceAccount;
try {
    serviceAccount = require('./serviceAccountKey.json');
} catch (e) {
    console.error('Error loading serviceAccountKey.json:', e);
    process.exit(1);
}

// Ensure app is not initialized twice (though script runs once)
const app = admin.apps.length ? admin.app() : admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Use the NAMED database 'default' which we confirmed exists (native mode)
// The standard admin.firestore() looks for '(default)' which is missing.
const db = getFirestore(app, 'default');

const NEW_PASSWORD = 'xurshida4941';
const USERNAME = 'mirjalol';

async function resetPassword() {
    console.log(`🔄 Resetting password for super admin "${USERNAME}"...`);

    try {
        const usersRef = db.collection('admin_users');
        const snapshot = await usersRef.where('username', '==', USERNAME).get();

        const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);

        const userData = {
            username: USERNAME,
            password: NEW_PASSWORD, // Legacy field for frontend fallback
            passwordHash: passwordHash,
            role: 'super_admin',
            active: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (snapshot.empty) {
            console.log('⚠️ User not found. Creating new super admin...');
            await usersRef.add({
                ...userData,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: 'system_reset'
            });
            console.log('✅ Created new super admin user.');
        } else {
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.update(doc.ref, userData);
            });
            await batch.commit();
            console.log(`✅ Updated existing super admin user(s).`);
        }

        console.log(`
╔══════════════════════════════════════╗
║      PASSWORD UPDATE SUCCESSFUL      ║
╠══════════════════════════════════════╣
║ Username: ${USERNAME}               ║
║ Password: ${NEW_PASSWORD}           ║
╚══════════════════════════════════════╝
        `);

    } catch (error) {
        console.error('Error resetting password:', error);
    }
}

resetPassword();
