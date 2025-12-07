/**
 * Full System Remediation Script
 * Cleans up all admin accounts and establishes a clean, secure state
 * 
 * Run: node remediate-admins.js
 */

const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const SALT_ROUNDS = 12;

// Configuration: Which account to keep as the primary super admin
const PRIMARY_SUPER_ADMIN = {
    username: 'mirjalol',
    password: 'mirjalol4941',
    role: 'super_admin'
};

async function remediate() {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║        SUPER ADMIN REMEDIATION SCRIPT                         ║
║        Cleaning up and securing admin accounts                ║
╚═══════════════════════════════════════════════════════════════╝
`);

    try {
        // Step 1: Get all current admin accounts
        console.log('📋 Step 1: Fetching all admin accounts...');
        const snapshot = await db.collection('admin_users').get();
        console.log(`   Found ${snapshot.size} accounts\n`);

        // Step 2: Delete all existing accounts
        console.log('🗑️  Step 2: Removing all existing accounts...');
        const batch = db.batch();
        snapshot.forEach(doc => {
            console.log(`   Deleting: ${doc.data().username} (${doc.id})`);
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log('   ✅ All old accounts deleted\n');

        // Step 3: Create clean primary super admin with hashed password
        console.log('👤 Step 3: Creating clean super admin account...');
        const passwordHash = await bcrypt.hash(PRIMARY_SUPER_ADMIN.password, SALT_ROUNDS);

        const newAccountRef = db.collection('admin_users').doc();
        await newAccountRef.set({
            username: PRIMARY_SUPER_ADMIN.username,
            passwordHash: passwordHash,
            role: PRIMARY_SUPER_ADMIN.role,
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'system_remediation',
            securityLevel: 'bcrypt_hashed',
            mfaEnabled: false
        });

        // Add initial password to history
        await newAccountRef.collection('password_history').add({
            hash: passwordHash,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`   ✅ Created: ${PRIMARY_SUPER_ADMIN.username}`);
        console.log(`   🔐 Password: Hashed with bcrypt (${SALT_ROUNDS} rounds)`);
        console.log(`   📍 ID: ${newAccountRef.id}\n`);

        // Step 4: Log remediation action
        console.log('📝 Step 4: Logging remediation to audit trail...');
        await db.collection('audit_logs').add({
            action: 'SYSTEM_REMEDIATION',
            details: {
                accountsDeleted: snapshot.size,
                newAccountCreated: PRIMARY_SUPER_ADMIN.username,
                passwordSecured: true,
                timestamp: new Date().toISOString()
            },
            performedBy: 'remediate-admins.js',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('   ✅ Audit log created\n');

        // Step 5: Verify the new state
        console.log('✅ Step 5: Verification...');
        const verifySnapshot = await db.collection('admin_users').get();
        console.log(`   Total accounts now: ${verifySnapshot.size}`);

        verifySnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`   • ${data.username} (${data.role}) - Hash: ${data.passwordHash ? 'Yes' : 'No'}`);
        });

        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    REMEDIATION COMPLETE                       ║
╠═══════════════════════════════════════════════════════════════╣
║  ✅ Deleted ${String(snapshot.size).padEnd(2)} duplicate/insecure accounts                    ║
║  ✅ Created 1 clean super admin account                       ║
║  ✅ Password hashed with bcrypt                               ║
║  ✅ Audit trail updated                                       ║
╠═══════════════════════════════════════════════════════════════╣
║  LOGIN CREDENTIALS:                                           ║
║    Username: ${PRIMARY_SUPER_ADMIN.username.padEnd(45)}║
║    Password: ${PRIMARY_SUPER_ADMIN.password.padEnd(45)}║
╚═══════════════════════════════════════════════════════════════╝
`);

    } catch (error) {
        console.error('❌ Remediation failed:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

remediate();
