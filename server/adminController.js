/**
 * Admin Controller
 * Comprehensive Super Admin API with security, MFA, and account lifecycle
 */

const { supabase } = require('./supabaseAdmin');
const passwordService = require('./passwordService');
const mfaService = require('./mfaService');
const accountService = require('./accountService');
const securityMiddleware = require('./securityMiddleware');

// ==================== ACCOUNT MANAGEMENT ====================

exports.createAccountEnhanced = async (req, res) => {
    const { email, username, password, displayName } = req.body;
    const createdBy = req.adminUser?.id || 'system';

    if (!email || !username || !password) {
        return res.status(400).json({ error: 'Missing required fields', required: ['email', 'username', 'password'] });
    }

    try {
        const result = await accountService.createAccount({ email, username, password, displayName }, createdBy);

        if (!result.success) {
            return res.status(400).json({ error: 'Validation failed', errors: result.errors });
        }

        await securityMiddleware.auditLog('CREATE_ACCOUNT', {
            userId: createdBy,
            targetId: result.accountId,
            metadata: { email, username }
        });

        res.status(201).json({ success: true, accountId: result.accountId, message: 'Account created. Pending email verification.' });
    } catch (error) {
        console.error('Error creating account:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.verifyEmail = async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Verification token required' });

    const result = await accountService.verifyEmail(token);
    if (!result.success) return res.status(400).json({ error: result.message });

    res.json({ success: true, message: 'Email verified. Awaiting admin approval.' });
};

exports.approveAccount = async (req, res) => {
    const { accountId } = req.body;
    const approvedBy = req.adminUser?.id || 'system';
    if (!accountId) return res.status(400).json({ error: 'Account ID required' });

    const result = await accountService.approveAccount(accountId, approvedBy);
    if (!result.success) return res.status(400).json({ error: result.message });

    res.json({ success: true, message: 'Account approved and activated.' });
};

exports.rejectAccount = async (req, res) => {
    const { accountId, reason } = req.body;
    const rejectedBy = req.adminUser?.id || 'system';
    if (!accountId) return res.status(400).json({ error: 'Account ID required' });

    const result = await accountService.rejectAccount(accountId, rejectedBy, reason);
    if (!result.success) return res.status(400).json({ error: result.message });

    res.json({ success: true, message: 'Account rejected.' });
};

