import { supabase } from '../supabase';
import { Car } from '../src/core/types';
import { appendPlanChange, buildInitialPlanHistory } from '../src/features/cars/utils/planHistory';

const toMs = (v: any) => (typeof v === 'number' ? v : v ? Number(v) : Date.now());

export const subscribeToCars = (callback: (cars: Car[]) => void, fleetId?: string) => {
    if (!fleetId) return { unsubscribe: () => {}, refetch: () => {} };

    const fetchCars = () =>
        supabase
            .from('cars')
            .select('*')
            .eq('fleet_id', fleetId)
            .eq('is_deleted', false)
            .then(({ data }) => {
                if (data) callback(data.map(r => ({
                    id: r.id,
                    fleetId: r.fleet_id,
                    name: r.name,
                    licensePlate: r.license_plate,
                    avatar: r.avatar ?? '',
                    documents: r.documents ?? [],
                    assignedDriverId: r.assigned_driver_id ?? null,
                    dailyPlan: r.daily_plan ?? 0,
                    planHistory: r.plan_history ?? [],
                    dayOverrides: r.day_overrides ?? undefined,  // safe: undefined until migration runs
                    isDeleted: r.is_deleted,
                    createdAt: toMs(r.created_ms),
                } as Car)));
            });

    // Fire immediately — data shows before WebSocket channel connects
    fetchCars();

    const channel = supabase
        .channel(`cars_${fleetId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cars', filter: `fleet_id=eq.${fleetId}` }, fetchCars)
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') fetchCars();
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') fetchCars();
        });

    return {
        unsubscribe: () => { supabase.removeChannel(channel); },
        refetch: fetchCars,
    };
};

export const addCar = async (car: Omit<Car, 'id'>, fleetId: string) => {
    const createdAt = Date.now();
    const planHistory = buildInitialPlanHistory(car.dailyPlan ?? 0, createdAt);

    const { data, error } = await supabase
        .from('cars')
        .insert({
            fleet_id: fleetId,
            name: car.name,
            license_plate: car.licensePlate,
            avatar: car.avatar ?? '',
            documents: car.documents ?? [],
            assigned_driver_id: null,
            daily_plan: car.dailyPlan ?? 0,
            plan_history: planHistory,
            // day_overrides omitted — handled by DB DEFAULT '{}' after migration
            is_deleted: false,
            created_ms: createdAt,
        })
        .select('id')
        .single();
    if (error) throw error;
    return data.id as string;
};

export const updateCar = async (id: string, car: Partial<Car>) => {
    const payload: any = {};
    if (car.name !== undefined) payload.name = car.name;
    if (car.licensePlate !== undefined) payload.license_plate = car.licensePlate;
    if (car.avatar !== undefined) payload.avatar = car.avatar;
    if (car.documents !== undefined) payload.documents = car.documents;
    if ('assignedDriverId' in car) payload.assigned_driver_id = car.assignedDriverId ?? null;

    // ── Plan change: append to history instead of just overwriting ──────────
    if (car.dailyPlan !== undefined) {
        payload.daily_plan = car.dailyPlan;

        // Fetch current plan_history + created_ms to correctly append
        const { data: current } = await supabase
            .from('cars')
            .select('daily_plan, plan_history, created_ms')
            .eq('id', id)
            .single();

        if (current) {
            const newHistory = appendPlanChange(
                current.plan_history ?? [],
                car.dailyPlan,
                current.daily_plan ?? 0,
                toMs(current.created_ms),
            );
            payload.plan_history = newHistory;
        }
    }

    const { error } = await supabase.from('cars').update(payload).eq('id', id);
    if (error) throw error;

    if (payload.name !== undefined || payload.license_plate !== undefined) {
        const { data: updated } = await supabase
            .from('cars').select('name, license_plate, assigned_driver_id').eq('id', id).single();
        if (updated) {
            const carName = `${updated.name} — ${updated.license_plate}`;
            await supabase.from('transactions').update({ car_name: carName }).eq('car_id', id).neq('status', 'DELETED');

            if (updated.assigned_driver_id) {
                const driverUpdate: Record<string, unknown> = {};
                if (payload.name !== undefined) driverUpdate.car = updated.name;
                if (payload.license_plate !== undefined) driverUpdate.car_number = updated.license_plate;
                await supabase.from('drivers').update(driverUpdate).eq('id', updated.assigned_driver_id);
            }
        }
    }
};

export const assignCar = async (carId: string, driverId: string) => {
    const { error } = await supabase.from('cars').update({ assigned_driver_id: driverId }).eq('id', carId);
    if (error) throw error;
};

export const unassignCar = async (carId: string) => {
    const { error } = await supabase.from('cars').update({ assigned_driver_id: null }).eq('id', carId);
    if (error) throw error;
};

export const deleteCar = async (id: string) => {
    const { error } = await supabase.from('cars').update({ is_deleted: true, assigned_driver_id: null }).eq('id', id);
    if (error) throw error;
};

export const setDayOverride = async (carId: string, dateKey: string, override: import('../src/core/types/car.types').DayOverride) => {
    const { data: current } = await supabase.from('cars').select('day_overrides').eq('id', carId).single();
    if (!current) throw new Error('Car not found');

    const overrides = current.day_overrides || {};
    overrides[dateKey] = override;

    const { error } = await supabase.from('cars').update({ day_overrides: overrides }).eq('id', carId);
    if (error) throw error;
};

export const clearDayOverride = async (carId: string, dateKey: string) => {
    const { data: current } = await supabase.from('cars').select('day_overrides').eq('id', carId).single();
    if (!current) throw new Error('Car not found');

    const overrides = current.day_overrides || {};
    delete overrides[dateKey];

    const { error } = await supabase.from('cars').update({ day_overrides: overrides }).eq('id', carId);
    if (error) throw error;
};
