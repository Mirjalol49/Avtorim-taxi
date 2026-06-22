import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
    eqCalls: [] as Array<{ table: string; column: string; value: unknown }>,
    channelFilters: [] as string[],
}));

vi.mock('../supabase', () => ({
    supabase: supabaseMock,
}));

describe('notification subscription scoping', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        supabaseMock.from.mockReset();
        supabaseMock.channel.mockReset();
        supabaseMock.removeChannel.mockReset();
        supabaseMock.eqCalls.length = 0;
        supabaseMock.channelFilters.length = 0;

        supabaseMock.from.mockImplementation((table: string) => {
            if (table === 'notifications') {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn((column: string, value: unknown) => {
                            supabaseMock.eqCalls.push({ table, column, value });
                            return {
                                gt: vi.fn(() => ({
                                    order: vi.fn(() => ({
                                        limit: vi.fn(async () => ({
                                            data: [{
                                                id: 'notif-1',
                                                title: 'Viewer note',
                                                message: 'For viewers',
                                                type: 'announcement',
                                                category: 'system',
                                                priority: 'medium',
                                                target_users: 'role:viewer',
                                                created_by: 'admin-1',
                                                created_by_name: 'Admin',
                                                created_ms: Date.now(),
                                                expires_at: Date.now() + 1000,
                                                delivery_tracking: {},
                                                min_account_age: null,
                                            }],
                                            error: null,
                                        })),
                                    })),
                                })),
                            };
                        }),
                    })),
                };
            }

            return {
                select: vi.fn(() => ({
                    eq: vi.fn((column: string, value: unknown) => {
                        supabaseMock.eqCalls.push({ table, column, value });
                        return Promise.resolve({ data: [], error: null });
                    }),
                })),
            };
        });

        supabaseMock.channel.mockReturnValue({
            on: vi.fn((_event: string, options: { filter?: string }) => {
                if (options.filter) supabaseMock.channelFilters.push(options.filter);
                return supabaseMock.channel.mock.results[0].value;
            }),
            subscribe: vi.fn(() => ({ topic: 'channel' })),
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('uses fleet id for notification visibility and viewer id for user state', async () => {
        const { subscribeToNotifications } = await import('../services/notificationService');
        const callback = vi.fn();

        const unsubscribe = subscribeToNotifications(
            { fleetId: 'fleet-1', userId: 'viewer-1' },
            0,
            'viewer',
            callback
        );

        await vi.advanceTimersByTimeAsync(400);

        expect(callback).toHaveBeenCalledWith(
            [expect.objectContaining({ id: 'notif-1' })],
            1,
            expect.any(Set)
        );
        expect(supabaseMock.eqCalls).toEqual(expect.arrayContaining([
            { table: 'notifications', column: 'fleet_id', value: 'fleet-1' },
            { table: 'notification_reads', column: 'user_id', value: 'viewer-1' },
            { table: 'notification_deletes', column: 'user_id', value: 'viewer-1' },
        ]));
        expect(supabaseMock.channelFilters).toEqual(expect.arrayContaining([
            'fleet_id=eq.fleet-1',
            'user_id=eq.viewer-1',
        ]));

        unsubscribe();
    });
});
