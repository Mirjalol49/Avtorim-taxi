import { permanentlyDeleteAdminAccount, verifyAccountForDeletion } from './services/accountDeletionService';

/**
 * DELETE ACCOUNT: mirjalol4941
 * 
 * This script permanently deletes the account with username matching password "mirjalol4941"
 * along with ALL associated data including fleet data, audit logs, and metadata.
 * 
 * Usage:
 * 1. Run this script from the browser console
 * 2. The script will verify the account exists
 * 3. Show what will be deleted
 * 4. Perform the deletion
 * 5. Display results
 */

(async () => {
    console.log('🚀 Starting account deletion process...\n');

    // Since password is "mirjalol4941", we need to find which username has this password
    // Based on seedAdmin.ts, there are two accounts with this password:
    // 1. '+998937489141' (super_admin)
    // 2. 'mirjalol' (super_admin)

    const accountsToCheck = [
        { username: '+998937489141', password: 'mirjalol4941' },
        { username: 'mirjalol', password: 'mirjalol4941' }
    ];

    for (const account of accountsToCheck) {
        console.log(`\n========================================`);
        console.log(`Checking account: ${account.username}`);
        console.log(`========================================\n`);

        // Step 1: Verify account
        console.log('Step 1: Verifying account...');
        const verification = await verifyAccountForDeletion(account.username, account.password);

        if (!verification.found) {
            console.log(`❌ Account "${account.username}" not found or password incorrect\n`);
            continue;
        }

        console.log(`✅ Account found!`);
        console.log(`   Username: ${verification.accountData.username}`);
        console.log(`   Role: ${verification.accountData.role}`);
        console.log(`   Active: ${verification.accountData.active}`);
        console.log(`   Created: ${new Date(verification.accountData.createdAt).toLocaleString()}`);
        console.log(`   Created By: ${verification.accountData.createdBy}\n`);

        console.log(`📊 Items that will be deleted:`);
        console.log(`   Drivers: ${verification.estimatedDeletions.drivers}`);
        console.log(`   Transactions: ${verification.estimatedDeletions.transactions}`);
        console.log(`   Salaries: ${verification.estimatedDeletions.salaries}`);
        console.log(`   Audit Logs: ${verification.estimatedDeletions.auditLogs}\n`);

        // Step 2: Perform deletion
        console.log('Step 2: Performing permanent deletion...\n');

        const result = await permanentlyDeleteAdminAccount(
            account.username,
            account.password,
            'system_delete_script'
        );

        if (result.success) {
            console.log(`\n✅ SUCCESS: ${result.message}\n`);
            console.log(`📋 Deletion Summary:`);
            console.log(`   Admin User: ${result.deletedItems.adminUser ? '✓' : '✗'}`);
            console.log(`   Drivers: ${result.deletedItems.drivers || 0}`);
            console.log(`   Transactions: ${result.deletedItems.transactions || 0}`);
            console.log(`   Salaries: ${result.deletedItems.salaries || 0}`);
            console.log(`   Audit Logs: ${result.deletedItems.auditLogs || 0}`);
            console.log(`   Fleet Metadata: ${result.deletedItems.fleetMetadata ? '✓' : '✗'}\n`);
        } else {
            console.log(`\n❌ FAILED: ${result.message}\n`);
        }
    }

    console.log(`\n========================================`);
    console.log(`Account deletion process complete`);
    console.log(`========================================\n`);
})();
