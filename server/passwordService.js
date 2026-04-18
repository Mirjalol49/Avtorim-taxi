/**
 * Password Service
 * Handles password hashing, validation, collision detection, and history tracking
 */

const bcrypt = require('bcryptjs');
const { supabase } = require('./supabaseAdmin');

const SALT_ROUNDS = 12;
const PASSWORD_HISTORY_LIMIT = 5;
const MIN_PASSWORD_LENGTH = 12;

const COMPLEXITY_RULES = {
    hasUppercase: /[A-Z]/,
    hasLowercase: /[a-z]/,
    hasDigit: /[0-9]/,
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
};

const validateComplexity = (password) => {
    const errors = [];
    let strength = 0;

    if (password.length < MIN_PASSWORD_LENGTH) {
        errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    } else { strength += 25; }

    if (!COMPLEXITY_RULES.hasUppercase.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    } else { strength += 25; }

    if (!COMPLEXITY_RULES.hasLowercase.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    } else { strength += 15; }

    if (!COMPLEXITY_RULES.hasDigit.test(password)) {
        errors.push('Password must contain at least one digit');
    } else { strength += 20; }

    if (!COMPLEXITY_RULES.hasSpecial.test(password)) {
        errors.push('Password must contain at least one special character');
    } else { strength += 15; }

    return { valid: errors.length === 0, errors, strength: Math.min(100, strength) };
};

const hashPassword = async (password) => bcrypt.hash(password, SALT_ROUNDS);

const comparePassword = async (password, hash) => bcrypt.compare(password, hash);

const checkPasswordCollision = async (password, excludeUserId = null) => {
    if (!supabase) return { isDuplicate: false };

    const { data: users } = await supabase.from('admin_users').select('id, password_hash, password');

    for (const user of (users || [])) {
        if (excludeUserId && user.id === excludeUserId) continue;

        if (user.password_hash) {
            const match = await bcrypt.compare(password, user.password_hash);
            if (match) return { isDuplicate: true, message: 'This password is already in use by another account' };
        }

        if (user.password && user.password === password) {
            return { isDuplicate: true, message: 'This password is already in use by another account' };
        }
    }

    return { isDuplicate: false };
};

const checkPasswordHistory = async (userId, password) => {
    if (!supabase) return { inHistory: false };

    const { data: history } = await supabase
        .from('password_history')
        .select('password')
        .eq('user_id', userId)
        .order('changed_at', { ascending: false })
        .limit(PASSWORD_HISTORY_LIMIT);

    for (const row of (history || [])) {
        const match = await bcrypt.compare(password, row.password);
        if (match) {
            return {
                inHistory: true,
                message: `Password was used recently. Please choose a password you haven't used in the last ${PASSWORD_HISTORY_LIMIT} changes.`
            };
        }
    }

    return { inHistory: false };
};

const addToPasswordHistory = async (userId, passwordHash) => {
    if (!supabase) return;

    await supabase.from('password_history').insert({
        user_id: userId,
        password: passwordHash,
        changed_at: Date.now()
    });

    // Prune old entries — keep only most recent PASSWORD_HISTORY_LIMIT
    const { data: rows } = await supabase
        .from('password_history')
        .select('id')
        .eq('user_id', userId)
        .order('changed_at', { ascending: false });

    if (rows && rows.length > PASSWORD_HISTORY_LIMIT) {
        const toDelete = rows.slice(PASSWORD_HISTORY_LIMIT).map(r => r.id);
        await supabase.from('password_history').delete().in('id', toDelete);
    }
};

const validatePassword = async (password, userId = null, excludeUserId = null) => {
    const errors = [];

    const complexity = validateComplexity(password);
    if (!complexity.valid) errors.push(...complexity.errors);

    const collision = await checkPasswordCollision(password, excludeUserId);
    if (collision.isDuplicate) errors.push(collision.message);

    if (userId) {
        const history = await checkPasswordHistory(userId, password);
        if (history.inHistory) errors.push(history.message);
    }

    return { valid: errors.length === 0, errors, strength: complexity.strength };
};

module.exports = {
    validateComplexity,
    hashPassword,
    comparePassword,
    checkPasswordCollision,
    checkPasswordHistory,
    addToPasswordHistory,
    validatePassword
};
