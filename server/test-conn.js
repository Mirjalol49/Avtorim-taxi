
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testConnection() {
    console.log('📡 Testing connection to Firestore...');
    console.log(`Resource Path: projects/${serviceAccount.project_id}/databases/(default)`);

    try {
        const collections = await db.listCollections();
        console.log('✅ Connection Successful!');
        console.log('Collections found:', collections.map(c => c.id));
    } catch (error) {
        console.error('❌ Connection Failed!');
        console.error('Code:', error.code);
        console.error('Details:', error.message);

        if (error.code === 5) { // NOT_FOUND
            console.log('\nPossible causes for NOT_FOUND:');
            console.log('1. The Firestore database has NOT been created yet in the Console.');
            console.log('2. It was created in "Datastore Mode" instead of "Native Mode".');
            console.log('3. It is not named "(default)".');
        }
    }
}

testConnection();
