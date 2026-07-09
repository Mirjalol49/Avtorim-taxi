import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
    from: vi.fn(),
    driverUpdates: [] as unknown[],
}));

vi.mock('../supabase', () => ({
    supabase: supabaseMock,
}));

function updateBuilder(table: string, payload: unknown) {
    if (table === 'drivers') supabaseMock.driverUpdates.push(payload);
    return {
        eq: vi.fn(async () => ({ error: null })),
    };
}

function selectBuilder(table: string, columns: string) {
    const state = {
        eq: vi.fn(() => state),
        is: vi.fn(() => state),
        order: vi.fn(() => state),
        limit: vi.fn(() => state),
        single: vi.fn(async () => {
            if (table === 'cars' && columns === 'daily_plan') return { data: { daily_plan: 700000 }, error: null };
            if (table === 'cars' && columns === 'assigned_driver_id') return { data: { assigned_driver_id: 'driver-1' }, error: null };
            if (table === 'cars' && columns === 'fleet_id') return { data: { fleet_id: 'fleet-1' }, error: null };
            if (table === 'drivers') {
                return {
                    data: {
                        plan_history: [],
                        created_ms: new Date(2026, 0, 1).getTime(),
                        daily_plan: 500000,
                    },
                    error: null,
                };
            }
            return { data: null, error: null };
        }),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    };
    return state;
}

describe('carsService assignment plan consistency', () => {
    beforeEach(() => {
        supabaseMock.driverUpdates.length = 0;
        supabaseMock.from.mockReset();
        supabaseMock.from.mockImplementation((table: string) => ({
            update: vi.fn((payload: unknown) => updateBuilder(table, payload)),
            select: vi.fn((columns: string) => selectBuilder(table, columns)),
            insert: vi.fn(async () => ({ error: null })),
        }));
    });

    it('assignCar updates the driver current daily plan with the car plan', async () => {
        const { assignCar } = await import('../services/carsService');

        await assignCar('car-1', 'driver-1', new Date(2026, 4, 22).getTime());

        expect(supabaseMock.driverUpdates).toContainEqual(expect.objectContaining({
            daily_plan: 700000,
            plan_history: expect.any(Array),
        }));
    });

    it('unassignCar clears the driver current daily plan', async () => {
        const { unassignCar } = await import('../services/carsService');

        await unassignCar('car-1', new Date(2026, 4, 22).getTime());

        expect(supabaseMock.driverUpdates).toContainEqual(expect.objectContaining({
            daily_plan: 0,
            plan_history: expect.any(Array),
        }));
    });
});
