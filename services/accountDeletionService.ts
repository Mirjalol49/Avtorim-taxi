import { db } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';

/**
 * Comprehensive Account Deletion Service
 * Handles permanent deletion of admin accounts with cascading deletion
 * of all associated data to maintain database integrity
 */

export interface DeletionResult {
    success: boolean;
    message: string;
    deletedItems: {
        adminUser?: boolean;
        fleetMetadata?: boolean;
        auditLogs?: number;
        transactions?: number;
        drivers?: number;
        salaries?: number;
        viewers?: number;
    };
}

/**
 * Permanently delete an admin account and all associated data
 * @param username - Username of the account to delete
 * @param password - Password for verification
 * @param performedBy - Username of person performing deletion
 * @returns DeletionResult with details of what was deleted
 */
export const permanentlyDeleteAdminAccount = async (
    username: string,
    password: string,
    performedBy: string
): Promise<DeletionResult> => {
    try {
        const result: DeletionResult = {
            success: false,
            message: '',
            deletedItems: {}
        };

        // Step 1: Verify account exists and validate credentials
        console.log(`🔍 Step 1: Verifying account "${username}" exists...`);

        const adminUsersRef = collection(db, 'admin_users');
        const accountQuery = query(
            adminUsersRef,
            where('username', '==', username),
            where('password', '==', password)
        );

        const accountSnapshot = await getDocs(accountQuery);

        if (accountSnapshot.empty) {
            return {
                success: false,
                message: `Account "${username}" not found or password incorrect`,
                deletedItems: {}
            };
        }

        const accountDoc = accountSnapshot.docs[0];
        const accountData = accountDoc.data();
        const accountId = accountDoc.id;

        console.log(`✅ Account found: ${accountId}`);
        console.log(`   Role: ${accountData.role}`);
        console.log(`   Active: ${accountData.active}`);

        // Step 2: Delete fleet-specific data (if account has a fleet)
        console.log(`\n🗑️  Step 2: Deleting fleet-specific data for account ${accountId}...`);

        const fleetPath = `fleets/${accountId}`;

        // Delete drivers
        const driversQuery = query(collection(db, `${fleetPath}/drivers`));
        const driversSnapshot = await getDocs(driversQuery);
        let driversDeleted = 0;

        for (const driverDoc of driversSnapshot.docs) {
            await deleteDoc(driverDoc.ref);
            driversDeleted++;
        }

        if (driversDeleted > 0) {
            result.deletedItems.drivers = driversDeleted;
            console.log(`   ✓ Deleted ${driversDeleted} drivers`);
        }

        // Delete transactions
        const transactionsQuery = query(collection(db, `${fleetPath}/transactions`));
        const transactionsSnapshot = await getDocs(transactionsQuery);
        let transactionsDeleted = 0;

        for (const txDoc of transactionsSnapshot.docs) {
            await deleteDoc(txDoc.ref);
            transactionsDeleted++;
        }

        if (transactionsDeleted > 0) {
            result.deletedItems.transactions = transactionsDeleted;
            console.log(`   ✓ Deleted ${transactionsDeleted} transactions`);
        }

        // Delete salaries
        const salariesQuery = query(collection(db, `${fleetPath}/salaries`));
        const salariesSnapshot = await getDocs(salariesQuery);
        let salariesDeleted = 0;

        for (const salaryDoc of salariesSnapshot.docs) {
            await deleteDoc(salaryDoc.ref);
            salariesDeleted++;
        }

        if (salariesDeleted > 0) {
            result.deletedItems.salaries = salariesDeleted;
            console.log(`   ✓ Deleted ${salariesDeleted} salary records`);
        }

        // Delete fleet metadata
        const metadataQuery = query(collection(db, `${fleetPath}/_metadata`));
        const metadataSnapshot = await getDocs(metadataQuery);

        for (const metaDoc of metadataSnapshot.docs) {
            await deleteDoc(metaDoc.ref);
        }

        if (!metadataSnapshot.empty) {
            result.deletedItems.fleetMetadata = true;
            console.log(`   ✓ Deleted fleet metadata`);
        }

        // Step 3: Delete audit logs referencing this account
        console.log(`\n🗑️  Step 3: Deleting audit logs...`);

        // Delete logs where this account was the performer
        const performerLogsQuery = query(
            collection(db, 'audit_logs'),
            where('performedBy', '==', username)
        );
        const performerLogsSnapshot = await getDocs(performerLogsQuery);

        // Delete logs where this account was the target
        const targetLogsQuery = query(
            collection(db, 'audit_logs'),
            where('targetName', '==', username)
        );
        const targetLogsSnapshot = await getDocs(targetLogsQuery);

        // Delete logs by targetId
        const targetIdLogsQuery = query(
            collection(db, 'audit_logs'),
            where('targetId', '==', accountId)
        );
        const targetIdLogsSnapshot = await getDocs(targetIdLogsQuery);

        const allLogs = new Set([
            ...performerLogsSnapshot.docs,
            ...targetLogsSnapshot.docs,
            ...targetIdLogsSnapshot.docs
        ]);

        let auditLogsDeleted = 0;
        for (const logDoc of allLogs) {
            await deleteDoc(logDoc.ref);
            auditLogsDeleted++;
        }

        if (auditLogsDeleted > 0) {
            result.deletedItems.auditLogs = auditLogsDeleted;
            console.log(`   ✓ Deleted ${auditLogsDeleted} audit log entries`);
        }

        // Step 4: Delete the admin user account itself
        console.log(`\n🗑️  Step 4: Deleting admin user account...`);

        await deleteDoc(doc(db, 'admin_users', accountId));
        result.deletedItems.adminUser = true;
        console.log(`   ✓ Deleted admin user account`);

        // Step 5: Create final deletion audit log
        console.log(`\n📝 Step 5: Creating deletion audit log...`);

        const batch = writeBatch(db);
        const finalAuditRef = doc(collection(db, 'audit_logs'));
        batch.set(finalAuditRef, {
            action: 'PERMANENT_ACCOUNT_DELETION',
            targetId: accountId,
            targetName: username,
            performedBy,
            timestamp: Date.now(),
            details: JSON.stringify({
                deletedItems: result.deletedItems,
                accountRole: accountData.role,
                accountCreatedAt: accountData.createdAt,
                accountCreatedBy: accountData.createdBy || 'unknown'
            })
        });

        await batch.commit();
        console.log(`   ✓ Deletion audit log created`);

        result.success = true;
        result.message = `Account "${username}" permanently deleted with all associated data`;

        console.log(`\n✅ DELETION COMPLETE`);
        console.log(`   Account: ${username} (${accountId})`);
        console.log(`   Drivers: ${result.deletedItems.drivers || 0}`);
        console.log(`   Transactions: ${result.deletedItems.transactions || 0}`);
        console.log(`   Salaries: ${result.deletedItems.salaries || 0}`);
        console.log(`   Audit Logs: ${result.deletedItems.auditLogs || 0}`);

        return result;

    } catch (error) {
        console.error('❌ Error during account deletion:', error);
        return {
            success: false,
            message: `Deletion failed: ${error}`,
            deletedItems: {}
        };
    }
};

