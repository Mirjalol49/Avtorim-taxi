import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authService } from '../services/authService';

vi.mock('../supabase', () => ({
    supabase: { from: vi.fn() },
    default: { from: vi.fn() }
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Authentication - Disabled Account Prevention', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        authService.clearSession();
    });

    it('should prevent login with disabled admin account', async () => {
        mockFetch.mockResolvedValueOnce({
            json: async () => ({ success: false, error: 'Account is disabled. Contact administrator.' })
        } as any);

        const result = await authService.authenticateAdmin('testpassword');

        expect(result.success).toBe(false);
        expect(result.error).toContain('disabled');
        expect(result.user).toBeUndefined();
    });

    it('should show specific error message for disabled accounts', async () => {
        mockFetch.mockResolvedValueOnce({
            json: async () => ({ success: false, error: 'Account is disabled. Contact administrator.' })
        } as any);

        const result = await authService.authenticateAdmin('testpass');
        expect(result.error).toBe('Account is disabled. Contact administrator.');
    });

    it('should not create session for disabled account', async () => {
        mockFetch.mockResolvedValueOnce({
            json: async () => ({ success: false, error: 'Account is disabled. Contact administrator.' })
        } as any);

        await authService.authenticateAdmin('pass');
        expect(authService.getSession()).toBeNull();
    });

    it('should handle server returning active=false in user data', async () => {
        // Server should reject before this point, but if a disabled user somehow
        // reaches the response, the session should not be trusted on next validity check.
        mockFetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                user: { id: 'user-123', username: 'testuser', role: 'admin', active: true, avatar: null }
            })
        } as any);

        await authService.authenticateAdmin('pass');
        expect(authService.getSession()).not.toBeNull();

        const { supabase } = await import('../supabase');
        vi.mocked(supabase.from).mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { active: false }, error: null })
                })
            })
        } as any);

        const isValid = await authService.checkSessionValidity();
        expect(isValid).toBe(false);
    });
});
