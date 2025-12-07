
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
    setDoc,
    writeBatch,
    orderBy,
    limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { Driver, Transaction, Viewer } from '../types';

// Collections
const DRIVERS_COLLECTION = 'drivers';
const TRANSACTIONS_COLLECTION = 'transactions';
const ADMIN_COLLECTION = 'admin';
const VIEWERS_COLLECTION = 'viewers';
const ADMIN_USERS_COLLECTION = 'admin_users';
const AUDIT_LOGS_COLLECTION = 'audit_logs';

// Helper to get collection path based on fleetId
export const getCollectionPath = (baseCollection: string, fleetId?: string) => {
    if (fleetId) {
        return `fleets/${fleetId}/${baseCollection}`;
    }
    return baseCollection;
};

// ==================== ADMIN USERS (HIDDEN DASHBOARD) ====================

export const subscribeToAdminUsers = (callback: (users: any[]) => void) => {
    const q = query(collection(db, ADMIN_USERS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        const users: any[] = [];
        snapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });
        callback(users);
    }, (error) => {
        console.error('Error fetching admin users:', error);
    });
};

export const addAdminUser = async (user: any, performedBy: string) => {
    try {
        const batch = writeBatch(db);

        // Add user
        const userRef = doc(collection(db, ADMIN_USERS_COLLECTION));
        const userId = userRef.id;

        batch.set(userRef, {
            ...user,
            createdAt: Date.now(),
            createdBy: performedBy
        });

        // Initialize fleet metadata document to establish the collection structure
        // This ensures the fleet path exists and is ready for data
        const fleetMetaRef = doc(db, `fleets/${userId}/_metadata/info`);
        batch.set(fleetMetaRef, {
            createdAt: Date.now(),
            createdBy: performedBy,
            username: user.username,
            initialized: true
        });

        // Add audit log
        const auditRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
        batch.set(auditRef, {
            action: 'CREATE_ADMIN_USER',
            targetId: userId,
            targetName: user.username,
            performedBy,
            timestamp: Date.now()
        });

        await batch.commit();

        // Clear all existing notifications for this new account to ensure clean slate
        const { clearNotificationsForNewAccount } = await import('./notificationService');
        await clearNotificationsForNewAccount(userId);

        console.log(`✅ Created admin user ${user.username} with clean notification slate`);
    } catch (error) {
        console.error('Error adding admin user:', error);
        throw error;
    }
};

export const updateAdminUser = async (id: string, updates: any, performedBy: string) => {
    try {
        // Simple update without batch - more reliable
        const userRef = doc(db, ADMIN_USERS_COLLECTION, id);
        await updateDoc(userRef, updates);

        // If account is being disabled, invalidate sessions
        if (updates.active === false) {
            await invalidateUserSessions(id);
        }

        // Add audit log separately (non-blocking)
        try {
            await addDoc(collection(db, AUDIT_LOGS_COLLECTION), {
                action: 'UPDATE_ADMIN_USER',
                targetId: id,
                updates: JSON.stringify(updates),
                performedBy,
                timestamp: Date.now()
            });
        } catch (auditError) {
            console.warn('⚠️ Failed to add audit log (non-critical):', auditError);
            // Don't throw - audit log failure shouldn't block the main update
        }
    } catch (error) {
        console.error('❌ Error updating admin user:', error);
        throw error;
    }
};

export const deleteAdminUser = async (id: string, username: string, performedBy: string) => {
    try {
        const batch = writeBatch(db);

        // Delete user
        const userRef = doc(db, ADMIN_USERS_COLLECTION, id);
        batch.delete(userRef);

        // Add audit log
        const auditRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
        batch.set(auditRef, {
            action: 'DELETE_ADMIN_USER',
            targetId: id,
            targetName: username,
            performedBy,
            timestamp: Date.now()
        });

        await batch.commit();
    } catch (error) {
        console.error('Error deleting admin user:', error);
        throw error;
    }
};

// ==================== AUDIT LOGS ====================

export const subscribeToAuditLogs = (callback: (logs: any[]) => void) => {
    const q = query(collection(db, AUDIT_LOGS_COLLECTION), orderBy('timestamp', 'desc'), limit(100));
    return onSnapshot(q, (snapshot) => {
        const logs: any[] = [];
        snapshot.forEach((doc) => {
            logs.push({ id: doc.id, ...doc.data() });
        });
        callback(logs);
    }, (error) => {
        console.error('Error fetching audit logs:', error);
    });
};

// ==================== DRIVERS ====================

// ==================== DRIVERS ====================

