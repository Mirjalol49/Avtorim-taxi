import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    sendNotification,
    NotificationType
} from '../../services/notificationService';
import {
    NotificationCategory,
    NotificationPriority
} from '../../src/core/types/notification.types';
import { Language } from '../../types';
import { TRANSLATIONS } from '../../translations';
import { subscribeToAdminUsers } from '../../services/firestoreService';

interface NotificationComposerProps {
    lang: Language;
    theme: 'light' | 'dark';
    currentUserId: string;
    currentUserName: string;
    addToast: (type: 'success' | 'error', message: string) => void;
}

// Constants
const MAX_TITLE_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 500;

const NotificationComposer: React.FC<NotificationComposerProps> = ({
    lang,
    theme,
    currentUserId,
    currentUserName,
    addToast
}) => {
    // Form State
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState<NotificationCategory>(NotificationCategory.ANNOUNCEMENT);
    const [priority, setPriority] = useState<NotificationPriority>(NotificationPriority.MEDIUM);
    const [targetType, setTargetType] = useState<'all' | 'role' | 'specific'>('all');
    const [targetRole, setTargetRole] = useState<'admin' | 'viewer'>('admin');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [expirationType, setExpirationType] = useState<'1h' | '24h' | '7d' | '30d' | 'never'>('24h');

    // UI State
    const [isSending, setIsSending] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [sendSuccess, setSendSuccess] = useState<string | null>(null);

    // Data
    const [adminUsers, setAdminUsers] = useState<any[]>([]);

    const t = TRANSLATIONS[lang];
    const isDark = theme === 'dark';

    // Subscribe to admin users
    useEffect(() => {
        const unsubscribe = subscribeToAdminUsers((users) => {
            setAdminUsers(users);
        });
        return () => unsubscribe();
    }, []);

    // Calculate recipient count
    const recipientCount = useMemo(() => {
        if (targetType === 'all') {
            return adminUsers.length;
        } else if (targetType === 'role') {
            return adminUsers.filter(u => u.role === targetRole).length;
        } else {
            return selectedUserIds.length;
        }
    }, [targetType, targetRole, selectedUserIds, adminUsers]);

    // Get recipient description
    const recipientDescription = useMemo(() => {
        if (targetType === 'all') return 'All Users';
        if (targetType === 'role') return `All ${targetRole === 'admin' ? 'Admins' : 'Viewers'}`;
        return `${selectedUserIds.length} Selected User${selectedUserIds.length !== 1 ? 's' : ''}`;
    }, [targetType, targetRole, selectedUserIds]);

    // Validation
    const isValid = useMemo(() => {
        if (!title.trim() || !message.trim()) return false;
        if (targetType === 'specific' && selectedUserIds.length === 0) return false;
        return true;
    }, [title, message, targetType, selectedUserIds]);

    // Get validation errors
    const validationErrors = useMemo(() => {
        const errors: string[] = [];
        if (!title.trim()) errors.push('Title is required');
        if (!message.trim()) errors.push('Message is required');
        if (targetType === 'specific' && selectedUserIds.length === 0)
            errors.push('Select at least one recipient');
        return errors;
    }, [title, message, targetType, selectedUserIds]);

    const getExpirationMs = (): number => {
        switch (expirationType) {
            case '1h': return 1 * 60 * 60 * 1000;
            case '24h': return 24 * 60 * 60 * 1000;
            case '7d': return 7 * 24 * 60 * 60 * 1000;
            case '30d': return 30 * 24 * 60 * 60 * 1000;
            case 'never': return 365 * 24 * 60 * 60 * 1000;
            default: return 24 * 60 * 60 * 1000;
        }
    };

    const getExpirationLabel = (): string => {
        switch (expirationType) {
            case '1h': return '1 hour';
            case '24h': return '24 hours';
            case '7d': return '7 days';
            case '30d': return '30 days';
            case 'never': return '1 year';
            default: return '24 hours';
        }
    };

    const categoryToType = (cat: NotificationCategory): NotificationType => {
        switch (cat) {
            case NotificationCategory.PAYMENT_REMINDER: return 'payment_reminder';
            case NotificationCategory.FEATURE_UPDATE: return 'feature_update';
            case NotificationCategory.SYSTEM_MESSAGE: return 'system';
            default: return 'announcement';
        }
    };

    const handleSend = useCallback(async () => {
        console.log('🔘 Send button clicked! isValid:', isValid, 'isSending:', isSending);

        if (!isValid) {
            console.warn('❌ Form is not valid');
            addToast('error', 'Please fill in all required fields');
            return;
        }

        if (isSending) {
            console.warn('⏳ Already sending...');
            return;
        }

        setIsSending(true);
        setSendSuccess(null);

        try {
            let targetUsers: any;
            if (targetType === 'all') {
                targetUsers = 'all';
            } else if (targetType === 'role') {
                targetUsers = `role:${targetRole}`;
            } else {
                targetUsers = selectedUserIds;
            }

            console.log('📤 Sending notification:', {
                title: title.trim(),
                category,
                priority,
                targetUsers,
                recipients: recipientCount,
                currentUserId,
                currentUserName
            });

            const notificationId = await sendNotification(
                {
                    title: title.trim(),
                    message: message.trim(),
                    type: categoryToType(category),
                    category,
                    priority,
                    targetUsers,
                    expiresIn: getExpirationMs()
                },
                currentUserId,
                currentUserName
            );

            console.log('✅ Notification sent! ID:', notificationId);
            setSendSuccess(notificationId);
            addToast('success', `Notification sent to ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}!`);

            // Reset form after short delay to show success
            setTimeout(() => {
                setTitle('');
                setMessage('');
                setCategory(NotificationCategory.ANNOUNCEMENT);
                setPriority(NotificationPriority.MEDIUM);
                setTargetType('all');
                setSelectedUserIds([]);
                setExpirationType('24h');
                setShowPreview(false);
                setSendSuccess(null);
            }, 2000);

        } catch (error) {
            console.error('❌ Send failed:', error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            addToast('error', `Failed to send: ${errorMsg}`);
            // Also show alert for visibility
            alert(`Send Error: ${errorMsg}\n\nCheck browser console for details.`);
        } finally {
            setIsSending(false);
        }
    }, [isValid, isSending, title, message, category, priority, targetType, targetRole, selectedUserIds, recipientCount, currentUserId, currentUserName, addToast]);

    const toggleUserSelection = (userId: string) => {
        setSelectedUserIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    // Category/Priority configs
    const categories = [
        { value: NotificationCategory.ANNOUNCEMENT, label: 'Announcement', icon: '📢', color: 'blue' },
        { value: NotificationCategory.FEATURE_UPDATE, label: 'Feature Update', icon: '✨', color: 'purple' },
        { value: NotificationCategory.PAYMENT_REMINDER, label: 'Payment Reminder', icon: '💰', color: 'green' },
        { value: NotificationCategory.SYSTEM_MESSAGE, label: 'System Message', icon: '⚙️', color: 'gray' },
        { value: NotificationCategory.ACCOUNT_UPDATE, label: 'Account Update', icon: '👤', color: 'indigo' },
        { value: NotificationCategory.SECURITY_ALERT, label: 'Security Alert', icon: '🔒', color: 'red' }
    ];

    const priorities = [
        { value: NotificationPriority.LOW, label: 'Low', icon: '📋', color: 'gray' },
        { value: NotificationPriority.MEDIUM, label: 'Medium', icon: '📌', color: 'blue' },
        { value: NotificationPriority.HIGH, label: 'High', icon: '⚡', color: 'orange' },
        { value: NotificationPriority.CRITICAL, label: 'Critical', icon: '🔥', color: 'red' }
    ];

    const expirations = [
        { value: '1h' as const, label: '1 Hour' },
        { value: '24h' as const, label: '24 Hours' },
        { value: '7d' as const, label: '7 Days' },
        { value: '30d' as const, label: '30 Days' },
        { value: 'never' as const, label: 'Never' }
    ];

    const selectedCategory = categories.find(c => c.value === category);
    const selectedPriority = priorities.find(p => p.value === priority);

    const inputClass = `w-full px-4 py-3 rounded-xl outline-none transition-all duration-150 border ${isDark
        ? 'bg-gray-800 border-gray-700 text-white focus:border-teal-500 placeholder-gray-500'
        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-teal-600 placeholder-gray-400'
        }`;

    const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`;

    return (
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            {/* Header with Recipient Count */}
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className={`font-bold text-lg flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <span className="text-xl">📣</span>
                            Send Notification
                        </h2>
                        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Compose and send targeted notifications
                        </p>
                    </div>
                    {/* Recipient Badge */}
                    <div className={`px-3 py-2 rounded-lg ${isDark ? 'bg-teal-500/20' : 'bg-teal-100'}`}>
                        <div className={`text-xs font-medium ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                            Recipients
                        </div>
                        <div className={`text-2xl font-bold ${isDark ? 'text-teal-300' : 'text-teal-600'}`}>
                            {recipientCount}
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Banner */}
            {sendSuccess && (
                <div className="px-6 py-3 bg-green-500/20 border-b border-green-500/30 flex items-center gap-3 animate-pulse">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <span className="text-green-400 font-medium">Notification sent successfully!</span>
                </div>
            )}

            {/* Form */}
            <div className="p-6 space-y-5">
                {/* Target Audience */}
                <div>
                    <label className={labelClass}>Target Audience *</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { type: 'all' as const, icon: '🌍', label: 'All Users' },
                            { type: 'role' as const, icon: '👥', label: 'By Role' },
                            { type: 'specific' as const, icon: '🎯', label: 'Specific' }
                        ].map((opt) => (
                            <button
                                key={opt.type}
                                onClick={() => setTargetType(opt.type)}
                                className={`px-3 py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1 border ${targetType === opt.type
                                    ? 'border-teal-500 bg-teal-500/10 text-teal-400'
                                    : isDark
                                        ? 'border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <span className="text-lg">{opt.icon}</span>
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Role Selection */}
                    {targetType === 'role' && (
                        <div className="mt-3 flex gap-2">
                            {[
                                { role: 'admin' as const, icon: '👨‍💼', label: 'Admins' },
                                { role: 'viewer' as const, icon: '👁️', label: 'Viewers' }
                            ].map((r) => (
                                <button
                                    key={r.role}
                                    onClick={() => setTargetRole(r.role)}
                                    className={`flex-1 px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 ${targetRole === r.role
                                        ? 'bg-teal-500 text-white'
                                        : isDark
                                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    <span>{r.icon}</span>
                                    {r.label}
                                    <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${targetRole === r.role
                                        ? 'bg-white/20'
                                        : isDark ? 'bg-gray-600' : 'bg-gray-300'
                                        }`}>
                                        {adminUsers.filter(u => u.role === r.role).length}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* User Selection */}
                    {targetType === 'specific' && (
                        <div className={`mt-3 max-h-40 overflow-y-auto space-y-1 p-3 rounded-lg ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
                            {adminUsers.length === 0 ? (
                                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No users found</p>
                            ) : (
                                adminUsers.map((user) => (
                                    <label key={user.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedUserIds.includes(user.id)
                                        ? isDark ? 'bg-teal-500/20' : 'bg-teal-100'
                                        : isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
                                        }`}>
                                        <input
                                            type="checkbox"
                                            checked={selectedUserIds.includes(user.id)}
                                            onChange={() => toggleUserSelection(user.id)}
                                            className="w-4 h-4 text-teal-500 rounded focus:ring-teal-500"
                                        />
                                        <div className="flex-1">
                                            <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                                {user.username}
                                            </span>
                                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                                                {user.role}
                                            </span>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Category & Priority Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Category *</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as NotificationCategory)}
                            className={inputClass}
                        >
                            {categories.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.icon} {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Expiration</label>
                        <select
                            value={expirationType}
                            onChange={(e) => setExpirationType(e.target.value as any)}
                            className={inputClass}
                        >
                            {expirations.map((exp) => (
                                <option key={exp.value} value={exp.value}>
                                    ⏰ {exp.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Priority */}
                <div>
                    <label className={labelClass}>Priority *</label>
                    <div className="grid grid-cols-4 gap-2">
                        {priorities.map((p) => (
                            <button
                                key={p.value}
                                type="button"
                                onClick={() => setPriority(p.value)}
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 border ${priority === p.value
                                    ? 'border-teal-500 bg-teal-500/10 text-teal-400'
                                    : isDark
                                        ? 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <span className="text-base">{p.icon}</span>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Title */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className={labelClass} style={{ marginBottom: 0 }}>Title *</label>
                        <span className={`text-xs ${title.length > MAX_TITLE_LENGTH * 0.9 ? 'text-red-400' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {title.length}/{MAX_TITLE_LENGTH}
                        </span>
                    </div>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
                        placeholder="Enter notification title..."
                        className={inputClass}
                    />
                </div>

                {/* Message */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className={labelClass} style={{ marginBottom: 0 }}>Message *</label>
                        <span className={`text-xs ${message.length > MAX_MESSAGE_LENGTH * 0.9 ? 'text-red-400' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {message.length}/{MAX_MESSAGE_LENGTH}
                        </span>
                    </div>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                        placeholder="Write your message here..."
                        className={`${inputClass} resize-none`}
                        rows={4}
                    />
                    {/* Character Progress Bar */}
                    <div className="mt-2 h-1 rounded-full bg-gray-700 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-300 ${message.length > MAX_MESSAGE_LENGTH * 0.9 ? 'bg-red-500' : message.length > MAX_MESSAGE_LENGTH * 0.7 ? 'bg-yellow-500' : 'bg-teal-500'}`}
                            style={{ width: `${(message.length / MAX_MESSAGE_LENGTH) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Preview Toggle */}
                <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${showPreview
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {showPreview ? 'Hide Preview' : 'Preview Notification'}
                </button>

                {/* Preview Panel */}
                {showPreview && (
                    <div className={`p-4 rounded-xl border-2 border-dashed ${isDark ? 'border-gray-600 bg-gray-900/50' : 'border-gray-300 bg-gray-50'}`}>
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Preview</div>
                        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${priority === NotificationPriority.CRITICAL ? 'bg-red-500/20' :
                                    priority === NotificationPriority.HIGH ? 'bg-orange-500/20' :
                                        priority === NotificationPriority.MEDIUM ? 'bg-blue-500/20' : 'bg-gray-500/20'
                                    }`}>
                                    {selectedCategory?.icon || '📣'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {title || 'Notification Title'}
                                    </h4>
                                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {message || 'Notification message will appear here...'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                                            {selectedCategory?.label}
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                                            📍 {recipientDescription}
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                                            ⏰ Expires in {getExpirationLabel()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Validation Errors */}
                {!isValid && validationErrors.length > 0 && title.length > 0 && (
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
                        {validationErrors.map((err, i) => (
                            <p key={i} className="text-red-400 text-sm flex items-center gap-2">
                                <span>⚠️</span> {err}
                            </p>
                        ))}
                    </div>
                )}

                {/* Send Button */}
                <button
                    onClick={handleSend}
                    disabled={isSending || !isValid}
                    className={`w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-3 ${isSending || !isValid
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 active:scale-[0.98] shadow-lg shadow-teal-500/25'
                        }`}
                >
                    {isSending ? (
                        <>
                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                            Sending to {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Send to {recipientCount} Recipient{recipientCount !== 1 ? 's' : ''}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default NotificationComposer;
