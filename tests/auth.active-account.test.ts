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

describe('Authentication - Active Account Success', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    it('should allow login with active admin account', async () => {
        const { getDocs } = await import('firebase/firestore');
        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'active-user-id',
                data: () => ({
                    username: 'activeuser',
                    password: 'validpassword',
                    role: 'admin',
                    active: true, // Account is active
                    createdAt: Date.now()
                })
            }]
        } as any);

        const result = await authService.authenticateAdmin('validpassword');

        expect(result.success).toBe(true);
        expect(result.user).toBeDefined();
        expect(result.user?.active).toBe(true);
        expect(result.error).toBeUndefined();
    });

    it('should create session for active account', async () => {
        const { getDocs } = await import('firebase/firestore');
        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'active-user',
                data: () => ({
                    username: 'activeuser',
                    password: 'pass',
                    active: true,
                    role: 'admin',
                    createdAt: Date.now()
                })
            }]
        } as any);

        await authService.authenticateAdmin('pass');

        const session = authService.getSession();
        expect(session).not.toBeNull();
        expect(session?.user.username).toBe('activeuser');
    });

    it('should store correct user data in session', async () => {
        const { getDocs } = await import('firebase/firestore');
        const mockUserData = {
            username: 'testadmin',
            password: 'testpass',
            role: 'super_admin',
            active: true,
            createdAt: 1234567890
        };

        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'user-123',
                data: () => mockUserData
            }]
        } as any);

        const result = await authService.authenticateAdmin('testpass');

        expect(result.user).toMatchObject({
            id: 'user-123',
            username: 'testadmin',
            role: 'super_admin',
            active: true
        });
    });

    it('should log successful authentication', async () => {
        const { getDocs, addDoc } = await import('firebase/firestore');

        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'user-id',
                data: () => ({
                    username: 'successuser',
                    password: 'pass',
                    active: true,
                    role: 'admin',
                    createdAt: Date.now()
                })
            }]
        } as any);

        vi.mocked(addDoc).mockResolvedValueOnce({ id: 'log-id' } as any);

        await authService.authenticateAdmin('pass');

        expect(addDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                action: 'LOGIN_SUCCESS',
                targetName: 'successuser',
                reason: 'Login successful'
            })
        );
    });

    it('should reject invalid password', async () => {
        const { getDocs } = await import('firebase/firestore');
        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: true,
            docs: []
        } as any);

        const result = await authService.authenticateAdmin('wrongpassword');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid password');
        expect(result.user).toBeUndefined();
    });
});
