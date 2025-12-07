/**
 * Enhanced Admin Controller
 * Comprehensive Super Admin API with security, MFA, and account lifecycle
 */

const admin = require('firebase-admin');
const passwordService = require('./passwordService');
const mfaService = require('./mfaService');
const accountService = require('./accountService');
const securityMiddleware = require('./securityMiddleware');

// Firebase Admin initialization check
let isFirebaseInitialized = false;

try {
    // Check if already initialized
    admin.app();
    isFirebaseInitialized = true;
} catch (e) {
    try {
        const serviceAccount = process.env.SERVICE_ACCOUNT_KEY
            ? JSON.parse(process.env.SERVICE_ACCOUNT_KEY)
            : require('./serviceAccountKey.json');

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        isFirebaseInitialized = true;
        console.log('✅ Firebase Admin Initialized successfully');
    } catch (error) {
        console.warn('⚠️ Firebase Admin could not be initialized.');
    }
}

// ==================== ACCOUNT MANAGEMENT ====================

/**
 * Create a new account with full validation
 * POST /api/admin/create-account
 */
exports.createAccountEnhanced = async (req, res) => {
    if (!isFirebaseInitialized) {
        return res.status(503).json({ error: 'Firebase Admin not configured' });
    }

    const { email, username, password, displayName } = req.body;
    const createdBy = req.adminUser?.id || 'system';

    // Validate required fields
    if (!email || !username || !password) {
        return res.status(400).json({
            error: 'Missing required fields',
            required: ['email', 'username', 'password']
        });
    }

    try {
        const result = await accountService.createAccount(
            { email, username, password, displayName },
            createdBy
        );

        if (!result.success) {
            return res.status(400).json({
                error: 'Validation failed',
                errors: result.errors
            });
        }

        // Log action
        await securityMiddleware.auditLog('CREATE_ACCOUNT', {
            targetId: result.accountId,
            performedBy: createdBy,
            email,
            username
        });

        res.status(201).json({
            success: true,
            accountId: result.accountId,
            message: 'Account created. Pending email verification.'
        });
    } catch (error) {
        console.error('Error creating account:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Verify email token
 * POST /api/admin/verify-email
 */
exports.verifyEmail = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Verification token required' });
    }

    const result = await accountService.verifyEmail(token);

    if (!result.success) {
        return res.status(400).json({ error: result.message });
    }

    res.json({ success: true, message: 'Email verified. Awaiting admin approval.' });
};

/**
 * Approve pending account
 * POST /api/admin/approve-account
 */
exports.approveAccount = async (req, res) => {
    const { accountId } = req.body;
    const approvedBy = req.adminUser?.id || 'system';

    if (!accountId) {
        return res.status(400).json({ error: 'Account ID required' });
    }

    const result = await accountService.approveAccount(accountId, approvedBy);

    if (!result.success) {
        return res.status(400).json({ error: result.message });
    }

    res.json({ success: true, message: 'Account approved and activated.' });
};

/**
 * Reject pending account
 * POST /api/admin/reject-account
 */
exports.rejectAccount = async (req, res) => {
    const { accountId, reason } = req.body;
    const rejectedBy = req.adminUser?.id || 'system';

    if (!accountId) {
        return res.status(400).json({ error: 'Account ID required' });
    }

    const result = await accountService.rejectAccount(accountId, rejectedBy, reason);

    if (!result.success) {
        return res.status(400).json({ error: result.message });
    }

    res.json({ success: true, message: 'Account rejected.' });
};

/**
 * Get pending accounts
 * GET /api/admin/pending-accounts
 */
exports.getPendingAccounts = async (req, res) => {
    try {
        const accounts = await accountService.getPendingAccounts();
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ==================== PASSWORD MANAGEMENT ====================

/**
 * Validate password (real-time)
 * POST /api/admin/validate-password
 */
exports.validatePassword = async (req, res) => {
    const { password, userId, excludeUserId } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Password required' });
    }

    try {
        const result = await passwordService.validatePassword(password, userId, excludeUserId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Change password
 * POST /api/admin/change-password
 */
exports.changePassword = async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    const performedBy = req.adminUser?.id || 'system';

    if (!userId || !newPassword) {
        return res.status(400).json({ error: 'userId and newPassword required' });
    }

    try {
        const db = admin.firestore();
        const userRef = db.collection('admin_users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();

        // Verify current password if provided (self-change)
        if (currentPassword) {
            const isValid = userData.passwordHash
                ? await passwordService.comparePassword(currentPassword, userData.passwordHash)
                : userData.password === currentPassword;

            if (!isValid) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
        }

        // Validate new password
        const validation = await passwordService.validatePassword(newPassword, userId, userId);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Password validation failed',
                errors: validation.errors
            });
        }

        // Hash and update
        const newHash = await passwordService.hashPassword(newPassword);
        await userRef.update({
            passwordHash: newHash,
            password: admin.firestore.FieldValue.delete(),
            passwordChangedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Add to history
        await passwordService.addToPasswordHistory(userId, newHash);

        // Audit log
        await securityMiddleware.auditLog('PASSWORD_CHANGED', {
            targetId: userId,
            performedBy,
            selfChange: performedBy === userId
        });

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: error.message });
    }
};

// ==================== MFA MANAGEMENT ====================

/**
 * Setup MFA for user
 * POST /api/admin/mfa/setup
 */
exports.setupMFA = async (req, res) => {
    const { userId, username } = req.body;

    if (!userId || !username) {
        return res.status(400).json({ error: 'userId and username required' });
    }

    try {
        const result = await mfaService.generateMFASecret(userId, username);
        res.json({
            success: true,
            qrCode: result.qrCodeDataUrl,
            backupCodes: result.backupCodes,
            message: 'Scan QR code with authenticator app, then verify with a code'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Verify MFA token
 * POST /api/admin/mfa/verify
 */
exports.verifyMFA = async (req, res) => {
    const { userId, token } = req.body;

    if (!userId || !token) {
        return res.status(400).json({ error: 'userId and token required' });
    }

    try {
        const result = await mfaService.verifyTOTP(userId, token);

        if (!result.valid) {
            return res.status(401).json({ error: result.message });
        }

        res.json({ success: true, message: 'MFA verified' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Verify backup code
 * POST /api/admin/mfa/verify-backup
 */
exports.verifyBackupCode = async (req, res) => {
    const { userId, code } = req.body;

    if (!userId || !code) {
        return res.status(400).json({ error: 'userId and code required' });
    }

    try {
        const result = await mfaService.verifyBackupCode(userId, code);

        if (!result.valid) {
            return res.status(401).json({ error: result.message });
        }

        res.json({
            success: true,
            message: 'Backup code verified',
            remainingCodes: result.remainingCodes
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get MFA status
 * GET /api/admin/mfa/status/:userId
 */
exports.getMFAStatus = async (req, res) => {
    const { userId } = req.params;

    try {
        const status = await mfaService.getMFAStatus(userId);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Regenerate backup codes
 * POST /api/admin/mfa/regenerate-codes
 */
exports.regenerateBackupCodes = async (req, res) => {
    const { userId } = req.body;
    const performedBy = req.adminUser?.id || 'system';

    if (!userId) {
        return res.status(400).json({ error: 'userId required' });
    }

    try {
        const codes = await mfaService.regenerateBackupCodes(userId);

        await securityMiddleware.auditLog('MFA_BACKUP_CODES_REGENERATED', {
            targetId: userId,
            performedBy
        });

        res.json({
            success: true,
            backupCodes: codes,
            message: 'New backup codes generated. Save these securely.'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ==================== SESSION MANAGEMENT ====================

/**
 * Get active sessions
 * GET /api/admin/sessions/:userId
 */
exports.getSessions = async (req, res) => {
    const { userId } = req.params;

    try {
        const db = admin.firestore();
        const snapshot = await db.collection('admin_users').doc(userId)
            .collection('sessions')
            .where('active', '==', true)
            .orderBy('createdAt', 'desc')
            .get();

        const sessions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Logout all sessions
 * POST /api/admin/logout-all
 */
exports.logoutAllSessions = async (req, res) => {
    const { userId, reason } = req.body;
    const performedBy = req.adminUser?.id || 'system';

    if (!userId) {
        return res.status(400).json({ error: 'userId required' });
    }

    try {
        const result = await securityMiddleware.invalidateAllSessions(userId, reason || 'admin_action');

        await securityMiddleware.auditLog('LOGOUT_ALL_SESSIONS', {
            targetId: userId,
            performedBy,
            sessionsInvalidated: result.invalidatedCount
        });

        res.json({
            success: true,
            message: `${result.invalidatedCount} sessions terminated`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ==================== AUDIT LOGS ====================

/**
 * Get audit logs
 * GET /api/admin/audit-logs
 */
exports.getAuditLogs = async (req, res) => {
    const { limit = 100, action, userId } = req.query;

    try {
        const db = admin.firestore();
        let query = db.collection('audit_logs').orderBy('timestamp', 'desc').limit(parseInt(limit));

        if (action) {
            query = query.where('action', '==', action);
        }

        if (userId) {
            query = query.where('performedBy', '==', userId);
        }

        const snapshot = await query.get();
        const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ==================== LEGACY SUPPORT ====================

/**
 * Create account (legacy - simple mode)
 */
exports.createAccount = async (req, res) => {
    if (!isFirebaseInitialized) {
        return res.status(503).json({ error: 'Firebase Admin not configured' });
    }

    const { email, password, accountName, initialAdminName } = req.body;

    if (!email || !password || !accountName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Validate password first
        const validation = await passwordService.validatePassword(password);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Password validation failed',
                errors: validation.errors,
                strength: validation.strength
            });
        }

        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: initialAdminName || 'Admin',
        });

        await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: 'admin',
            accountId: userRecord.uid
        });

        const db = admin.firestore();
        await db.collection('accounts').doc(userRecord.uid).set({
            accountName,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active',
            ownerEmail: email,
            ownerId: userRecord.uid
        });

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            accountId: userRecord.uid
        });
    } catch (error) {
        console.error('Error creating account:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Toggle account status (legacy)
 */
exports.toggleAccountStatus = async (req, res) => {
    if (!isFirebaseInitialized) {
        return res.status(503).json({ error: 'Firebase Admin not configured' });
    }

    const { uid, disabled } = req.body;

    if (!uid || typeof disabled !== 'boolean') {
        return res.status(400).json({ error: 'uid and disabled (boolean) are required' });
    }

    try {
        await admin.auth().updateUser(uid, { disabled });

        const db = admin.firestore();
        await db.collection('accounts').doc(uid).update({
            status: disabled ? 'disabled' : 'active',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        if (disabled) {
            await admin.auth().revokeRefreshTokens(uid);
        }

        res.json({ success: true, message: `Account ${disabled ? 'disabled' : 'enabled'} successfully` });
    } catch (error) {
        console.error('Error updating account status:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * List all accounts (legacy)
 */
exports.listAccounts = async (req, res) => {
    if (!isFirebaseInitialized) {
        return res.status(503).json({ error: 'Firebase Admin not configured' });
    }

    try {
        const db = admin.firestore();
        const snapshot = await db.collection('accounts').get();

        const accounts = [];
        snapshot.forEach(doc => {
            accounts.push({ id: doc.id, ...doc.data() });
        });

        res.json(accounts);
    } catch (error) {
        console.error('Error listing accounts:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = exports;
