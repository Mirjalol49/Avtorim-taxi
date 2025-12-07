import { useState, useEffect } from 'react';
import { DriverSalary } from '../../../core/types';
import { subscribeToSalaries } from '../../../../services/salaryService';

export const useSalaries = (fleetId?: string) => {
    const [salaryHistory, setSalaryHistory] = useState<DriverSalary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToSalaries(
            (data) => {
                setSalaryHistory(data);
                setLoading(false);
            },
            fleetId
        );

        return () => unsubscribe();
    }, [fleetId]);

    return { salaryHistory, loading };
};
