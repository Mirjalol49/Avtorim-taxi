import { db } from '../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

/**
 * Account Validity Service
 * Monitors logged-in admin accounts and automatically logs out if:
 * - Account is deleted
 * - Account is disabled (active: false)
 * - Account no longer exists in database
 */

export interface AccountValidityResult {
    isValid: boolean;
    reason?: string;
    userData?: any; // Include fresh user data
}

/**
 * Check if an admin account still exists and is active
 */
export const checkAccountValidity = async (accountId: string): Promise<AccountValidityResult> => {
    try {
        const accountRef = doc(db, 'admin_users', accountId);
        const accountSnap = await getDoc(accountRef);

        if (!accountSnap.exists()) {
            return {
                isValid: false,
                reason: 'Account has been deleted'
            };
        }

        const accountData = accountSnap.data();

        if (accountData.active === false) {
            return {
                isValid: false,
                reason: 'Account has been disabled'
            };
        }

        return {
            isValid: true,
            userData: { id: accountSnap.id, ...accountData } // Return fresh data
        };
    } catch (error) {
        console.error('Error checking account validity:', error);
        // Don't invalidate on error - could be network issue
        return { isValid: true };
    }
};

/**
 * Subscribe to real-time account changes
 * Automatically detects when account is deleted or disabled
 */
export const subscribeToAccountValidity = (
    accountId: string,
    onInvalid: (reason: string) => void,
    onUpdate?: (data: any) => void // Optional callback for updates
): (() => void) => {
    const accountRef = doc(db, 'admin_users', accountId);

    const unsubscribe = onSnapshot(
        accountRef,
        (snapshot) => {
            if (!snapshot.exists()) {
                // Account was deleted
                console.warn('⚠️ Account deleted - logging out');
                onInvalid('Your account has been deleted by an administrator');
                return;
            }

            const accountData = snapshot.data();
            if (accountData.active === false) {
                // Account was disabled
                console.warn('⚠️ Account disabled - logging out');
                onInvalid('Your account has been disabled by an administrator');
                return;
            }

            // Account is still valid
            console.log('✅ Account validation passed');

            // If provided, notify about data updates
            if (onUpdate) {
                onUpdate({ id: snapshot.id, ...accountData });
            }
        },
        (error) => {
            console.error('Error in account validity subscription:', error);
        }
    );

    return unsubscribe;
};

/**
 * Validate account on app initialization
 * Returns validation result with user data
 */
export const validateAccountOnInit = async (adminUser: any): Promise<AccountValidityResult> => {
    if (!adminUser || !adminUser.id) {
        return { isValid: false, reason: 'No admin user found' };
    }

    const result = await checkAccountValidity(adminUser.id);

    if (!result.isValid) {
        console.warn(`Account invalid: ${result.reason}`);
        return result;
    }

    return result;
};
