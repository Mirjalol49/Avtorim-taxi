/**
 * Account Service
 * Handles account creation, verification, lifecycle management
 */

const admin = require('firebase-admin');
const passwordService = require('./passwordService');
const crypto = require('crypto');

const PENDING_EXPIRATION_HOURS = 72;
const INACTIVE_FLAG_DAYS = 90;
const INACTIVE_ARCHIVE_DAYS = 120;

/**
 * Create a new account (pending approval)
 * @param {Object} data - { email, username, password, displayName }
 * @param {string} createdBy - Admin who created the account
 * @returns {Promise<{ success: boolean, accountId?: string, verificationToken?: string, errors?: string[] }>}
 */
const createAccount = async (data, createdBy) => {
    const { email, username, password, displayName } = data;
    const db = admin.firestore();

    try {
        // 1. Validate unique email/username
        const uniqueCheck = await checkUniqueness(email, username);
        if (!uniqueCheck.unique) {
            return { success: false, errors: uniqueCheck.errors };
        }

        // 2. Validate password
        const passwordValidation = await passwordService.validatePassword(password);
        if (!passwordValidation.valid) {
            return { success: false, errors: passwordValidation.errors };
        }

        // 3. Hash password
        const passwordHash = await passwordService.hashPassword(password);

        // 4. Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + (PENDING_EXPIRATION_HOURS * 60 * 60 * 1000);

        // 5. Create account in pending state
        const accountRef = db.collection('admin_users').doc();
        await accountRef.set({
            email,
            username,
            displayName: displayName || username,
            passwordHash,
            role: 'admin',
            status: 'pending_verification',
            verificationToken,
            verificationExpiresAt: expiresAt,
            active: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy,
            lastActivity: admin.firestore.FieldValue.serverTimestamp()
        });

        // 6. Add to password history
        await passwordService.addToPasswordHistory(accountRef.id, passwordHash);

        // 7. Audit log
        await db.collection('audit_logs').add({
            action: 'ACCOUNT_CREATED',
            targetId: accountRef.id,
            targetEmail: email,
            targetUsername: username,
            status: 'pending_verification',
            performedBy: createdBy,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            accountId: accountRef.id,
            verificationToken
        };
    } catch (error) {
        console.error('Error creating account:', error);
        return { success: false, errors: [error.message] };
    }
};

/**
 * Verify email and move to pending_approval
 * @param {string} token - Verification token
 */
const verifyEmail = async (token) => {
    const db = admin.firestore();

    try {
        const snapshot = await db.collection('admin_users')
            .where('verificationToken', '==', token)
            .where('status', '==', 'pending_verification')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return { success: false, message: 'Invalid or expired verification token' };
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        if (data.verificationExpiresAt < Date.now()) {
            return { success: false, message: 'Verification token has expired' };
        }

        await doc.ref.update({
            status: 'pending_approval',
            emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            verificationToken: admin.firestore.FieldValue.delete()
        });

        return { success: true, accountId: doc.id };
    } catch (error) {
        console.error('Error verifying email:', error);
        return { success: false, message: error.message };
    }
};

/**
 * Approve account (admin action)
 * @param {string} accountId - Account to approve
 * @param {string} approvedBy - Admin who approved
 */
const approveAccount = async (accountId, approvedBy) => {
    const db = admin.firestore();

    try {
        const accountRef = db.collection('admin_users').doc(accountId);
        const doc = await accountRef.get();

        if (!doc.exists || doc.data().status !== 'pending_approval') {
            return { success: false, message: 'Account not found or not pending approval' };
        }

        await accountRef.update({
            status: 'active',
            active: true,
            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            approvedBy
        });

        // Audit log
        await db.collection('audit_logs').add({
            action: 'ACCOUNT_APPROVED',
            targetId: accountId,
            performedBy: approvedBy,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        console.error('Error approving account:', error);
        return { success: false, message: error.message };
    }
};

/**
 * Reject account (admin action)
 * @param {string} accountId - Account to reject
 * @param {string} rejectedBy - Admin who rejected
 * @param {string} reason - Rejection reason
 */
const rejectAccount = async (accountId, rejectedBy, reason) => {
    const db = admin.firestore();

    try {
        const accountRef = db.collection('admin_users').doc(accountId);

        await accountRef.update({
            status: 'rejected',
            active: false,
            rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
            rejectedBy,
            rejectionReason: reason
        });

        // Audit log
        await db.collection('audit_logs').add({
            action: 'ACCOUNT_REJECTED',
            targetId: accountId,
            reason,
            performedBy: rejectedBy,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        console.error('Error rejecting account:', error);
        return { success: false, message: error.message };
    }
};

/**
 * Check uniqueness of email/username
 */
const checkUniqueness = async (email, username) => {
    const db = admin.firestore();
    const errors = [];

    // Check email
    const emailSnapshot = await db.collection('admin_users')
        .where('email', '==', email)
        .limit(1)
        .get();

    if (!emailSnapshot.empty) {
        errors.push('Email is already registered');
    }

    // Check username
    const usernameSnapshot = await db.collection('admin_users')
        .where('username', '==', username)
        .limit(1)
        .get();

    if (!usernameSnapshot.empty) {
        errors.push('Username is already taken');
    }

    return {
        unique: errors.length === 0,
        errors
    };
};

/**
 * Get accounts pending approval
 */
const getPendingAccounts = async () => {
    const db = admin.firestore();
    const snapshot = await db.collection('admin_users')
        .where('status', '==', 'pending_approval')
        .orderBy('createdAt', 'desc')
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Flag inactive accounts (90+ days)
 */
const flagInactiveAccounts = async () => {
    const db = admin.firestore();
    const cutoff = Date.now() - (INACTIVE_FLAG_DAYS * 24 * 60 * 60 * 1000);

    const snapshot = await db.collection('admin_users')
        .where('status', '==', 'active')
        .where('lastActivity', '<', new Date(cutoff))
        .get();

    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
        batch.update(doc.ref, {
            status: 'inactive_flagged',
            flaggedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        count++;
    });

    if (count > 0) {
        await batch.commit();
    }

    return { flaggedCount: count };
};

/**
 * Archive accounts inactive for 120+ days
 */
const archiveInactiveAccounts = async () => {
    const db = admin.firestore();
    const cutoff = Date.now() - (INACTIVE_ARCHIVE_DAYS * 24 * 60 * 60 * 1000);

    const snapshot = await db.collection('admin_users')
        .where('status', '==', 'inactive_flagged')
        .where('flaggedAt', '<', new Date(cutoff - (30 * 24 * 60 * 60 * 1000))) // 30 days after flagging
        .get();

    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
        // Archive to separate collection
        batch.set(db.collection('archived_accounts').doc(doc.id), {
            ...doc.data(),
            archivedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        batch.delete(doc.ref);
        count++;
    });

    if (count > 0) {
        await batch.commit();
    }

    return { archivedCount: count };
};

/**
 * Update last activity timestamp
 * @param {string} userId - User ID
 */
const updateLastActivity = async (userId) => {
    const db = admin.firestore();
    await db.collection('admin_users').doc(userId).update({
        lastActivity: admin.firestore.FieldValue.serverTimestamp()
    });
};

module.exports = {
    createAccount,
    verifyEmail,
    approveAccount,
    rejectAccount,
    checkUniqueness,
    getPendingAccounts,
    flagInactiveAccounts,
    archiveInactiveAccounts,
    updateLastActivity,
    PENDING_EXPIRATION_HOURS,
    INACTIVE_FLAG_DAYS,
    INACTIVE_ARCHIVE_DAYS
};
