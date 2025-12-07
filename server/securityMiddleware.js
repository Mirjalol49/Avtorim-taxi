/**
 * Security Middleware
 * IP restrictions, time-based access, session limits, audit logging
 */

const admin = require('firebase-admin');

// Default security settings (can be overridden per user)
const DEFAULT_SETTINGS = {
    allowedIpRanges: null, // null = allow all
    accessHoursStart: null, // null = 24/7 access
    accessHoursEnd: null,
    maxConcurrentSessions: 2,
    timezone: 'Asia/Tashkent'
};

/**
 * IP Restriction Middleware
 */
const ipRestriction = (userSettings = null) => {
    return (req, res, next) => {
        const settings = { ...DEFAULT_SETTINGS, ...userSettings };

        if (!settings.allowedIpRanges || settings.allowedIpRanges.length === 0) {
            return next();
        }

        const clientIp = req.ip || req.connection.remoteAddress;

        const isAllowed = settings.allowedIpRanges.some(range => {
            if (range.includes('/')) {
                return isIpInRange(clientIp, range);
            }
            return clientIp === range;
        });

        if (!isAllowed) {
            console.warn(`🚫 Access denied for IP: ${clientIp}`);
            return res.status(403).json({
                error: 'Access denied',
                message: 'Your IP address is not authorized'
            });
        }

        next();
    };
};

/**
 * Time-based Access Restriction Middleware
 */
const timeBasedAccess = (userSettings = null) => {
    return (req, res, next) => {
        const settings = { ...DEFAULT_SETTINGS, ...userSettings };

        if (!settings.accessHoursStart || !settings.accessHoursEnd) {
            return next();
        }

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 100 + currentMinute;

        const startTime = parseTime(settings.accessHoursStart);
        const endTime = parseTime(settings.accessHoursEnd);

        if (currentTime < startTime || currentTime > endTime) {
            console.warn(`🚫 Access denied: Outside allowed hours (${settings.accessHoursStart} - ${settings.accessHoursEnd})`);
            return res.status(403).json({
                error: 'Access denied',
                message: `Access is only allowed between ${settings.accessHoursStart} and ${settings.accessHoursEnd}`
            });
        }

        next();
    };
};

/**
 * Session Limit Middleware
 * Checks concurrent sessions and enforces limit
 */
const sessionLimit = async (userId) => {
    const db = admin.firestore();
    const sessionsRef = db.collection('admin_users').doc(userId).collection('sessions');

    const snapshot = await sessionsRef
        .where('active', '==', true)
        .orderBy('createdAt', 'asc')
        .get();

    const activeSessions = snapshot.docs;
    const maxSessions = DEFAULT_SETTINGS.maxConcurrentSessions;

    // If at limit, invalidate oldest session
    if (activeSessions.length >= maxSessions) {
        const oldestSession = activeSessions[0];
        await oldestSession.ref.update({
            active: false,
            invalidatedAt: admin.firestore.FieldValue.serverTimestamp(),
            invalidationReason: 'session_limit_exceeded'
        });
    }

    return {
        currentSessions: activeSessions.length,
        invalidatedOldest: activeSessions.length >= maxSessions
    };
};

/**
 * Create new session
 * @param {string} userId - User ID
 * @param {Object} metadata - { ip, userAgent }
 */
const createSession = async (userId, metadata) => {
    const db = admin.firestore();
    const sessionsRef = db.collection('admin_users').doc(userId).collection('sessions');

    // Check session limits first
    await sessionLimit(userId);

    const sessionRef = await sessionsRef.add({
        active: true,
        ip: metadata.ip,
        userAgent: metadata.userAgent,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastActivity: admin.firestore.FieldValue.serverTimestamp()
    });

    return sessionRef.id;
};

/**
 * Invalidate session
 */
const invalidateSession = async (userId, sessionId) => {
    const db = admin.firestore();
    await db.collection('admin_users').doc(userId)
        .collection('sessions').doc(sessionId)
        .update({
            active: false,
            invalidatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
};

/**
 * Invalidate all sessions for user
 */
const invalidateAllSessions = async (userId, reason = 'manual_logout') => {
    const db = admin.firestore();
    const sessionsRef = db.collection('admin_users').doc(userId).collection('sessions');
    const snapshot = await sessionsRef.where('active', '==', true).get();

    const batch = db.batch();
    snapshot.forEach(doc => {
        batch.update(doc.ref, {
            active: false,
            invalidatedAt: admin.firestore.FieldValue.serverTimestamp(),
            invalidationReason: reason
        });
    });

    await batch.commit();
    return { invalidatedCount: snapshot.size };
};

/**
 * Audit action logging
 */
const auditLog = async (action, data) => {
    const db = admin.firestore();
    await db.collection('audit_logs').add({
        action,
        ...data,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
};

/**
 * Log admin action with before/after state
 */
const logStateChange = async (action, { userId, targetId, before, after, metadata = {} }) => {
    return auditLog(action, {
        performedBy: userId,
        targetId,
        stateBefore: before ? JSON.stringify(before) : null,
        stateAfter: after ? JSON.stringify(after) : null,
        ...metadata
    });
};

// --- Helper Functions ---

function isIpInRange(ip, cidr) {
    const [range, bitsStr] = cidr.split('/');
    const bits = parseInt(bitsStr, 10);

    const ipParts = ip.split('.').map(Number);
    const rangeParts = range.split('.').map(Number);

    const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    const rangeNum = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];

    const mask = (-1 << (32 - bits)) >>> 0;

    return (ipNum & mask) === (rangeNum & mask);
}

function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 100 + (minutes || 0);
}

module.exports = {
    ipRestriction,
    timeBasedAccess,
    sessionLimit,
    createSession,
    invalidateSession,
    invalidateAllSessions,
    auditLog,
    logStateChange,
    DEFAULT_SETTINGS
};
