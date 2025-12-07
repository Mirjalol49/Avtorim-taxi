/**
 * ADMIN ACCOUNTS DIAGNOSTIC SCRIPT
 * 
 * Run this in your browser console to check all admin accounts
 * 
 * HOW TO USE:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Press Enter
 * 4. Review the account list
 */

import { db } from './firebase';
import { collection, getDocs, query } from 'firebase/firestore';

(async () => {
    console.log('🔍 CHECKING ADMIN ACCOUNTS...\n');
    console.log('='.repeat(60));

    try {
        const adminUsersRef = collection(db, 'admin_users');
        const snapshot = await getDocs(adminUsersRef);

        if (snapshot.empty) {
            console.log('❌ NO ADMIN ACCOUNTS FOUND IN DATABASE!');
            console.log('\n⚠️  CRITICAL: Database is empty!');
            console.log('To fix: Run localStorage.removeItem("avtorim_seed_completed")');
            console.log('Then refresh page to recreate seed accounts');
            return;
        }

        console.log(`✅ Found ${snapshot.size} admin account(s)\n`);

        snapshot.forEach((doc, index) => {
            const data = doc.data();
            console.log(`Account ${index + 1}:`);
            console.log(`  ID: ${doc.id}`);
            console.log(`  Username: ${data.username}`);
            console.log(`  Password: ${data.password}`);
            console.log(`  Role: ${data.role}`);
            console.log(`  Active: ${data.active ? '✅ YES' : '❌ NO (DISABLED)'}`);
            console.log(`  Created: ${new Date(data.createdAt).toLocaleString()}`);
            console.log(`  Created By: ${data.createdBy}`);
            console.log('-'.repeat(60));
        });

        // Check for active accounts
        const activeAccounts = snapshot.docs.filter(doc => doc.data().active === true);
        console.log(`\n📊 SUMMARY:`);
        console.log(`  Total Accounts: ${snapshot.size}`);
        console.log(`  Active: ${activeAccounts.length}`);
        console.log(`  Disabled: ${snapshot.size - activeAccounts.length}`);

        if (activeAccounts.length === 0) {
            console.log('\n⚠️  WARNING: NO ACTIVE ACCOUNTS!');
            console.log('All accounts are disabled. You need to:');
            console.log('1. Use emergency recovery, OR');
            console.log('2. Reset seed: localStorage.removeItem("avtorim_seed_completed")');
        } else {
            console.log('\n✅ LOGIN CREDENTIALS:');
            activeAccounts.forEach(doc => {
                const data = doc.data();
                console.log(`  Username: ${data.username}`);
                console.log(`  Password: ${data.password}`);
                console.log(`  Role: ${data.role}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('❌ ERROR checking accounts:', error);
    }

    console.log('='.repeat(60));
})();
