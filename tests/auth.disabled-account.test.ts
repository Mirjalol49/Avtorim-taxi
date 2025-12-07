import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../services/authService';

// Mock Firebase
vi.mock('../firebase', () => ({
    db: {}
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(() => ({ type: 'collection', path: 'audit_logs' })),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(),
    addDoc: vi.fn(),
    onSnapshot: vi.fn(),
    doc: vi.fn()
}));

describe('Authentication - Disabled Account Prevention', () => {
    beforeEach(() => {
        // Clear session storage before each test
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    it('should prevent login with disabled admin account', async () => {
        // Mock Firestore to return a disabled account
        const { getDocs } = await import('firebase/firestore');
        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'test-user-id',
                data: () => ({
                    username: '+998937489141',
                    password: 'testpassword',
                    role: 'admin',
                    active: false, // Account is disabled
                    createdAt: Date.now()
                })
            }]
        } as any);

        const result = await authService.authenticateAdmin('testpassword');

        expect(result.success).toBe(false);
        expect(result.error).toContain('disabled');
        expect(result.user).toBeUndefined();
    });

    it('should show specific error message for disabled accounts', async () => {
        const { getDocs } = await import('firebase/firestore');
        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'test-user-id',
                data: () => ({
                    username: 'testuser',
                    password: 'testpass',
                    role: 'admin',
                    active: false,
                    createdAt: Date.now()
                })
            }]
        } as any);

        const result = await authService.authenticateAdmin('testpass');

        expect(result.error).toBe('Account is disabled. Contact administrator.');
    });

    it('should not create session for disabled account', async () => {
        const { getDocs } = await import('firebase/firestore');
        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'disabled-user',
                data: () => ({
                    username: 'disabled',
                    password: 'pass',
                    active: false,
                    role: 'admin',
                    createdAt: Date.now()
                })
            }]
        } as any);

        await authService.authenticateAdmin('pass');

        const session = authService.getSession();
        expect(session).toBeNull();
    });

    it('should log failed attempt for disabled account', async () => {
        const { getDocs, addDoc } = await import('firebase/firestore');

        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'disabled-user',
                data: () => ({
                    username: 'testuser',
                    password: 'testpass',
                    active: false,
                    role: 'admin',
                    createdAt: Date.now()
                })
            }]
        } as any);

        vi.mocked(addDoc).mockResolvedValueOnce({ id: 'log-id' } as any);

        await authService.authenticateAdmin('testpass');

        expect(addDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                action: 'LOGIN_FAILED',
                targetName: 'testuser',
                reason: 'Account disabled'
            })
        );
    });
});
