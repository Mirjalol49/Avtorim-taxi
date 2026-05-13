import { supabase } from '../supabase';
import { Fine, FineStatus } from '../src/core/types/fines.types';

const toFine = (r: any): Fine => ({
    id: r.id,
    fleetId: r.fleet_id,
    driverId: r.driver_id,
    carId: r.car_id,
    amount: r.amount,
    fineDate: r.fine_date,
    status: (r.status as FineStatus) ?? 'UNPAID',
    description: r.description ?? '',
    photoUrl: r.photo_url ?? null,
    createdMs: r.created_at,
    updatedMs: r.updated_at,
    // We can manually join driverName in the hook if needed, 
    // or if the query uses a join we map it:
    driverName: r.drivers?.name,
    carName: r.cars ? `${r.cars.name} ${r.cars.license_plate}` : undefined,
});

export const subscribeToFines = (callback: (fines: Fine[], error?: boolean) => void, fleetId?: string) => {
    if (!fleetId) return { unsubscribe: () => {}, refetch: () => {} };

    const fetchFines = async () => {
        try {
            const { data, error } = await supabase
                .from('fines')
                .select(`
                    id, fleet_id, driver_id, car_id, amount, fine_date, status, description, photo_url, created_at, updated_at,
                    drivers(name),
                    cars(name, license_plate)
                `)
                .eq('fleet_id', fleetId)
                .order('fine_date', { ascending: false })
                .limit(500);

            if (error) {
                console.error("fetchFines error:", error);
                callback([], true);
                return;
            }
            callback((data ?? []).map(toFine));
        } catch (e) {
            console.error("fetchFines catch:", e);
            callback([], true);
        }
    };

    fetchFines();

    const uniqueId = Math.random().toString(36).substring(7);
    const channelName = `fines_${fleetId}_${uniqueId}`;

    const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fines', filter: `fleet_id=eq.${fleetId}` }, () => fetchFines())
        .subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') fetchFines();
        });

    return {
        unsubscribe: () => { supabase.removeChannel(channel); },
        refetch: fetchFines,
    };
};

export const addFine = async (fine: Omit<Fine, 'id' | 'driverName' | 'carName'>) => {
    const { data, error } = await supabase
        .from('fines')
        .insert({
            fleet_id: fine.fleetId,
            driver_id: fine.driverId,
            car_id: fine.carId,
            amount: fine.amount,
            fine_date: fine.fineDate,
            status: fine.status,
            description: fine.description,
            photo_url: fine.photoUrl,
            created_at: fine.createdMs ?? Date.now(),
            updated_at: fine.updatedMs ?? Date.now(),
        })
        .select('id')
        .single();

    if (error) throw new Error(error.message);
    return data.id as string;
};

export const updateFine = async (id: string, updates: Partial<Omit<Fine, 'id' | 'fleetId' | 'createdMs'>>) => {
    const row: Record<string, any> = { updated_at: Date.now() };
    if (updates.driverId !== undefined) row.driver_id = updates.driverId;
    if (updates.carId !== undefined) row.car_id = updates.carId;
    if (updates.amount !== undefined) row.amount = updates.amount;
    if (updates.fineDate !== undefined) row.fine_date = updates.fineDate;
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.photoUrl !== undefined) row.photo_url = updates.photoUrl;

    const { error } = await supabase.from('fines').update(row).eq('id', id);
    if (error) throw new Error(error.message);
};

export const deleteFine = async (id: string) => {
    const { error } = await supabase.from('fines').delete().eq('id', id);
    if (error) throw new Error(error.message);
};
