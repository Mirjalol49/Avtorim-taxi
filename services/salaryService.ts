import { supabase } from '../supabase';
import { DriverSalary } from '../types';

export const addSalary = async (salary: Omit<DriverSalary, 'id'>, fleetId?: string) => {
    const { data, error } = await supabase
        .from('driver_salaries')
        .insert({ ...salary, fleet_id: fleetId ?? null })
        .select('id')
        .single();
    if (error) throw error;
    return data.id as string;
};

export const getDriverSalaryHistory = async (driverId: string, fleetId?: string) => {
    const q = supabase
        .from('driver_salaries')
        .select('*')
        .eq('driver_id', driverId)
        .order('period_start', { ascending: false });

    if (fleetId) q.eq('fleet_id', fleetId);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as DriverSalary[];
};

export const getAllSalaries = async (fleetId?: string) => {
    const q = supabase
        .from('driver_salaries')
        .select('*')
        .order('period_start', { ascending: false });

    if (fleetId) q.eq('fleet_id', fleetId);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as DriverSalary[];
};

export const subscribeToSalaries = (callback: (salaries: DriverSalary[]) => void, fleetId?: string) => {
    const fetch = () =>
        supabase
            .from('driver_salaries')
            .select('*')
            .eq('fleet_id', fleetId ?? null)
            .order('period_start', { ascending: false })
            .then(({ data }) => { if (data) callback(data as DriverSalary[]); });

    fetch();

    const channel = supabase
        .channel(`salaries_${fleetId ?? 'global'}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_salaries', filter: fleetId ? `fleet_id=eq.${fleetId}` : undefined }, fetch)
        .subscribe();

    return () => { supabase.removeChannel(channel); };
};

export const clearSalaryHistory = async (fleetId?: string) => {
    const q = supabase.from('driver_salaries').delete();
    if (fleetId) q.eq('fleet_id', fleetId);
    else q.neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
    const { error } = await q;
    if (error) throw error;
    return true;
};

export const deleteSalary = async (_salaryId: string, _fleetId?: string) => {
    throw new Error('Salary deletion is disabled. Please use refund instead.');
};

export const deleteSalaries = async (_salaryIds: string[], _fleetId?: string) => {
    throw new Error('Salary deletion is disabled. Please use refund instead.');
};

export const deleteSalaryWithSync = async (
    _salaryId: string,
    _driverId: string,
    _amount: number,
    _effectiveDate: number,
    _performedBy: string,
    _fleetId?: string
) => {
    throw new Error('Salary deletion is disabled. Please use refund instead.');
};
