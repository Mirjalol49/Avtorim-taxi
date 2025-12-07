/**
 * Quick cleanup script - removes all accounts except mirjalol
 */
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function cleanup() {
    const snap = await db.collection('admin_users').get();
    console.log('BEFORE:', snap.size, 'accounts');

    for (const doc of snap.docs) {
        const data = doc.data();
        if (data.username !== 'mirjalol') {
            console.log('DELETING:', doc.id, data.username);
            await db.collection('admin_users').doc(doc.id).delete();
        } else {
            console.log('KEEPING:', doc.id, data.username);
        }
    }

    const after = await db.collection('admin_users').get();
    console.log('AFTER:', after.size, 'accounts');
    after.forEach(d => console.log('  -', d.id, d.data().username));
    process.exit(0);
}
cleanup().catch(e => { console.error(e); process.exit(1); });
