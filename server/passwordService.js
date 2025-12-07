/**
 * Password Service
 * Handles password hashing, validation, collision detection, and history tracking
 */

const bcrypt = require('bcryptjs');
const admin = require('firebase-admin');

const SALT_ROUNDS = 12;
const PASSWORD_HISTORY_LIMIT = 5;
const MIN_PASSWORD_LENGTH = 12;

// Password complexity regex
const COMPLEXITY_RULES = {
    hasUppercase: /[A-Z]/,
    hasLowercase: /[a-z]/,
    hasDigit: /[0-9]/,
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
};

/**
 * Validate password complexity
 * @param {string} password - Plain text password
 * @returns {{ valid: boolean, errors: string[], strength: number }}
 */
const validateComplexity = (password) => {
    const errors = [];
    let strength = 0;

    if (password.length < MIN_PASSWORD_LENGTH) {
        errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    } else {
        strength += 25;
    }

    if (!COMPLEXITY_RULES.hasUppercase.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    } else {
        strength += 25;
    }

    if (!COMPLEXITY_RULES.hasLowercase.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    } else {
        strength += 15;
    }

    if (!COMPLEXITY_RULES.hasDigit.test(password)) {
        errors.push('Password must contain at least one digit');
    } else {
        strength += 20;
    }

    if (!COMPLEXITY_RULES.hasSpecial.test(password)) {
        errors.push('Password must contain at least one special character');
    } else {
        strength += 15;
    }

    return {
        valid: errors.length === 0,
        errors,
        strength: Math.min(100, strength)
    };
};

/**
 * Hash a password with bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
    return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a password with a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Bcrypt hash
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};

/**
 * Check if password is already used by any account
 * @param {string} password - Plain text password
 * @param {string} excludeUserId - User ID to exclude from check (for updates)
 * @returns {Promise<{ isDuplicate: boolean, message?: string }>}
 */
const checkPasswordCollision = async (password, excludeUserId = null) => {
    try {
        const db = admin.firestore();
        const snapshot = await db.collection('admin_users').get();

        for (const doc of snapshot.docs) {
            if (excludeUserId && doc.id === excludeUserId) continue;

            const userData = doc.data();

            // Check current password
            if (userData.passwordHash) {
                const match = await bcrypt.compare(password, userData.passwordHash);
                if (match) {
                    return {
                        isDuplicate: true,
                        message: 'This password is already in use by another account'
                    };
                }
            }

            // Legacy: check plain text passwords (for migration)
            if (userData.password && userData.password === password) {
                return {
                    isDuplicate: true,
                    message: 'This password is already in use by another account'
                };
            }
        }

        return { isDuplicate: false };
    } catch (error) {
        console.error('Error checking password collision:', error);
        throw error;
    }
};

/**
 * Check if password was used recently (in history)
 * @param {string} userId - User ID
 * @param {string} password - Plain text password
 * @returns {Promise<{ inHistory: boolean, message?: string }>}
 */
const checkPasswordHistory = async (userId, password) => {
    try {
        const db = admin.firestore();
        const historyRef = db.collection('admin_users').doc(userId).collection('password_history');
        const snapshot = await historyRef.orderBy('createdAt', 'desc').limit(PASSWORD_HISTORY_LIMIT).get();

        for (const doc of snapshot.docs) {
            const { hash } = doc.data();
            const match = await bcrypt.compare(password, hash);
            if (match) {
                return {
                    inHistory: true,
                    message: `Password was used recently. Please choose a password you haven't used in the last ${PASSWORD_HISTORY_LIMIT} changes.`
                };
            }
        }

        return { inHistory: false };
    } catch (error) {
        console.error('Error checking password history:', error);
        throw error;
    }
};

/**
 * Add password to history
 * @param {string} userId - User ID
 * @param {string} passwordHash - Hashed password
 */
const addToPasswordHistory = async (userId, passwordHash) => {
    try {
        const db = admin.firestore();
        const historyRef = db.collection('admin_users').doc(userId).collection('password_history');

        // Add new entry
        await historyRef.add({
            hash: passwordHash,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Clean up old entries (keep only last 5)
        const snapshot = await historyRef.orderBy('createdAt', 'desc').get();
        const docs = snapshot.docs;

        if (docs.length > PASSWORD_HISTORY_LIMIT) {
            const batch = db.batch();
            docs.slice(PASSWORD_HISTORY_LIMIT).forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
    } catch (error) {
        console.error('Error adding to password history:', error);
        throw error;
    }
};

/**
 * Full password validation pipeline
 * @param {string} password - Plain text password
 * @param {string} userId - User ID (for history check, null for new users)
 * @param {string} excludeUserId - Exclude from collision check
 * @returns {Promise<{ valid: boolean, errors: string[], strength: number }>}
 */
const validatePassword = async (password, userId = null, excludeUserId = null) => {
    const errors = [];

    // 1. Complexity check
    const complexity = validateComplexity(password);
    if (!complexity.valid) {
        errors.push(...complexity.errors);
    }

    // 2. Collision check
    const collision = await checkPasswordCollision(password, excludeUserId);
    if (collision.isDuplicate) {
        errors.push(collision.message);
    }

    // 3. History check (only for existing users)
    if (userId) {
        const history = await checkPasswordHistory(userId, password);
        if (history.inHistory) {
            errors.push(history.message);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        strength: complexity.strength
    };
};

/**
 * Migrate plain text password to bcrypt hash
 * @param {string} userId - User ID
 * @param {string} plainPassword - Plain text password from legacy field
 */
const migratePasswordToHash = async (userId, plainPassword) => {
    try {
        const db = admin.firestore();
        const hash = await hashPassword(plainPassword);

        await db.collection('admin_users').doc(userId).update({
            passwordHash: hash,
            password: admin.firestore.FieldValue.delete(), // Remove plain text
            passwordMigratedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Add to history
        await addToPasswordHistory(userId, hash);

        console.log(`✅ Migrated password for user ${userId}`);
        return true;
    } catch (error) {
        console.error('Error migrating password:', error);
        throw error;
    }
};

module.exports = {
    validateComplexity,
    hashPassword,
    comparePassword,
    checkPasswordCollision,
    checkPasswordHistory,
    addToPasswordHistory,
    validatePassword,
    migratePasswordToHash,
    SALT_ROUNDS,
    PASSWORD_HISTORY_LIMIT,
    MIN_PASSWORD_LENGTH
};
