import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
    from: vi.fn(),
    calls: [] as Array<{ table: string; action: string; payload?: unknown }>,
}));

vi.mock('../supabase', () => ({
    supabase: supabaseMock,
}));

describe('notification dismiss persistence', () => {
    beforeEach(() => {
        supabaseMock.calls.length = 0;
        supabaseMock.from.mockReset();
        supabaseMock.from.mockImplementation((table: string) => {
            if (table === 'notification_reads') {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(async () => ({
                            data: [{ notification_id: 'read-1' }],
                            error: null,
                        })),
                    })),
                };
            }

            return {
                delete: vi.fn(() => {
                    supabaseMock.calls.push({ table, action: 'delete' });
                    return { eq: vi.fn(async () => ({ error: null })) };
                }),
                upsert: vi.fn(async (payload: unknown) => {
                    supabaseMock.calls.push({ table, action: 'upsert', payload });
                    return { error: null };
                }),
            };
        });
    });

    it('deleting one notification records a user dismiss instead of deleting the source row', async () => {
        const { deleteNotification } = await import('../services/notificationService');

        await deleteNotification('notif-1', 'user-1');

        expect(supabaseMock.calls).toEqual([{
            table: 'notification_deletes',
            action: 'upsert',
            payload: [{
                notification_id: 'notif-1',
                user_id: 'user-1',
                deleted_at: expect.any(Number),
            }],
        }]);
        expect(supabaseMock.calls.some(call => call.table === 'notifications' && call.action === 'delete')).toBe(false);
    });

    it('clearing notifications records dismisses without deleting notification rows', async () => {
        const { clearAllReadNotifications } = await import('../services/notificationService');

        await clearAllReadNotifications('user-1', ['notif-1', 'notif-2']);

        expect(supabaseMock.calls).toEqual([{
            table: 'notification_deletes',
            action: 'upsert',
            payload: [
                {
                    notification_id: 'notif-1',
                    user_id: 'user-1',
                    deleted_at: expect.any(Number),
                },
                {
                    notification_id: 'notif-2',
                    user_id: 'user-1',
                    deleted_at: expect.any(Number),
                },
            ],
        }]);
        expect(supabaseMock.calls.some(call => call.table === 'notifications' && call.action === 'delete')).toBe(false);
    });
});