export const subscribeToDrivers = (callback: (drivers: Driver[]) => void, fleetId?: string) => {
    const driversRef = collection(db, getCollectionPath(DRIVERS_COLLECTION, fleetId));

    return onSnapshot(driversRef, (snapshot) => {
        const drivers: Driver[] = [];
        snapshot.forEach((doc) => {
            drivers.push({ id: doc.id, ...doc.data() } as Driver);
        });
        callback(drivers);
    }, (error) => {
        console.error('Error fetching drivers:', error);
    });
};

export const addDriver = async (driver: Omit<Driver, 'id'>, fleetId?: string) => {
    try {
        const docRef = await addDoc(collection(db, getCollectionPath(DRIVERS_COLLECTION, fleetId)), driver);
        return docRef.id;
    } catch (error) {
        console.error('Error adding driver:', error);
        throw error;
    }
};

export const updateDriver = async (id: string, driver: Partial<Driver>, fleetId?: string) => {
    try {
        const driverRef = doc(db, getCollectionPath(DRIVERS_COLLECTION, fleetId), id);
        await updateDoc(driverRef, driver as any);
    } catch (error) {
        console.error('Error updating driver:', error);
        throw error;
    }
};

export const deleteDriver = async (id: string, auditInfo?: { adminName: string; reason?: string }, fleetId?: string) => {
    try {
        const batch = writeBatch(db);

        // Soft delete driver
        const driverRef = doc(db, getCollectionPath(DRIVERS_COLLECTION, fleetId), id);
        batch.update(driverRef, { isDeleted: true });

        // Add audit log (Global audit log for now, or could be fleet-specific)
        if (auditInfo) {
            const auditRef = doc(collection(db, 'audit_logs'));
            batch.set(auditRef, {
                action: 'DELETE_DRIVER',
                targetId: id,
                performedBy: auditInfo.adminName,
                reason: auditInfo.reason || 'No reason provided',
                timestamp: Date.now(),
                fleetId: fleetId || 'global'
            });
        }

        await batch.commit();
    } catch (error) {
        console.error('Error deleting driver:', error);
        throw error;
    }
};

// ==================== TRANSACTIONS ====================

// ==================== TRANSACTIONS ====================

