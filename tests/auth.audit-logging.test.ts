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

describe('Authentication - Audit Logging', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    it('should log successful login attempt', async () => {
        const { getDocs, addDoc } = await import('firebase/firestore');

        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'user-id',
                data: () => ({
                    username: 'testuser',
                    password: 'correctpass',
                    active: true,
                    role: 'admin',
                    createdAt: Date.now()
                })
            }]
        } as any);

        vi.mocked(addDoc).mockResolvedValueOnce({ id: 'log-id' } as any);

        await authService.authenticateAdmin('correctpass');

        expect(addDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                action: 'LOGIN_SUCCESS',
                targetName: 'testuser',
                userType: 'admin',
                reason: 'Login successful'
            })
        );
    });

    it('should log failed login with invalid credentials', async () => {
        const { getDocs, addDoc } = await import('firebase/firestore');

        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: true,
            docs: []
        } as any);

        vi.mocked(addDoc).mockResolvedValueOnce({ id: 'log-id' } as any);

        await authService.authenticateAdmin('wrongpass');

        expect(addDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                action: 'LOGIN_FAILED',
                targetName: 'unknown',
                userType: 'admin',
                reason: 'Invalid credentials'
            })
        );
    });

    it('should log failed login for disabled account', async () => {
        const { getDocs, addDoc } = await import('firebase/firestore');

        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'disabled-user',
                data: () => ({
                    username: 'disableduser',
                    password: 'pass',
                    active: false,
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
                action: 'LOGIN_FAILED',
                targetName: 'disableduser',
                reason: 'Account disabled'
            })
        );
    });

    it('should include timestamp in audit log', async () => {
        const { getDocs, addDoc } = await import('firebase/firestore');

        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: true,
            docs: []
        } as any);

        vi.mocked(addDoc).mockResolvedValueOnce({ id: 'log-id' } as any);

        const beforeTime = Date.now();
        await authService.authenticateAdmin('anypass');
        const afterTime = Date.now();

        expect(addDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                timestamp: expect.any(Number)
            })
        );

        const callArgs = vi.mocked(addDoc).mock.calls[0][1] as any;
        expect(callArgs.timestamp).toBeGreaterThanOrEqual(beforeTime);
        expect(callArgs.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should log viewer authentication attempts', async () => {
        const { getDocs, addDoc } = await import('firebase/firestore');

        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'viewer-id',
                data: () => ({
                    name: 'Test Viewer',
                    password: 'viewerpass',
                    active: true
                })
            }]
        } as any);

        vi.mocked(addDoc).mockResolvedValueOnce({ id: 'log-id' } as any);

        await authService.authenticateViewer('viewerpass');

        expect(addDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                action: 'LOGIN_SUCCESS',
                userType: 'viewer',
                targetName: 'Test Viewer'
            })
        );
    });

    it('should log logout events', async () => {
        const { getDocs, addDoc } = await import('firebase/firestore');

        // Create session first
        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'user-id',
                data: () => ({
                    username: 'testuser',
                    password: 'pass',
                    active: true,
                    role: 'admin',
                    createdAt: Date.now()
                })
            }]
        } as any);

        await authService.authenticateAdmin('pass');

        vi.mocked(addDoc).mockResolvedValueOnce({ id: 'logout-log' } as any);

        await authService.logout();

        expect(addDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                action: 'LOGIN_SUCCESS', // Last call was for logout
                targetName: 'testuser',
                reason: 'Logout'
            })
        );
    });
});
