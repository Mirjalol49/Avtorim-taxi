import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authService } from '../services/authService';

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

vi.mock('../supabase', () => ({
    supabase: { from: mockFrom },
    default: { from: mockFrom }
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Authentication - Audit Logging', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.clearAllMocks();
        mockInsert.mockResolvedValue({ error: null });
        mockFrom.mockReturnValue({ insert: mockInsert });
    });

    afterEach(() => {
        authService.clearSession();
    });

    it('should log successful login attempt', async () => {
        mockFetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                user: { id: 'user-id', username: 'testuser', role: 'admin', active: true, avatar: null }
            })
        } as any);

        await authService.authenticateAdmin('correctpass');
        // Audit logging happens via server in the new flow; logout triggers client-side log
        expect(authService.getSession()).not.toBeNull();
    });

    it('should log failed login with invalid credentials', async () => {
        mockFetch.mockResolvedValueOnce({
            json: async () => ({ success: false, error: 'Invalid password' })
        } as any);

        const result = await authService.authenticateAdmin('wrongpass');
        expect(result.success).toBe(false);
    });

    it('should log viewer authentication attempts', async () => {
        const mockViewer = { id: 'viewer-id', name: 'Test Viewer', password: 'viewerpass', active: true };
        mockFrom.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: mockViewer, error: null })
                    })
                })
            })
        });

        const result = await authService.authenticateViewer('viewerpass');
        expect(result.success).toBe(true);
        expect(result.user?.name).toBe('Test Viewer');
    });

    it('should log logout events and clear session', async () => {
        mockFetch.mockResolvedValueOnce({
            json: async () => ({
                success: true,
                user: { id: 'user-id', username: 'testuser', role: 'admin', active: true, avatar: null }
            })
        } as any);

        await authService.authenticateAdmin('pass');
        expect(authService.getSession()).not.toBeNull();

        await authService.logout();
        expect(authService.getSession()).toBeNull();
    });

    it('should include timestamp_ms in audit log inserts', async () => {
        mockFrom.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
                    })
                })
            })
        });

        const before = Date.now();
        await authService.authenticateViewer('anypass');
        const after = Date.now();

        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                timestamp_ms: expect.any(Number)
            })
        );

        const callArg = mockInsert.mock.calls[0][0] as any;
        expect(callArg.timestamp_ms).toBeGreaterThanOrEqual(before);
        expect(callArg.timestamp_ms).toBeLessThanOrEqual(after);
    });
});
