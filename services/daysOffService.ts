import { supabase } from '../supabase';

export interface DayOff {
    id: string;
    fleetId: string;
    driverId: string;
    dateKey: string;   // 'YYYY-MM-DD'
    monthKey: string;  // 'YYYY-MM'
    note: string;
    createdMs: number;
}

const MONTHLY_ALLOWANCE = 2;

const toDateKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const toMonthKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

const toRecord = (r: any): DayOff => ({
    id: r.id,
    fleetId: r.fleet_id,
    driverId: r.driver_id,
    dateKey: r.date_key,
    monthKey: r.month_key,
    note: r.note ?? '',
    createdMs: r.created_ms,
});

/** Subscribe to all days off for this fleet in real-time */
export const subscribeToDaysOff = (
    callback: (daysOff: DayOff[]) => void,
    fleetId?: string
) => {
    if (!fleetId) return () => {};

    const fetch = () =>
        supabase
            .from('driver_days_off')
            .select('*')
            .eq('fleet_id', fleetId)
            .then(({ data }) => {
                if (data) callback(data.map(toRecord));
            });

    fetch();

    const channel = supabase
        .channel(`days_off_${fleetId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_days_off', filter: `fleet_id=eq.${fleetId}` }, fetch)
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};

/** How many days off a driver has used this month */
export const countUsedThisMonth = (daysOff: DayOff[], driverId: string, monthKey?: string): number => {
    const key = monthKey ?? toMonthKey(new Date());
    return daysOff.filter(d => d.driverId === driverId && d.monthKey === key).length;
};

/** Get all days off for a driver as a Set of 'YYYY-MM-DD' strings */
export const getDaysOffSet = (daysOff: DayOff[], driverId: string): Set<string> => {
    return new Set(daysOff.filter(d => d.driverId === driverId).map(d => d.dateKey));
};

/** Add a day off. Throws if the monthly limit is already reached or day already added. */
export const addDayOff = async (
    driverId: string,
    fleetId: string,
    date: Date,
    note = ''
): Promise<DayOff> => {
    const dateKey = toDateKey(date);
    const monthKey = toMonthKey(date);

    // Check limit
    const { data: existing, error: fetchErr } = await supabase
        .from('driver_days_off')
        .select('id')
        .eq('driver_id', driverId)
        .eq('month_key', monthKey);

    if (fetchErr) throw new Error(fetchErr.message);
    if ((existing ?? []).length >= MONTHLY_ALLOWANCE) {
        throw new Error(`Limit reached: only ${MONTHLY_ALLOWANCE} days off allowed per month.`);
    }

    const { data, error } = await supabase
        .from('driver_days_off')
        .insert({
            fleet_id: fleetId,
            driver_id: driverId,
            date_key: dateKey,
            month_key: monthKey,
            note,
            created_ms: Date.now(),
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') throw new Error('This day is already marked as a day off.');
        throw new Error(error.message);
    }

    return toRecord(data);
};

/** Remove a day off by its id */
export const removeDayOff = async (id: string): Promise<void> => {
    const { error } = await supabase.from('driver_days_off').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export { toDateKey, toMonthKey, MONTHLY_ALLOWANCE };