/**
 * Verify account exists without deleting (dry run)
 * @param username - Username to verify
 * @param password - Password for verification
 * @returns Account data if found
 */
export const verifyAccountForDeletion = async (
    username: string,
    password: string
): Promise<{
    found: boolean;
    accountData?: any;
    estimatedDeletions?: {
        drivers: number;
        transactions: number;
        salaries: number;
        auditLogs: number;
    };
}> => {
    try {
        const adminUsersRef = collection(db, 'admin_users');
        const accountQuery = query(
            adminUsersRef,
            where('username', '==', username),
            where('password', '==', password)
        );

        const accountSnapshot = await getDocs(accountQuery);

        if (accountSnapshot.empty) {
            return { found: false };
        }

        const accountDoc = accountSnapshot.docs[0];
        const accountData = accountDoc.data();
        const accountId = accountDoc.id;

        // Count items that would be deleted
        const fleetPath = `fleets/${accountId}`;

        const driversSnapshot = await getDocs(collection(db, `${fleetPath}/drivers`));
        const transactionsSnapshot = await getDocs(collection(db, `${fleetPath}/transactions`));
        const salariesSnapshot = await getDocs(collection(db, `${fleetPath}/salaries`));

        const performerLogsQuery = query(collection(db, 'audit_logs'), where('performedBy', '==', username));
        const targetLogsQuery = query(collection(db, 'audit_logs'), where('targetName', '==', username));
        const performerLogsSnapshot = await getDocs(performerLogsQuery);
        const targetLogsSnapshot = await getDocs(targetLogsQuery);

        return {
            found: true,
            accountData: {
                id: accountId,
                username: accountData.username,
                role: accountData.role,
                active: accountData.active,
                createdAt: accountData.createdAt,
                createdBy: accountData.createdBy
            },
            estimatedDeletions: {
                drivers: driversSnapshot.size,
                transactions: transactionsSnapshot.size,
                salaries: salariesSnapshot.size,
                auditLogs: performerLogsSnapshot.size + targetLogsSnapshot.size
            }
        };

    } catch (error) {
        console.error('Error verifying account:', error);
        return { found: false };
    }
};
