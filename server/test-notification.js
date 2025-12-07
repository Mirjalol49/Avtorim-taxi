/**
 * Test Notification Sending
 * Creates a test notification directly in Firestore
 */
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function testNotification() {
    console.log('📤 Testing notification system...');

    // Check notifications collection
    const existingSnap = await db.collection('notifications').get();
    console.log(`📊 Existing notifications: ${existingSnap.size}`);

    // Create test notification
    const now = Date.now();
    const testNotification = {
        title: 'Test Notification',
        message: 'This is a test notification to verify the system is working.',
        type: 'announcement',
        category: 'announcement',
        priority: 'medium',
        targetUsers: 'all',
        createdBy: 'test_script',
        createdByName: 'Test Script',
        createdAt: now,
        expiresAt: now + (24 * 60 * 60 * 1000), // 24 hours
        deliveryTracking: {
            sent: now,
            delivered: [],
            read: []
        }
    };

    console.log('📝 Creating test notification...');
    const docRef = await db.collection('notifications').add(testNotification);
    console.log(`✅ Created notification: ${docRef.id}`);

    // Verify it was created
    const verifyDoc = await docRef.get();
    if (verifyDoc.exists) {
        console.log('✅ Verification: Notification exists in database');
        console.log('   Title:', verifyDoc.data().title);
        console.log('   Target:', verifyDoc.data().targetUsers);
        console.log('   Expires:', new Date(verifyDoc.data().expiresAt).toLocaleString());
    } else {
        console.log('❌ ERROR: Notification not found after creation!');
    }

    // List all notifications
    const allSnap = await db.collection('notifications').get();
    console.log(`\n📋 All notifications (${allSnap.size}):`);
    allSnap.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: "${data.title}" (${data.type}) expires: ${new Date(data.expiresAt).toLocaleString()}`);
    });

    process.exit(0);
}

testNotification().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
