/**
 * Debug notifications - check why they're not showing
 */
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function check() {
    const now = Date.now();
    console.log('Current time:', now, new Date(now).toLocaleString());

    const notifs = await db.collection('notifications').orderBy('createdAt', 'desc').limit(5).get();
    console.log('\nRecent notifications:');
    notifs.forEach(doc => {
        const d = doc.data();
        const expired = d.expiresAt <= now;
        console.log('- ID:', doc.id);
        console.log('  Title:', d.title);
        console.log('  Target:', d.targetUsers);
        console.log('  CreatedAt:', d.createdAt, new Date(d.createdAt).toLocaleString());
        console.log('  ExpiresAt:', d.expiresAt, new Date(d.expiresAt).toLocaleString());
        console.log('  Expired?:', expired ? 'YES!' : 'No');
        console.log('');
    });

    // Check admin account createdAt
    const admins = await db.collection('admin_users').get();
    console.log('Admin accounts:');
    admins.forEach(doc => {
        const d = doc.data();
        console.log('- User:', d.username, 'ID:', doc.id, 'CreatedAt:', d.createdAt || 'MISSING');
    });

    // Check notification_deletes collection
    console.log('\nNotification deletes:');
    const deletes = await db.collection('notification_deletes').get();
    console.log('Total deletes:', deletes.size);
    if (deletes.size > 0) {
        deletes.forEach(doc => {
            const d = doc.data();
            console.log('  - User:', d.userId, 'NotifID:', d.notificationId);
        });
    }

    process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
