import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authService } from '../services/authService';

vi.mock('../supabase', () => ({
    supabase: { from: vi.fn() },
    default: { from: vi.fn() }
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Authentication - Active Account Success', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        authService.clearSession();
    });

    function mockLoginSuccess(user = { id: 'active-user-id', username: 'activeuser', role: 'admin', active: true, avatar: null }) {
        mockFetch.mockResolvedValueOnce({
            json: async () => ({ success: true, user })
        } as any);
    }

    it('should allow login with active admin account', async () => {
        mockLoginSuccess();
        const result = await authService.authenticateAdmin('validpassword');

        expect(result.success).toBe(true);
        expect(result.user).toBeDefined();
        expect(result.user?.active).toBe(true);
        expect(result.error).toBeUndefined();
    });

    it('should create session for active account', async () => {
        mockLoginSuccess();
        await authService.authenticateAdmin('pass');

        const session = authService.getSession();
        expect(session).not.toBeNull();
        expect(session?.user.username).toBe('activeuser');
    });

    it('should store correct user data in session', async () => {
        mockFetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                user: { id: 'user-123', username: 'testadmin', role: 'super_admin', active: true, avatar: null }
            })
        } as any);

        const result = await authService.authenticateAdmin('testpass');

        expect(result.user).toMatchObject({
            id: 'user-123',
            username: 'testadmin',
            role: 'super_admin',
            active: true
        });
    });

    it('should reject invalid password', async () => {
        mockFetch.mockResolvedValueOnce({
            json: async () => ({ success: false, error: 'Invalid password' })
        } as any);

        const result = await authService.authenticateAdmin('wrongpassword');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid password');
        expect(result.user).toBeUndefined();
    });
});
