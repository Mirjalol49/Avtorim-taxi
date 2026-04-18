/**
 * MFA Service
 * Handles TOTP generation, verification, and backup codes
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { supabase } = require('./supabaseAdmin');

const APP_NAME = 'Avtorim Taxi Admin';
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;

function generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
        codes.push(crypto.randomBytes(BACKUP_CODE_LENGTH / 2).toString('hex').toUpperCase());
    }
    return codes;
}

function hashBackupCode(code) {
    return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}

const generateMFASecret = async (userId, username) => {
    const secret = speakeasy.generateSecret({ name: `${APP_NAME}:${username}`, length: 32 });
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(code => ({ code: hashBackupCode(code), used: false }));

    await supabase.from('mfa_config').upsert({
        user_id: userId,
        secret: secret.base32,
        enabled: false,
        backup_codes: hashedBackupCodes,
        updated_ms: Date.now()
    });

    return { secret: secret.base32, qrCodeDataUrl, backupCodes };
};

const verifyTOTP = async (userId, token) => {
    const { data: mfaRow } = await supabase.from('mfa_config').select('*').eq('user_id', userId).single();

    if (!mfaRow) return { valid: false, message: 'MFA not configured for this account' };

    const verified = speakeasy.totp.verify({
        secret: mfaRow.secret,
        encoding: 'base32',
        token,
        window: 1
    });

    if (verified && !mfaRow.enabled) {
        await supabase.from('mfa_config').update({ enabled: true, updated_ms: Date.now() }).eq('user_id', userId);
    }

    return { valid: verified, message: verified ? 'MFA verified' : 'Invalid verification code' };
};

const verifyBackupCode = async (userId, code) => {
    const { data: mfaRow } = await supabase.from('mfa_config').select('*').eq('user_id', userId).single();

    if (!mfaRow) return { valid: false, message: 'MFA not configured' };

    const backupCodes = mfaRow.backup_codes || [];
    const hashedInput = hashBackupCode(code);

    let foundIndex = -1;
    for (let i = 0; i < backupCodes.length; i++) {
        if (backupCodes[i].code === hashedInput && !backupCodes[i].used) {
            foundIndex = i;
            break;
        }
    }

    if (foundIndex === -1) return { valid: false, message: 'Invalid or already used backup code' };

    backupCodes[foundIndex].used = true;
    backupCodes[foundIndex].usedAt = new Date().toISOString();

    await supabase.from('mfa_config').update({ backup_codes: backupCodes, updated_ms: Date.now() }).eq('user_id', userId);

    const remainingCodes = backupCodes.filter(c => !c.used).length;
    return { valid: true, message: 'Backup code verified', remainingCodes };
};

const getMFAStatus = async (userId) => {
    const { data: mfaRow } = await supabase.from('mfa_config').select('enabled').eq('user_id', userId).single();
    if (!mfaRow) return { configured: false, enabled: false };
    return { configured: true, enabled: !!mfaRow.enabled };
};

const disableMFA = async (userId, adminId) => {
    await supabase.from('mfa_config').delete().eq('user_id', userId);
    await supabase.from('audit_logs').insert({
        action: 'MFA_DISABLED',
        target_id: userId,
        performed_by: adminId || null,
        timestamp_ms: Date.now()
    });
    return { success: true };
};

const regenerateBackupCodes = async (userId) => {
    const { data: mfaRow } = await supabase.from('mfa_config').select('id').eq('user_id', userId).single();
    if (!mfaRow) throw new Error('MFA not configured');

    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(code => ({ code: hashBackupCode(code), used: false }));

    await supabase.from('mfa_config').update({ backup_codes: hashedBackupCodes, updated_ms: Date.now() }).eq('user_id', userId);

    return backupCodes;
};

module.exports = {
    generateMFASecret,
    verifyTOTP,
    verifyBackupCode,
    getMFAStatus,
    disableMFA,
    regenerateBackupCodes,
    APP_NAME,
    BACKUP_CODE_COUNT
};