exports.getPendingAccounts = async (req, res) => {
    try {
        const accounts = await accountService.getPendingAccounts();
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ==================== PASSWORD MANAGEMENT ====================

exports.validatePassword = async (req, res) => {
    const { password, userId, excludeUserId } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    try {
        const result = await passwordService.validatePassword(password, userId, excludeUserId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.changePassword = async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    const performedBy = req.adminUser?.id || 'system';

    if (!userId || !newPassword) {
        return res.status(400).json({ error: 'userId and newPassword required' });
    }

    try {
        const { data: userRow } = await supabase.from('admin_users').select('password_hash, password').eq('id', userId).single();
        if (!userRow) return res.status(404).json({ error: 'User not found' });

        if (currentPassword) {
            const isValid = userRow.password_hash
                ? await passwordService.comparePassword(currentPassword, userRow.password_hash)
                : userRow.password === currentPassword;
            if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const validation = await passwordService.validatePassword(newPassword, userId, userId);
        if (!validation.valid) {
            return res.status(400).json({ error: 'Password validation failed', errors: validation.errors });
        }

        const newHash = await passwordService.hashPassword(newPassword);
        await supabase.from('admin_users').update({ password_hash: newHash, password: null }).eq('id', userId);
        await passwordService.addToPasswordHistory(userId, newHash);

        await securityMiddleware.auditLog('PASSWORD_CHANGED', {
            userId: performedBy,
            targetId: userId,
            metadata: { selfChange: performedBy === userId }
        });

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: error.message });
    }
};

// ==================== MFA MANAGEMENT ====================

exports.setupMFA = async (req, res) => {
    const { userId, username } = req.body;
    if (!userId || !username) return res.status(400).json({ error: 'userId and username required' });

    try {
        const result = await mfaService.generateMFASecret(userId, username);
        res.json({ success: true, qrCode: result.qrCodeDataUrl, backupCodes: result.backupCodes, message: 'Scan QR code with authenticator app, then verify with a code' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.verifyMFA = async (req, res) => {
    const { userId, token } = req.body;
    if (!userId || !token) return res.status(400).json({ error: 'userId and token required' });

    try {
        const result = await mfaService.verifyTOTP(userId, token);
        if (!result.valid) return res.status(401).json({ error: result.message });
        res.json({ success: true, message: 'MFA verified' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.verifyBackupCode = async (req, res) => {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ error: 'userId and code required' });

    try {
        const result = await mfaService.verifyBackupCode(userId, code);
        if (!result.valid) return res.status(401).json({ error: result.message });
        res.json({ success: true, message: 'Backup code verified', remainingCodes: result.remainingCodes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getMFAStatus = async (req, res) => {
    const { userId } = req.params;
    try {
        const status = await mfaService.getMFAStatus(userId);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.regenerateBackupCodes = async (req, res) => {
    const { userId } = req.body;
    const performedBy = req.adminUser?.id || 'system';
    if (!userId) return res.status(400).json({ error: 'userId required' });

    try {
        const codes = await mfaService.regenerateBackupCodes(userId);
        await securityMiddleware.auditLog('MFA_BACKUP_CODES_REGENERATED', { userId: performedBy, targetId: userId });
        res.json({ success: true, backupCodes: codes, message: 'New backup codes generated. Save these securely.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ==================== SESSION MANAGEMENT ====================

exports.getSessions = async (req, res) => {
    const { userId } = req.params;
    try {
        const sessions = await accountService.getSessions(userId);
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.logoutAllSessions = async (req, res) => {
    const { userId, reason } = req.body;
    const performedBy = req.adminUser?.id || 'system';
    if (!userId) return res.status(400).json({ error: 'userId required' });

    try {
        const result = await securityMiddleware.invalidateAllSessions(userId, reason || 'admin_action');
        await securityMiddleware.auditLog('LOGOUT_ALL_SESSIONS', { userId: performedBy, targetId: userId, metadata: { sessionsInvalidated: result.invalidatedCount } });
        res.json({ success: true, message: `${result.invalidatedCount} sessions terminated` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ==================== AUDIT LOGS ====================

exports.getAuditLogs = async (req, res) => {
    const { limit = 100, action, userId } = req.query;

    try {
        let query = supabase
            .from('audit_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(parseInt(limit));

        if (action) query = query.eq('action', action);
        if (userId) query = query.eq('performed_by', userId);

        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ==================== LEGACY SIMPLE ACCOUNT CREATION ====================

exports.createAccount = async (req, res) => {
    const { email, username, password, displayName } = req.body;
    const createdBy = req.adminUser?.id || 'system';

    if (!username || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const validation = await passwordService.validatePassword(password);
        if (!validation.valid) {
            return res.status(400).json({ error: 'Password validation failed', errors: validation.errors, strength: validation.strength });
        }

        const result = await accountService.createAccount({ email, username, password, displayName }, createdBy);
        if (!result.success) return res.status(400).json({ error: 'Validation failed', errors: result.errors });

        res.status(201).json({ success: true, message: 'Account created successfully', accountId: result.accountId });
    } catch (error) {
        console.error('Error creating account:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.toggleAccountStatus = async (req, res) => {
    const { uid, disabled } = req.body;
    const performedBy = req.adminUser?.id || 'system';

    if (!uid || typeof disabled !== 'boolean') {
        return res.status(400).json({ error: 'uid and disabled (boolean) are required' });
    }

    try {
        await accountService.toggleAccountStatus(uid, !disabled, performedBy);
        res.json({ success: true, message: `Account ${disabled ? 'disabled' : 'enabled'} successfully` });
    } catch (error) {
        console.error('Error updating account status:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.listAccounts = async (req, res) => {
    try {
        const accounts = await accountService.listAccounts();
        res.json(accounts);
    } catch (error) {
        console.error('Error listing accounts:', error);
        res.status(500).json({ error: error.message });
    }
};
