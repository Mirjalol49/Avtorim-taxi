/**
 * Security Middleware
 * IP restrictions, time-based access, session limits, audit logging
 */

const { supabase } = require('./supabaseAdmin');

const DEFAULT_SETTINGS = {
    allowedIpRanges: null,
    accessHoursStart: null,
    accessHoursEnd: null,
    maxConcurrentSessions: 2,
    timezone: 'Asia/Tashkent'
};

const ipRestriction = (userSettings = null) => {
    return (req, res, next) => {
        const settings = { ...DEFAULT_SETTINGS, ...userSettings };

        if (!settings.allowedIpRanges || settings.allowedIpRanges.length === 0) {
            return next();
        }

        const clientIp = req.ip || req.connection.remoteAddress;
        const isAllowed = settings.allowedIpRanges.some(range => {
            if (range.includes('/')) return isIpInRange(clientIp, range);
            return clientIp === range;
        });

        if (!isAllowed) {
            console.warn(`Access denied for IP: ${clientIp}`);
            return res.status(403).json({ error: 'Access denied', message: 'Your IP address is not authorized' });
        }

        next();
    };
};

const timeBasedAccess = (userSettings = null) => {
    return (req, res, next) => {
        const settings = { ...DEFAULT_SETTINGS, ...userSettings };

        if (!settings.accessHoursStart || !settings.accessHoursEnd) {
            return next();
        }

        const timezone = settings.timezone || 'Asia/Tashkent';
        const nowStr = new Date().toLocaleString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false });
        const [hourStr, minuteStr] = nowStr.split(':');
        const currentTime = parseInt(hourStr, 10) * 100 + parseInt(minuteStr, 10);

        const startTime = parseTime(settings.accessHoursStart);
        const endTime = parseTime(settings.accessHoursEnd);

        if (currentTime < startTime || currentTime > endTime) {
            console.warn(`Access denied: Outside allowed hours (${settings.accessHoursStart} - ${settings.accessHoursEnd})`);
            return res.status(403).json({
                error: 'Access denied',
                message: `Access is only allowed between ${settings.accessHoursStart} and ${settings.accessHoursEnd}`
            });
        }

        next();
    };
};

const sessionLimit = async (userId) => {
    if (!supabase) return { currentSessions: 0, invalidatedOldest: false };

    const { data: activeSessions } = await supabase
        .from('sessions')
        .select('id, created_ms')
        .eq('user_id', userId)
        .eq('active', true)
        .order('created_ms', { ascending: true });

    const sessions = activeSessions || [];
    const maxSessions = DEFAULT_SETTINGS.maxConcurrentSessions;

    if (sessions.length >= maxSessions) {
        await supabase.from('sessions').update({
            active: false,
            invalidated_at: Date.now(),
            invalidation_reason: 'session_limit_exceeded'
        }).eq('id', sessions[0].id);
    }

    return {
        currentSessions: sessions.length,
        invalidatedOldest: sessions.length >= maxSessions
    };
};

const createSession = async (userId, metadata) => {
    if (!supabase) return null;

    await sessionLimit(userId);

    const { data } = await supabase.from('sessions').insert({
        user_id: userId,
        active: true,
        ip: metadata.ip || null,
        user_agent: metadata.userAgent || null,
        created_ms: Date.now(),
        last_activity: Date.now()
    }).select('id').single();

    return data?.id || null;
};

const invalidateSession = async (userId, sessionId) => {
    if (!supabase) return;
    await supabase.from('sessions').update({
        active: false,
        invalidated_at: Date.now()
    }).eq('id', sessionId).eq('user_id', userId);
};

const invalidateAllSessions = async (userId, reason = 'manual_logout') => {
    if (!supabase) return { invalidatedCount: 0 };

    const { data: sessions } = await supabase.from('sessions').select('id').eq('user_id', userId).eq('active', true);
    const count = (sessions || []).length;

    if (count > 0) {
        await supabase.from('sessions').update({
            active: false,
            invalidated_at: Date.now(),
            invalidation_reason: reason
        }).eq('user_id', userId).eq('active', true);
    }

    return { invalidatedCount: count };
};

const auditLog = async (action, data) => {
    if (!supabase) return;
    await supabase.from('audit_logs').insert({
        action,
        performed_by: data.userId || null,
        target_id: data.targetId || null,
        target_name: data.targetName || null,
        details: data.metadata ? data.metadata : (data.details || {}),
        timestamp_ms: Date.now()
    });
};

const logStateChange = async (action, { userId, targetId, before, after, metadata = {} }) => {
    return auditLog(action, {
        userId,
        targetId,
        metadata: {
            state_before: before ? JSON.stringify(before) : null,
            state_after: after ? JSON.stringify(after) : null,
            ...metadata
        }
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
