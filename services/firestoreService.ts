import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    Timestamp,
    setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Driver, Transaction } from '../types';

// Collections
const DRIVERS_COLLECTION = 'drivers';
const TRANSACTIONS_COLLECTION = 'transactions';
const ADMIN_COLLECTION = 'admin';

// ==================== DRIVERS ====================

export const subscribeToDrivers = (callback: (drivers: Driver[]) => void) => {
    const driversRef = collection(db, DRIVERS_COLLECTION);

    return onSnapshot(driversRef, (snapshot) => {
        const drivers: Driver[] = [];
        snapshot.forEach((doc) => {
            const driverData = { id: doc.id, ...doc.data() } as Driver;
            // Filter out deleted drivers on client side (handles missing isDeleted field)
            if (!driverData.isDeleted) {
                drivers.push(driverData);
            }
        });
        callback(drivers);
    }, (error) => {
        console.error('Error fetching drivers:', error);
    });
};

export const addDriver = async (driver: Omit<Driver, 'id'>) => {
    try {
        const docRef = await addDoc(collection(db, DRIVERS_COLLECTION), driver);
        return docRef.id;
    } catch (error) {
        console.error('Error adding driver:', error);
        throw error;
    }
};

export const updateDriver = async (id: string, driver: Partial<Driver>) => {
    try {
        const driverRef = doc(db, DRIVERS_COLLECTION, id);
        await updateDoc(driverRef, driver as any);
    } catch (error) {
        console.error('Error updating driver:', error);
        throw error;
    }
};

export const deleteDriver = async (id: string) => {
    try {
        const driverRef = doc(db, DRIVERS_COLLECTION, id);
        await updateDoc(driverRef, { isDeleted: true });
    } catch (error) {
        console.error('Error deleting driver:', error);
        throw error;
    }
};

// ==================== TRANSACTIONS ====================

export const subscribeToTransactions = (callback: (transactions: Transaction[]) => void) => {
    const txRef = collection(db, TRANSACTIONS_COLLECTION);

    return onSnapshot(txRef, (snapshot) => {
        const transactions: Transaction[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            transactions.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp || Date.now()
            } as Transaction);
        });
        callback(transactions);
    }, (error) => {
        console.error('Error fetching transactions:', error);
    });
};

export const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
        const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), transaction);
        return docRef.id;
    } catch (error) {
        console.error('Error adding transaction:', error);
        throw error;
    }
};

export const deleteTransaction = async (id: string) => {
    try {
        await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, id));
    } catch (error) {
        console.error('Error deleting transaction:', error);
        throw error;
    }
};

// ==================== ADMIN PROFILE ====================

export const subscribeToAdminProfile = (callback: (admin: any) => void) => {
    const adminRef = doc(db, ADMIN_COLLECTION, 'profile');

    return onSnapshot(adminRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data());
        }
    }, (error) => {
        console.error('Error fetching admin profile:', error);
    });
};

export const updateAdminProfile = async (admin: any) => {
    try {
        const adminRef = doc(db, ADMIN_COLLECTION, 'profile');
        await setDoc(adminRef, admin, { merge: true });
    } catch (error) {
        console.error('Error updating admin profile:', error);
        throw error;
    }
};

// ==================== MIGRATION ====================

export const migrateFromLocalStorage = async () => {
    try {
        // Check if migration already done
        const migrated = localStorage.getItem('avtorim_migrated_to_firebase');
        if (migrated) {
            console.log('Migration already completed previously');
            return;
        }

        console.log('Checking for data to migrate from localStorage...');

        let hasData = false;

        // Migrate drivers (only if they exist and are not the default mock data)
        const driversData = localStorage.getItem('avtorim_drivers');
        if (driversData) {
            const drivers = JSON.parse(driversData);
            // Only migrate if there's actual data (not just empty array)
            if (drivers.length > 0) {
                for (const driver of drivers) {
                    const { id, ...driverData } = driver;
                    await setDoc(doc(db, DRIVERS_COLLECTION, id), driverData);
                }
                console.log(`Migrated ${drivers.length} drivers`);
                hasData = true;
            }
        }

        // Migrate transactions
        const txData = localStorage.getItem('avtorim_transactions');
        if (txData) {
            const transactions = JSON.parse(txData);
            if (transactions.length > 0) {
                for (const tx of transactions) {
                    const { id, ...txData } = tx;
                    await setDoc(doc(db, TRANSACTIONS_COLLECTION, id), txData);
                }
                console.log(`Migrated ${transactions.length} transactions`);
                hasData = true;
            }
        }

        // Migrate admin profile (only if it has real data)
        const adminData = localStorage.getItem('avtorim_admin');
        if (adminData) {
            const admin = JSON.parse(adminData);
            // Only migrate if admin has a name
            if (admin.name && admin.name !== 'Admin') {
                await setDoc(doc(db, ADMIN_COLLECTION, 'profile'), admin);
                console.log('Migrated admin profile');
                hasData = true;
            }
        }

        // Mark migration as complete
        localStorage.setItem('avtorim_migrated_to_firebase', 'true');

        if (hasData) {
            console.log('Migration completed successfully!');
        } else {
            console.log('No data to migrate - starting fresh!');
        }
    } catch (error) {
        console.error('Migration error:', error);
        // Don't throw - allow app to continue even if migration fails
    }
};

// ==================== GEOLOCATION ====================

export interface LocationUpdate {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
    heading: number;
    speed: number;
}

export const updateDriverLocation = async (driverId: string, location: LocationUpdate) => {
    try {
        const driverRef = doc(db, DRIVERS_COLLECTION, driverId);
        await updateDoc(driverRef, {
            location: {
                lat: location.lat,
                lng: location.lng,
                heading: location.heading
            },
            lastLocationUpdate: location.timestamp,
            locationAccuracy: location.accuracy
        });
    } catch (error) {
        console.error('Error updating driver location:', error);
        throw error;
    }
};
