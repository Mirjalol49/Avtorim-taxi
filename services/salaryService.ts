import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { DriverSalary } from '../types';

const SALARIES_COLLECTION = 'driver_salaries';

export const addSalary = async (salary: Omit<DriverSalary, 'id'>) => {
    try {
        // Validation: Check for overlapping effective dates or other constraints if needed
        // For now, we trust the UI validation but we could add checks here.

        const docRef = await addDoc(collection(db, SALARIES_COLLECTION), salary);
        return docRef.id;
    } catch (error) {
        console.error('Error adding salary record:', error);
        throw error;
    }
};

export const getDriverSalaryHistory = async (driverId: string) => {
    try {
        const q = query(
            collection(db, SALARIES_COLLECTION),
            where('driverId', '==', driverId),
            orderBy('effectiveDate', 'desc')
        );

        const snapshot = await getDocs(q);
        const salaries: DriverSalary[] = [];
        snapshot.forEach((doc) => {
            salaries.push({ id: doc.id, ...doc.data() } as DriverSalary);
        });
        return salaries;
    } catch (error) {
        console.error('Error fetching salary history:', error);
        throw error;
    }
};

export const getAllSalaries = async () => {
    try {
        const q = query(collection(db, SALARIES_COLLECTION), orderBy('effectiveDate', 'desc'));
        const snapshot = await getDocs(q);
        const salaries: DriverSalary[] = [];
        snapshot.forEach((doc) => {
            salaries.push({ id: doc.id, ...doc.data() } as DriverSalary);
        });
        return salaries;
    } catch (error) {
        console.error('Error fetching all salaries:', error);
        throw error;
    }
};
export const subscribeToSalaries = (callback: (salaries: DriverSalary[]) => void) => {
    const q = query(collection(db, SALARIES_COLLECTION), orderBy('effectiveDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const salaries: DriverSalary[] = [];
        snapshot.forEach((doc) => {
            salaries.push({ id: doc.id, ...doc.data() } as DriverSalary);
        });
        callback(salaries);
    }, (error) => {
        console.error('Error subscribing to salaries:', error);
    });
};
