/**
 * Notification System Type Definitions
 * 
 * Enhanced notification types supporting account-specific filtering,
 * role-based targeting, priority levels, and delivery tracking
 */

export enum NotificationCategory {
    ANNOUNCEMENT = 'announcement',
    FEATURE_UPDATE = 'feature_update',
    PAYMENT_REMINDER = 'payment_reminder',
    SYSTEM_MESSAGE = 'system_message',
    ACCOUNT_UPDATE = 'account_update',
    SECURITY_ALERT = 'security_alert'
}

export enum NotificationPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

export type NotificationTargetType =
    | 'all'           // All users
    | 'role:admin'    // All admin users
    | 'role:viewer'   // All viewer users
    | string[];       // Specific user IDs

export interface NotificationDeliveryTracking {
    sent: number;           // Timestamp when notification was created
    delivered: string[];    // User IDs who received the notification
    read: string[];        // User IDs who read the notification
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'payment_reminder' | 'feature_update' | 'announcement' | 'system';
    category: NotificationCategory;
    priority: NotificationPriority;
    createdAt: number;
    expiresAt: number;
    createdBy: string;
    createdByName: string;
    targetUsers: NotificationTargetType;
    minAccountAge?: number;  // Optional: Only show to accounts created after this timestamp
    deliveryTracking?: NotificationDeliveryTracking;
}

export interface UserNotificationRead {
    notificationId: string;
    userId: string;
    readAt: number;
}

export interface UserNotificationDelete {
    notificationId: string;
    userId: string;
    deletedAt: number;
}

export interface UserNotificationSettings {
    userId: string;
    accountCreatedAt: number;
    lastNotificationCheck?: number;
    preferences?: {
        enableSound?: boolean;
        enableBadge?: boolean;
        categories?: NotificationCategory[];
    };
}

export interface NotificationFormData {
    title: string;
    message: string;
    category: NotificationCategory;
    priority: NotificationPriority;
    targetType: 'all' | 'role' | 'specific';
    targetRole?: 'admin' | 'viewer';
    targetUserIds?: string[];
    expirationType: '1h' | '24h' | '7d' | '30d' | 'never';
    minAccountAge?: number;
}

export interface NotificationStats {
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    deliveryRate: number;
    readRate: number;
}
