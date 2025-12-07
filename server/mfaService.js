/**
 * MFA Service
 * Handles TOTP generation, verification, and backup codes
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const admin = require('firebase-admin');

const APP_NAME = 'Avtorim Taxi Admin';
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;

/**
 * Generate MFA secret for user
 * @param {string} userId - User ID
 * @param {string} username - Username for QR label
 * @returns {Promise<{ secret: string, qrCodeDataUrl: string, backupCodes: string[] }>}
 */
const generateMFASecret = async (userId, username) => {
    try {
        // Generate TOTP secret
        const secret = speakeasy.generateSecret({
            name: `${APP_NAME}:${username}`,
            length: 32
        });

        // Generate QR code as data URL
        const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

        // Generate backup codes
        const backupCodes = generateBackupCodes();
        const hashedBackupCodes = backupCodes.map(code => ({
            code: hashBackupCode(code),
            used: false
        }));

        // Store MFA data in Firestore
        const db = admin.firestore();
        await db.collection('admin_users').doc(userId).collection('mfa').doc('config').set({
            secret: secret.base32,
            enabled: false, // Not enabled until verified
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            backupCodes: hashedBackupCodes
        });

        return {
            secret: secret.base32,
            qrCodeDataUrl,
            backupCodes // Return plain codes for user to save (shown once)
        };
    } catch (error) {
        console.error('Error generating MFA secret:', error);
        throw error;
    }
};

/**
 * Verify TOTP token
 * @param {string} userId - User ID
 * @param {string} token - 6-digit TOTP token
 * @returns {Promise<{ valid: boolean, message?: string }>}
 */
const verifyTOTP = async (userId, token) => {
    try {
        const db = admin.firestore();
        const mfaDoc = await db.collection('admin_users').doc(userId).collection('mfa').doc('config').get();

        if (!mfaDoc.exists) {
            return { valid: false, message: 'MFA not configured for this account' };
        }

        const { secret, enabled } = mfaDoc.data();

        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 1 // Allow 1 step before/after for clock drift
        });

        if (verified && !enabled) {
            // First successful verification - enable MFA
            await mfaDoc.ref.update({
                enabled: true,
                enabledAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        return {
            valid: verified,
            message: verified ? 'MFA verified' : 'Invalid verification code'
        };
    } catch (error) {
        console.error('Error verifying TOTP:', error);
        throw error;
    }
};

/**
 * Verify backup code
 * @param {string} userId - User ID
 * @param {string} code - Backup code
 * @returns {Promise<{ valid: boolean, message?: string, remainingCodes?: number }>}
 */
const verifyBackupCode = async (userId, code) => {
    try {
        const db = admin.firestore();
        const mfaDoc = await db.collection('admin_users').doc(userId).collection('mfa').doc('config').get();

        if (!mfaDoc.exists) {
            return { valid: false, message: 'MFA not configured' };
        }

        const { backupCodes } = mfaDoc.data();
        const hashedInput = hashBackupCode(code);

        let foundIndex = -1;
        for (let i = 0; i < backupCodes.length; i++) {
            if (backupCodes[i].code === hashedInput && !backupCodes[i].used) {
                foundIndex = i;
                break;
            }
        }

        if (foundIndex === -1) {
            return { valid: false, message: 'Invalid or already used backup code' };
        }

        // Mark code as used
        backupCodes[foundIndex].used = true;
        backupCodes[foundIndex].usedAt = new Date().toISOString();

        await mfaDoc.ref.update({ backupCodes });

        const remainingCodes = backupCodes.filter(c => !c.used).length;

        return {
            valid: true,
            message: 'Backup code verified',
            remainingCodes
        };
    } catch (error) {
        console.error('Error verifying backup code:', error);
        throw error;
    }
};

/**
 * Check if user has MFA enabled
 * @param {string} userId - User ID
 * @returns {Promise<{ configured: boolean, enabled: boolean }>}
 */
const getMFAStatus = async (userId) => {
    try {
        const db = admin.firestore();
        const mfaDoc = await db.collection('admin_users').doc(userId).collection('mfa').doc('config').get();

        if (!mfaDoc.exists) {
            return { configured: false, enabled: false };
        }

        const { enabled } = mfaDoc.data();
        return { configured: true, enabled: !!enabled };
    } catch (error) {
        console.error('Error getting MFA status:', error);
        throw error;
    }
};

/**
 * Disable MFA for user (admin action)
 * @param {string} userId - User ID
 * @param {string} adminId - Admin performing the action
 */
const disableMFA = async (userId, adminId) => {
    try {
        const db = admin.firestore();
        const mfaRef = db.collection('admin_users').doc(userId).collection('mfa').doc('config');

        await mfaRef.delete();

        // Audit log
        await db.collection('audit_logs').add({
            action: 'MFA_DISABLED',
            targetUserId: userId,
            performedBy: adminId,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        console.error('Error disabling MFA:', error);
        throw error;
    }
};

/**
 * Regenerate backup codes
 * @param {string} userId - User ID
 * @returns {Promise<string[]>} - New backup codes
 */
const regenerateBackupCodes = async (userId) => {
    try {
        const db = admin.firestore();
        const mfaRef = db.collection('admin_users').doc(userId).collection('mfa').doc('config');
        const mfaDoc = await mfaRef.get();

        if (!mfaDoc.exists) {
            throw new Error('MFA not configured');
        }

        const backupCodes = generateBackupCodes();
        const hashedBackupCodes = backupCodes.map(code => ({
            code: hashBackupCode(code),
            used: false
        }));

        await mfaRef.update({
            backupCodes: hashedBackupCodes,
            backupCodesRegeneratedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return backupCodes;
    } catch (error) {
        console.error('Error regenerating backup codes:', error);
        throw error;
    }
};

// --- Helper Functions ---

function generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
        const code = crypto.randomBytes(BACKUP_CODE_LENGTH / 2).toString('hex').toUpperCase();
        codes.push(code);
    }
    return codes;
}

function hashBackupCode(code) {
    return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}

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
