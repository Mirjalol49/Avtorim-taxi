/**
 * Cleanup Script: Remove all admin users except the primary super_admin
 * Run with: node cleanup-admins.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupAdminUsers() {
    console.log('🧹 Starting cleanup of admin_users collection...\n');

    try {
        const snapshot = await db.collection('admin_users').get();

        if (snapshot.empty) {
            console.log('✅ No admin users found. Collection is already clean.');
            return;
        }

        console.log(`Found ${snapshot.size} admin users:`);
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`  - ${data.username} (${data.role}) [ID: ${doc.id}]`);
        });

        console.log('\n🗑️  Deleting all admin users...');

        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log('✅ All admin users deleted successfully!\n');

        // Now create a single clean super_admin account
        console.log('👤 Creating fresh super_admin account...');

        const superAdminRef = db.collection('admin_users').doc();
        await superAdminRef.set({
            username: 'mirjalol',
            password: 'mirjalol4941',
            role: 'super_admin',
            active: true,
            createdAt: Date.now(),
            createdBy: 'system_cleanup'
        });

        console.log('✅ Fresh super_admin "mirjalol" created!');
        console.log('\n🔐 Login credentials:');
        console.log('   Password: mirjalol4941');
        console.log('\n✨ Cleanup complete!');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        process.exit(0);
    }
}

cleanupAdminUsers();
