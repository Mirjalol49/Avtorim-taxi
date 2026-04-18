import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { authService } from '../services/authService';

vi.mock('../supabase', () => {
    const mockSelect = vi.fn();
    const mockInsert = vi.fn();
    const mockFrom = vi.fn(() => ({
        select: mockSelect,
        insert: mockInsert
    }));
    return {
        supabase: { from: mockFrom },
        default: { from: mockFrom }
    };
});

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Authentication - Session Invalidation', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        authService.clearSession();
    });

    async function loginUser(active = true) {
        mockFetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                user: { id: 'user-123', username: 'testuser', role: 'admin', active, avatar: null }
            })
        } as any);
        await authService.authenticateAdmin('pass');
    }

    it('should invalidate session when account is disabled', async () => {
        await loginUser(true);
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
        expect(authService.getSession()).toBeNull();
    });

    it('should call invalidation callback when session is invalidated', async () => {
        await loginUser(true);

        const mockCallback = vi.fn();
        authService.onSessionInvalidated(mockCallback);

        const { supabase } = await import('../supabase');
        vi.mocked(supabase.from).mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { active: false }, error: null })
                })
            })
        } as any);

        await authService.checkSessionValidity();
        expect(mockCallback).toHaveBeenCalledWith('Your account has been disabled');
    });

    it('should clear session on logout', async () => {
        await loginUser(true);
        expect(authService.getSession()).not.toBeNull();

        const { supabase } = await import('../supabase');
        vi.mocked(supabase.from).mockReturnValue({
            insert: vi.fn().mockResolvedValue({ error: null })
        } as any);

        await authService.logout();
        expect(authService.getSession()).toBeNull();
    });

    it('should handle account deletion during active session', async () => {
        await loginUser(true);

        const { supabase } = await import('../supabase');
        vi.mocked(supabase.from).mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
                })
            })
        } as any);

        const isValid = await authService.checkSessionValidity();
        expect(isValid).toBe(false);
        expect(authService.getSession()).toBeNull();
    });
});
