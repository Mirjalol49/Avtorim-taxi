/**
 * Account Service
 * Handles account creation, verification, lifecycle management
 */

const { supabase } = require('./supabaseAdmin');
const passwordService = require('./passwordService');
const crypto = require('crypto');

const PENDING_EXPIRATION_HOURS = 72;

const createAccount = async (data, createdBy) => {
    const { email, username, password, displayName } = data;

    const uniqueCheck = await checkUniqueness(email, username);
    if (!uniqueCheck.unique) return { success: false, errors: uniqueCheck.errors };

    const passwordValidation = await passwordService.validatePassword(password);
    if (!passwordValidation.valid) return { success: false, errors: passwordValidation.errors };

    const passwordHash = await passwordService.hashPassword(password);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (PENDING_EXPIRATION_HOURS * 60 * 60 * 1000);

    const { data: row, error } = await supabase.from('admin_users').insert({
        email,
        username,
        display_name: displayName || username,
        password_hash: passwordHash,
        role: 'admin',
        status: 'pending_verification',
        verification_token: verificationToken,
        verification_expires_at: expiresAt,
        active: false,
        created_ms: Date.now(),
        created_by: createdBy || null
    }).select('id').single();

    if (error) return { success: false, errors: [error.message] };

    await passwordService.addToPasswordHistory(row.id, passwordHash);

    await supabase.from('audit_logs').insert({
        action: 'ACCOUNT_CREATED',
        target_id: row.id,
        target_name: username,
        performed_by: createdBy || null,
        details: { email, status: 'pending_verification' },
        timestamp_ms: Date.now()
    });

    return { success: true, accountId: row.id, verificationToken };
};

const verifyEmail = async (token) => {
    const { data: row } = await supabase
        .from('admin_users')
        .select('id, verification_expires_at')
        .eq('verification_token', token)
        .eq('status', 'pending_verification')
        .single();

    if (!row) return { success: false, message: 'Invalid or expired verification token' };
    if (row.verification_expires_at < Date.now()) return { success: false, message: 'Verification token has expired' };

    await supabase.from('admin_users').update({
        status: 'pending_approval',
        email_verified_at: Date.now(),
        verification_token: null
    }).eq('id', row.id);

    return { success: true, accountId: row.id };
};

const approveAccount = async (accountId, approvedBy) => {
    const { data: row } = await supabase.from('admin_users').select('status').eq('id', accountId).single();

    if (!row || row.status !== 'pending_approval') {
        return { success: false, message: 'Account not found or not pending approval' };
    }

    await supabase.from('admin_users').update({
        status: 'active',
        active: true,
        approved_at: Date.now(),
        approved_by: approvedBy || null
    }).eq('id', accountId);

    await supabase.from('audit_logs').insert({
        action: 'ACCOUNT_APPROVED',
        target_id: accountId,
        performed_by: approvedBy || null,
        timestamp_ms: Date.now()
    });

    return { success: true };
};

const rejectAccount = async (accountId, rejectedBy, reason) => {
    await supabase.from('admin_users').update({
        status: 'rejected',
        active: false,
        rejected_at: Date.now(),
        rejected_by: rejectedBy || null,
        rejection_reason: reason
    }).eq('id', accountId);

    await supabase.from('audit_logs').insert({
        action: 'ACCOUNT_REJECTED',
        target_id: accountId,
        performed_by: rejectedBy || null,
        details: { reason },
        timestamp_ms: Date.now()
    });

    return { success: true };
};

const checkUniqueness = async (email, username) => {
    const errors = [];

    if (email) {
        const { data: emailRow } = await supabase.from('admin_users').select('id').eq('email', email).limit(1).single();
        if (emailRow) errors.push('Email is already registered');
    }

    const { data: usernameRow } = await supabase.from('admin_users').select('id').eq('username', username).limit(1).single();
    if (usernameRow) errors.push('Username is already taken');

    return { unique: errors.length === 0, errors };
};

const getPendingAccounts = async () => {
    const { data } = await supabase
        .from('admin_users')
        .select('*')
        .eq('status', 'pending_approval')
        .order('created_ms', { ascending: false });
    return data || [];
};

const toggleAccountStatus = async (accountId, active, performedBy) => {
    await supabase.from('admin_users').update({ active }).eq('id', accountId);

    await supabase.from('audit_logs').insert({
        action: active ? 'ACCOUNT_ENABLED' : 'ACCOUNT_DISABLED',
        target_id: accountId,
        performed_by: performedBy || null,
        timestamp_ms: Date.now()
    });

    if (!active) {
        await supabase.from('sessions').update({
            active: false,
            invalidated_at: Date.now(),
            invalidation_reason: 'Account disabled'
        }).eq('user_id', accountId).eq('active', true);
    }

    return { success: true };
};

const listAccounts = async () => {
    const { data } = await supabase.from('admin_users').select('id, username, role, active, created_ms, email, status');
    return data || [];
};

const changePassword = async (accountId, newPassword, performedBy) => {
    const validation = await passwordService.validatePassword(newPassword, accountId, accountId);
    if (!validation.valid) return { success: false, errors: validation.errors };

    const passwordHash = await passwordService.hashPassword(newPassword);

    await supabase.from('admin_users').update({ password_hash: passwordHash, password: null }).eq('id', accountId);
    await passwordService.addToPasswordHistory(accountId, passwordHash);

    await supabase.from('audit_logs').insert({
        action: 'PASSWORD_CHANGED',
        target_id: accountId,
        performed_by: performedBy || null,
        timestamp_ms: Date.now()
    });

    return { success: true };
};

const getSessions = async (userId) => {
    const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_ms', { ascending: false });
    return data || [];
};

const logoutAllSessions = async (userId, performedBy) => {
    await supabase.from('sessions').update({
        active: false,
        invalidated_at: Date.now(),
        invalidation_reason: 'Admin logout'
    }).eq('user_id', userId).eq('active', true);

    await supabase.from('audit_logs').insert({
        action: 'LOGOUT_ALL_SESSIONS',
        target_id: userId,
        performed_by: performedBy || null,
        timestamp_ms: Date.now()
    });

    return { success: true };
};

const getAuditLogs = async (limit = 100) => {
    const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
    return data || [];
};

module.exports = {
    createAccount,
    verifyEmail,
    approveAccount,
    rejectAccount,
    checkUniqueness,
    getPendingAccounts,
    toggleAccountStatus,
    listAccounts,
    changePassword,
    getSessions,
    logoutAllSessions,
    getAuditLogs
};
