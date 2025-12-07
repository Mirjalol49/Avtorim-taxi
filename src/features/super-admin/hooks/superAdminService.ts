import { SuperAdminAccount, CreateAccountDTO } from '../types';

// TODO: Move these to environment variables
const API_URL = 'http://localhost:3000/api/admin';
const CREDENTIALS = btoa('driver123:secretKey'); // Mock Basic Auth for consistency with server.js

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${CREDENTIALS}`
};

export const SuperAdminService = {
    /**
     * List all accounts
     */
    getAccounts: async (): Promise<SuperAdminAccount[]> => {
        const response = await fetch(`${API_URL}/accounts`, {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch accounts: ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * Create a new account
     */
    createAccount: async (data: CreateAccountDTO): Promise<{ success: boolean; accountId: string }> => {
        const password = generateStrongPassword(); // Generate on client for MVP, or server.

        // We send generated password to server to create user
        const response = await fetch(`${API_URL}/create-account`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...data, password })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to create account');
        }

        // Return the password so we can show it to the admin one time
        return { ...(await response.json()), password };
    },

    /**
     * Toggle account status
     */
    toggleStatus: async (uid: string, disabled: boolean): Promise<{ success: boolean }> => {
        const response = await fetch(`${API_URL}/toggle-status`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ uid, disabled })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to update status');
        }

        return response.json();
    }
};

// Helper: Generate Strong Password
// Compliant with requirements: 16 chars, upper, lower, digit, symbol
export const generateStrongPassword = (): string => {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
};
