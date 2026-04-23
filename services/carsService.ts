import { supabase } from '../supabase';
import { Car } from '../src/core/types';

const toMs = (v: any) => (typeof v === 'number' ? v : v ? Number(v) : Date.now());

export const subscribeToCars = (callback: (cars: Car[]) => void, fleetId?: string) => {
    if (!fleetId) return () => {};

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
                    isDeleted: r.is_deleted,
                    createdAt: toMs(r.created_ms),
                } as Car)));
            });

    fetchCars();

    const channel = supabase
        .channel(`cars_${fleetId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cars', filter: `fleet_id=eq.${fleetId}` }, fetchCars)
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};

export const addCar = async (car: Omit<Car, 'id'>, fleetId: string) => {
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
            is_deleted: false,
            created_ms: Date.now(),
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
    if (car.dailyPlan !== undefined) payload.daily_plan = car.dailyPlan;
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
