import { AdminUser, UserRole } from '../../../core/types';

export interface NotificationAuthProfile {
    id?: string;
    createdAt?: number;
    created_ms?: number;
    fleet_id?: string;
    fleetId?: string;
    created_by?: string;
    createdBy?: string;
}

export interface NotificationAuthIdentity {
    fleetId: string;
    userId: string;
    createdAt?: number;
}

export function getNotificationFleetId(
    userRole: UserRole,
    adminUser: Pick<AdminUser, 'id'> | null | undefined,
    adminProfile: NotificationAuthProfile | null | undefined,
) {
    if (userRole === 'viewer') {
        return adminProfile?.fleet_id || adminProfile?.created_by || adminProfile?.fleetId || adminProfile?.createdBy;
    }

    return adminUser?.id;
}

export function getNotificationIdentity(
    userRole: UserRole,
    adminUser: Pick<AdminUser, 'id' | 'createdAt'> | null | undefined,
    adminProfile: NotificationAuthProfile | null | undefined,
): NotificationAuthIdentity | null {
    const fleetId = getNotificationFleetId(userRole, adminUser, adminProfile);
    if (!fleetId) return null;

    if (userRole === 'viewer') {
        const userId = adminProfile?.id || adminUser?.id;
        if (!userId) return null;
        return {
            fleetId,
            userId,
            createdAt: adminProfile?.created_ms || adminProfile?.createdAt,
        };
    }

    if (!adminUser?.id) return null;
    return {
        fleetId,
        userId: adminUser.id,
        createdAt: adminUser.createdAt,
    };
}

export function getNotificationUserId(
    userRole: UserRole,
    adminUser: Pick<AdminUser, 'id' | 'createdAt'> | null | undefined,
    adminProfile: NotificationAuthProfile | null | undefined,
) {
    return getNotificationIdentity(userRole, adminUser, adminProfile)?.userId || 'global';
}
