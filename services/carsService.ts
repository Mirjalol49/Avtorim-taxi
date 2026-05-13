import { supabase } from '../supabase';
import { Car } from '../src/core/types';
import { appendPlanChange, buildInitialPlanHistory } from '../src/features/cars/utils/planHistory';
import { appendDriverPlanChange } from '../src/features/drivers/utils/driverPlanHistory';

const toMs = (v: any) => (typeof v === 'number' ? v : v ? Number(v) : Date.now());

export const subscribeToCars = (callback: (cars: Car[]) => void, fleetId?: string) => {
    if (!fleetId) return { unsubscribe: () => {}, refetch: () => {} };

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchCars = async () => {
        const controller = new AbortController();
        const abort = setTimeout(() => controller.abort(), 5000);
        try {
            const { data, error } = await supabase
                .from('cars')
                // ⚠️ documents can be large base64 blobs — excluded, loaded on demand in CarModal.
                // avatar IS included — it's shown throughout the UI (car cards, damage page, etc.).
                .select('id,fleet_id,name,license_plate,assigned_driver_id,daily_plan,plan_history,day_overrides,is_deleted,created_ms,damage,avatar,in_repair')
                .eq('fleet_id', fleetId)
                .eq('is_deleted', false)
                .abortSignal(controller.signal);
            clearTimeout(abort);
            if (error) throw error;
            if (data) callback(data.map(r => ({
                id: r.id,
                fleetId: r.fleet_id,
                name: r.name,
                licensePlate: r.license_plate,
                avatar: r.avatar ?? '',
                documents: [],        // not fetched here — load on demand in CarModal
                assignedDriverId: r.assigned_driver_id ?? null,
                dailyPlan: r.daily_plan ?? 0,
                planHistory: r.plan_history ?? [],
                dayOverrides: r.day_overrides ?? undefined,
                isDeleted: r.is_deleted,
                createdAt: toMs(r.created_ms),
                inRepair: r.in_repair ?? false,
                damage: r.damage ?? [],
            } as Car)));
        } catch (err: any) {
            clearTimeout(abort);
            console.warn('[PWA] Fetch cars failed, retrying in 3s...', err.message);
            setTimeout(fetchCars, 3000);
        }
    };

    const debouncedFetch = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchCars, 300);
    };

    // Fire immediately — data shows before WebSocket channel connects
    fetchCars();

    const channel = supabase
        .channel(`cars_${fleetId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cars', filter: `fleet_id=eq.${fleetId}` }, debouncedFetch)
        .subscribe((() => {
            let subscribedCount = 0;
            return (status: string) => {
                if (status === 'SUBSCRIBED') {
                    if (++subscribedCount > 1) debouncedFetch();
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    debouncedFetch();
                }
            };
        })());

    return {
        unsubscribe: () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        },
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
            in_repair: car.inRepair ?? false,
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
    if (car.damage !== undefined)    payload.damage = car.damage;
    if (car.inRepair !== undefined)  payload.in_repair = car.inRepair;
    if ('assignedDriverId' in car) {
        payload.assigned_driver_id = car.assignedDriverId ?? null;

        // Fetch current car state to handle driver assignment changes
        const { data: current } = await supabase
            .from('cars')
            .select('assigned_driver_id, daily_plan')
            .eq('id', id)
            .single();

        if (current) {
            const oldDriverId = current.assigned_driver_id;
            const newDriverId = car.assignedDriverId;

            // If the car is taken away from an existing driver
            if (oldDriverId && oldDriverId !== newDriverId) {
                const { data: oldDriver } = await supabase.from('drivers').select('plan_history, created_ms, daily_plan').eq('id', oldDriverId).single();
                if (oldDriver) {
                    const newDriverHistory = appendDriverPlanChange(
                        oldDriver.plan_history ?? [],
                        0, // Zero out the plan since they no longer have a car
                        oldDriver.daily_plan ?? 0,
                        null,
                        toMs(oldDriver.created_ms),
                        id
                    );
                    await supabase.from('drivers').update({ plan_history: newDriverHistory, daily_plan: 0 }).eq('id', oldDriverId);
                }
            }

            // If a new driver is being assigned to this car
            if (newDriverId && oldDriverId !== newDriverId) {
                const { data: newDriver } = await supabase.from('drivers').select('plan_history, created_ms, daily_plan').eq('id', newDriverId).single();
                if (newDriver) {
                    const newDriverHistory = appendDriverPlanChange(
                        newDriver.plan_history ?? [],
                        current.daily_plan ?? 0, // Inherit car's daily plan
                        newDriver.daily_plan ?? 0,
                        id,
                        toMs(newDriver.created_ms)
                    );
                    await supabase.from('drivers').update({ plan_history: newDriverHistory, daily_plan: current.daily_plan ?? 0 }).eq('id', newDriverId);
                }
            }
        }
    }

    // ── Plan change: append to history instead of just overwriting ──────────
    if (car.dailyPlan !== undefined) {
        payload.daily_plan = car.dailyPlan;

        // Fetch current plan_history + created_ms to correctly append
        const { data: current } = await supabase
            .from('cars')
            .select('daily_plan, plan_history, created_ms, assigned_driver_id')
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

            if (current.assigned_driver_id) {
                const { data: driverData } = await supabase.from('drivers').select('plan_history, created_ms, daily_plan').eq('id', current.assigned_driver_id).single();
                if (driverData) {
                    const newDriverHistory = appendDriverPlanChange(
                        driverData.plan_history ?? [],
                        car.dailyPlan,
                        current.daily_plan ?? 0,
                        id,
                        toMs(driverData.created_ms),
                        id
                    );
                    await supabase.from('drivers').update({ plan_history: newDriverHistory, daily_plan: car.dailyPlan }).eq('id', current.assigned_driver_id);
                }
            }
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
    // 1. Assign the car
    const { error } = await supabase.from('cars').update({ assigned_driver_id: driverId }).eq('id', carId);
    if (error) throw error;

    // 2. Fetch car's current plan
    const { data: carData } = await supabase.from('cars').select('daily_plan').eq('id', carId).single();
    const newPlan = carData?.daily_plan ?? 0;

    // 3. Update driver's plan history
    const { data: driverData } = await supabase.from('drivers').select('plan_history, created_ms, daily_plan').eq('id', driverId).single();
    if (driverData) {
        const newHistory = appendDriverPlanChange(
            driverData.plan_history ?? [],
            newPlan,
            driverData.daily_plan ?? 0,
            carId,
            toMs(driverData.created_ms)
        );
        await supabase.from('drivers').update({ plan_history: newHistory }).eq('id', driverId);
    }
};

export const unassignCar = async (carId: string) => {
    const { data: carData } = await supabase.from('cars').select('assigned_driver_id').eq('id', carId).single();
    const driverId = carData?.assigned_driver_id;

    const { error } = await supabase.from('cars').update({ assigned_driver_id: null }).eq('id', carId);
    if (error) throw error;

    if (driverId) {
        // 3. Update driver's plan history to 0
        const { data: driverData } = await supabase.from('drivers').select('plan_history, created_ms, daily_plan').eq('id', driverId).single();
        if (driverData) {
            const newHistory = appendDriverPlanChange(
                driverData.plan_history ?? [],
                0,
                driverData.daily_plan ?? 0,
                null,
                toMs(driverData.created_ms)
            );
            await supabase.from('drivers').update({ plan_history: newHistory }).eq('id', driverId);
        }
    }
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
