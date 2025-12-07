import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { authService } from '../services/authService';

// Mock Firebase
vi.mock('../firebase', () => ({
    db: {}
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(),
    addDoc: vi.fn(),
    onSnapshot: vi.fn(),
    doc: vi.fn()
}));

describe('Authentication - Session Invalidation', () => {
    let invalidationCallback: ((reason: string) => void) | null = null;

    beforeEach(() => {
        sessionStorage.clear();
        vi.clearAllMocks();
        invalidationCallback = null;
    });

    afterEach(() => {
        if (invalidationCallback) {
            invalidationCallback = null;
        }
    });

    it('should invalidate session when account is disabled', async () => {
        const { getDocs } = await import('firebase/firestore');

        // First, create an active session
        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'user-123',
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
        expect(authService.getSession()).not.toBeNull();

        // Now simulate account being disabled
        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'user-123',
                data: () => ({
                    username: 'testuser',
                    active: false, // Account disabled
                    role: 'admin'
                })
            }]
        } as any);

        const isValid = await authService.checkSessionValidity();

        expect(isValid).toBe(false);
        expect(authService.getSession()).toBeNull();
    });

    it('should call invalidation callback when session is invalidated', async () => {
        const { getDocs } = await import('firebase/firestore');

        // Create active session
        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'user-123',
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

        // Register callback
        const mockCallback = vi.fn();
        authService.onSessionInvalidated(mockCallback);

        // Simulate account disabled
        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'user-123',
                data: () => ({
                    active: false
                })
            }]
        } as any);

        await authService.checkSessionValidity();

        expect(mockCallback).toHaveBeenCalledWith('Your account has been disabled');
    });

    it('should clear session on logout', async () => {
        const { getDocs, addDoc } = await import('firebase/firestore');

        // Create session
        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'user-123',
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
        expect(authService.getSession()).not.toBeNull();

        vi.mocked(addDoc).mockResolvedValueOnce({ id: 'log-id' } as any);

        await authService.logout();

        expect(authService.getSession()).toBeNull();
    });

    it('should handle account deletion during active session', async () => {
        const { getDocs } = await import('firebase/firestore');

        // Create session
        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'user-123',
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

        // Simulate account deleted (user no longer exists)
        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: true,
            docs: []
        } as any);

        const isValid = await authService.checkSessionValidity();

        expect(isValid).toBe(false);
        expect(authService.getSession()).toBeNull();
    });
});