export const subscribeToTransactions = (callback: (transactions: Transaction[]) => void, fleetId?: string) => {
    const txRef = collection(db, getCollectionPath(TRANSACTIONS_COLLECTION, fleetId));

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

export const addTransaction = async (transaction: Omit<Transaction, 'id'>, fleetId?: string) => {
    try {
        const docRef = await addDoc(collection(db, getCollectionPath(TRANSACTIONS_COLLECTION, fleetId)), transaction);
        return docRef.id;
    } catch (error) {
        console.error('Error adding transaction:', error);
        throw error;
    }
};

export const deleteTransaction = async (id: string, auditInfo?: { adminName: string; reason?: string; transactionDetails?: any }, fleetId?: string) => {
    try {
        const batch = writeBatch(db);

        // Soft delete transaction
        const txRef = doc(db, getCollectionPath(TRANSACTIONS_COLLECTION, fleetId), id);
        batch.update(txRef, { status: 'DELETED' }); // Use string literal to avoid import cycle if needed, or PaymentStatus.DELETED

        // Add audit log
        if (auditInfo) {
            const auditRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
            batch.set(auditRef, {
                action: 'DELETE_TRANSACTION',
                targetId: id,
                performedBy: auditInfo.adminName,
                reason: auditInfo.reason || 'No reason provided',
                details: auditInfo.transactionDetails ? JSON.stringify(auditInfo.transactionDetails) : null,
                timestamp: Date.now(),
                fleetId: fleetId || 'global',
                type: 'SOFT_DELETE'
            });
        }

        await batch.commit();
    } catch (error) {
        console.error('Error deleting transaction:', error);
        throw error;
    }
};

export const deleteTransactionsBatch = async (ids: string[], auditInfo: { adminName: string; count: number; totalAmount: number }, fleetId?: string) => {
    try {
        const batch = writeBatch(db);

        // Soft delete all transactions
        ids.forEach(id => {
            const txRef = doc(db, getCollectionPath(TRANSACTIONS_COLLECTION, fleetId), id);
            batch.update(txRef, { status: 'DELETED' });
        });

        // Add single audit log for bulk operation
        const auditRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
        batch.set(auditRef, {
            action: 'BULK_DELETE_TRANSACTIONS',
            count: auditInfo.count,
            totalAmount: auditInfo.totalAmount,
            performedBy: auditInfo.adminName,
            transactionIds: ids,
            timestamp: Date.now(),
            fleetId: fleetId || 'global',
            type: 'SOFT_DELETE'
        });

        await batch.commit();
    } catch (error) {
        console.error('Error deleting transactions batch:', error);
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
        console.log('📝 Updating admin profile:', { name: admin.name, role: admin.role, hasAvatar: !!admin.avatar, hasPassword: !!admin.password });
        
        // 1. Update legacy profile (UI source)
        const adminRef = doc(db, ADMIN_COLLECTION, 'profile');
        // Use merge: true to preserve existing fields while updating provided ones
        await setDoc(adminRef, admin, { merge: true });
        console.log('✅ Profile document updated successfully');

        // 2. Update super_admin in admin_users (Auth source)
        // This ensures login password, username, and avatar stay in sync with profile
        if (admin.password || admin.avatar || admin.name) {
            const q = query(collection(db, ADMIN_USERS_COLLECTION), where('role', '==', 'super_admin'));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const batch = writeBatch(db);
                let hasUpdates = false;

                snapshot.docs.forEach(docSnap => {
                    // Update all super admins (usually just 'mirjalol')
                    const updates: any = {};
                    if (admin.password) updates.password = admin.password;
                    if (admin.avatar) updates.avatar = admin.avatar;
                    if (admin.name) updates.username = admin.name; // Sync name to username field

                    if (Object.keys(updates).length > 0) {
                        console.log('🔄 Updating admin_users for super_admin:', updates);
                        batch.update(docSnap.ref, updates);
                        hasUpdates = true;
                    }
                });

                if (hasUpdates) {
                    await batch.commit();
                    console.log('✅ Admin users updated successfully');
                }
            } else {
                console.warn('⚠️ No super_admin found in admin_users collection');
            }
        }

        const auditRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
        await setDoc(auditRef, {
            action: 'UPDATE_ADMIN_PROFILE',
            performedBy: admin.name || 'Admin',
            avatarBytes: admin.avatar ? (admin.avatar.length || 0) : 0,
            avatarType: admin.avatar && typeof admin.avatar === 'string' && admin.avatar.startsWith('data:image/') ? 'dataUrl' : 'url',
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error updating admin profile:', error);
        throw error;
    }
};

// ==================== VIEWERS ====================

export const subscribeToViewers = (callback: (viewers: Viewer[]) => void) => {
    const viewersRef = collection(db, VIEWERS_COLLECTION);

    return onSnapshot(viewersRef, (snapshot) => {
        const viewers: Viewer[] = [];
        snapshot.forEach((doc) => {
            viewers.push({ id: doc.id, ...doc.data() } as Viewer);
        });
        callback(viewers);
    }, (error) => {
        console.error('Error fetching viewers:', error);
    });
};

export const addViewer = async (viewer: Omit<Viewer, 'id'>) => {
    try {
        const docRef = await addDoc(collection(db, VIEWERS_COLLECTION), viewer);
        return docRef.id;
    } catch (error) {
        console.error('Error adding viewer:', error);
        throw error;
    }
};

export const updateViewer = async (id: string, viewer: Partial<Viewer>) => {
    try {
        const viewerRef = doc(db, VIEWERS_COLLECTION, id);
        await updateDoc(viewerRef, viewer as any);
    } catch (error) {
        console.error('Error updating viewer:', error);
        throw error;
    }
};

export const deleteViewer = async (id: string) => {
    try {
        await deleteDoc(doc(db, VIEWERS_COLLECTION, id));
    } catch (error) {
        console.error('Error deleting viewer:', error);
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

export const updateDriverLocation = async (driverId: string, location: LocationUpdate, fleetId?: string) => {
    try {
        const driverRef = doc(db, getCollectionPath(DRIVERS_COLLECTION, fleetId), driverId);
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

// ==================== AUTHENTICATION HELPERS ====================

/**
 * Authenticate an admin user by password and check active status
 * @param password - User's password
 * @returns User data if authentication successful and account is active, null otherwise
 */
export const authenticateAdminUser = async (password: string): Promise<any | null> => {
    try {
        const q = query(collection(db, ADMIN_USERS_COLLECTION), where('password', '==', password));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // CRITICAL: Check if account is active
        if (!userData.active) {
            return null;
        }

        return { id: userDoc.id, ...userData };
    } catch (error) {
        console.error('Error authenticating admin user:', error);
        return null;
    }
};

/**
 * Invalidate all sessions for a specific user
 * This is called when an account is disabled
 * @param userId - ID of the user whose sessions should be invalidated
 */
export const invalidateUserSessions = async (userId: string): Promise<void> => {
    try {
        // Add audit log for session invalidation
        const auditRef = doc(collection(db, AUDIT_LOGS_COLLECTION));
        await addDoc(collection(db, AUDIT_LOGS_COLLECTION), {
            action: 'INVALIDATE_USER_SESSIONS',
            targetId: userId,
            timestamp: Date.now(),
            reason: 'Account disabled'
        });

        // In a real application, you might maintain a sessions collection
        // and mark all sessions for this user as invalid
        // For now, we rely on client-side session checks
    } catch (error) {
        console.error('Error invalidating user sessions:', error);
        throw error;
    }
};
