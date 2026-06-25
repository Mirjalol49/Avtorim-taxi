import { describe, expect, it } from 'vitest';
import {
    getNotificationFleetId,
    getNotificationIdentity,
    getNotificationUserId,
} from '../src/features/notifications/utils/notificationIdentity';

describe('notification identity helpers', () => {
    it('uses viewer id for per-user read and delete state while keeping fleet scope', () => {
        const adminUser = { id: 'fleet-1', createdAt: 100 };
        const viewerProfile = { id: 'viewer-1', fleet_id: 'fleet-1', created_ms: 200 };

        expect(getNotificationFleetId('viewer', adminUser, viewerProfile)).toBe('fleet-1');
        expect(getNotificationIdentity('viewer', adminUser, viewerProfile)).toEqual({
            fleetId: 'fleet-1',
            userId: 'viewer-1',
            createdAt: 200,
        });
        expect(getNotificationUserId('viewer', adminUser, viewerProfile)).toBe('viewer-1');
    });

    it('uses admin id for admin notification state', () => {
        const adminUser = { id: 'fleet-1', createdAt: 100 };

        expect(getNotificationIdentity('admin', adminUser, null)).toEqual({
            fleetId: 'fleet-1',
            userId: 'fleet-1',
            createdAt: 100,
        });
        expect(getNotificationUserId('admin', adminUser, null)).toBe('fleet-1');
    });
});
