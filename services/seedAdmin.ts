import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

/**
 * SEED ADMIN - DISABLED AUTO-CREATION
 * 
 * This script NO LONGER auto-creates accounts. It only provides
 * emergency recovery if all super_admins are disabled.
 * 
 * Accounts should be created via the Admin Console (/mirjalol49)
 * or the Super Admin Panel (/super-admin).
 */

const seedSuperAdmin = async () => {
    console.log('🔧 Checking admin account status...');

    try {
        const adminUsersRef = collection(db, 'admin_users');
        const superAdminQuery = query(adminUsersRef, where('role', '==', 'super_admin'));
        const snapshot = await getDocs(superAdminQuery);

        if (snapshot.empty) {
            console.log('⚠️ No super_admin accounts exist. Please create via Admin Console.');
            console.log('   Use: node server/remediate-admins.js to create initial account');
            return;
        }

        // Check if ALL super_admin accounts are disabled (emergency lockout scenario)
        const allDisabled = snapshot.docs.every(doc => !doc.data().active);

        if (allDisabled) {
            console.warn('⚠️ EMERGENCY RECOVERY: All super_admin accounts are disabled!');

            // Find the mirjalol account and enable it
            const mirjalolDoc = snapshot.docs.find(doc => doc.data().username === 'mirjalol');

            if (mirjalolDoc) {
                await updateDoc(doc(db, 'admin_users', mirjalolDoc.id), {
                    active: true,
                    recoveredAt: Date.now()
                });
                console.log('✅ RECOVERY: mirjalol account has been automatically re-enabled');
            } else {
                // Enable the first super_admin found
                const firstDoc = snapshot.docs[0];
                await updateDoc(doc(db, 'admin_users', firstDoc.id), {
                    active: true,
                    recoveredAt: Date.now()
                });
                console.log(`✅ RECOVERY: ${firstDoc.data().username} account has been re-enabled`);
            }
        } else {
            const activeCount = snapshot.docs.filter(d => d.data().active).length;
            console.log(`✅ Admin system healthy: ${activeCount} active super_admin account(s)`);
        }
    } catch (error) {
        console.error('Error in admin seed check:', error);
    }
};

export default seedSuperAdmin;
