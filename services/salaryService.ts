import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp,
    onSnapshot,
    deleteDoc,
    writeBatch,
    doc,
    limit,
    getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { DriverSalary, TransactionType, PaymentStatus } from '../types';

const SALARIES_COLLECTION = 'driver_salaries';
const TRANSACTIONS_COLLECTION = 'transactions';
const AUDIT_LOGS_COLLECTION = 'audit_logs';

// Helper to get collection path based on fleetId
const getCollectionPath = (baseCollection: string, fleetId?: string) => {
    if (fleetId) {
        return `fleets/${fleetId}/${baseCollection}`;
    }
    return baseCollection;
};

export const addSalary = async (salary: Omit<DriverSalary, 'id'>, fleetId?: string) => {
    try {
        const docRef = await addDoc(collection(db, getCollectionPath(SALARIES_COLLECTION, fleetId)), salary);
        return docRef.id;
    } catch (error) {
        console.error('Error adding salary record:', error);
        throw error;
    }
};

export const getDriverSalaryHistory = async (driverId: string, fleetId?: string) => {
    try {
        const q = query(
            collection(db, getCollectionPath(SALARIES_COLLECTION, fleetId)),
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

export const getAllSalaries = async (fleetId?: string) => {
    try {
        const q = query(collection(db, getCollectionPath(SALARIES_COLLECTION, fleetId)), orderBy('effectiveDate', 'desc'));
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

export const subscribeToSalaries = (callback: (salaries: DriverSalary[]) => void, fleetId?: string) => {
    const q = query(collection(db, getCollectionPath(SALARIES_COLLECTION, fleetId)), orderBy('effectiveDate', 'desc'));
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

export const clearSalaryHistory = async (fleetId?: string) => {
    try {
        const q = query(collection(db, getCollectionPath(SALARIES_COLLECTION, fleetId)));
        const snapshot = await getDocs(q);

        // Delete in batches of 500 (Firestore limit)
        const batchSize = 500;
        const chunks = [];
        const docs = snapshot.docs;

        for (let i = 0; i < docs.length; i += batchSize) {
            chunks.push(docs.slice(i, i + batchSize));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(docSnapshot => {
                batch.delete(doc(db, getCollectionPath(SALARIES_COLLECTION, fleetId), docSnapshot.id));
            });
            await batch.commit();
        }

        return true;
    } catch (error) {
        console.error('Error clearing salary history:', error);
        throw error;
    }
};

// Delete a single salary record
export const deleteSalary = async (salaryId: string, fleetId?: string) => {
    console.error('Salary deletion is disabled. Please use refund instead.');
    throw new Error('Salary deletion is disabled. Please use refund instead.');
};

// Delete multiple salary records
export const deleteSalaries = async (salaryIds: string[], fleetId?: string) => {
    console.error('Salary deletion is disabled. Please use refund instead.');
    throw new Error('Salary deletion is disabled. Please use refund instead.');
};

// Delete salary and corresponding transaction atomically
export const deleteSalaryWithSync = async (
    salaryId: string,
    driverId: string,
    amount: number,
    effectiveDate: number,
    performedBy: string,
    fleetId?: string
) => {
    console.error('Salary deletion is disabled. Please use refund instead.');
    throw new Error('Salary deletion is disabled. Please use refund instead.');
};
