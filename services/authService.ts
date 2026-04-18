import { supabase } from '../supabase';

const SESSION_KEY = 'avtorim_session';
const SESSION_CHECK_INTERVAL = 60000;

export interface AuthUser {
    id: string;
    username: string;
    role: 'admin' | 'super_admin' | 'viewer';
    active: boolean;
    createdAt: number;
    password?: string;
    avatar?: string;
}

export interface AuthSession {
    user: AuthUser;
    timestamp: number;
    expiresAt: number;
}

class AuthService {
    private sessionCheckInterval: NodeJS.Timeout | null = null;
    private sessionInvalidatedCallbacks: Array<(reason: string) => void> = [];

    async authenticateAdmin(password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const result = await response.json();

            if (!result.success) {
                return { success: false, error: result.error || 'Invalid password' };
            }

            const user: AuthUser = {
                id: result.user.id,
                username: result.user.username,
                role: result.user.role || 'admin',
                active: result.user.active,
                createdAt: Date.now(),
                avatar: result.user.avatar
            };

            this.createSession(user);
            return { success: true, user };
        } catch (_err) {
            // Fallback: direct Supabase query (legacy plain-text password support)
            try {
                const { data, error } = await supabase
                    .from('admin_users')
                    .select('*')
                    .eq('password', password)
                    .eq('active', true)
                    .limit(1)
                    .single();

                if (error || !data) {
                    return { success: false, error: 'Invalid password' };
                }

                const user: AuthUser = {
                    id: data.id,
                    username: data.username,
                    role: data.role || 'admin',
                    active: data.active,
                    createdAt: data.created_at,
                    password: data.password,
                    avatar: data.avatar
                };

                this.createSession(user);
                return { success: true, user };
            } catch (fallbackError) {
                console.error('Fallback auth error:', fallbackError);
            }

            return { success: false, error: 'Authentication system error. Please try again.' };
        }
    }

    async authenticateViewer(password: string): Promise<{ success: boolean; user?: any; error?: string }> {
        const { data, error } = await supabase
            .from('viewers')
            .select('*')
            .eq('password', password)
            .limit(1)
            .single();

        if (error || !data) {
            await this.logAuthAttempt('unknown', false, 'Invalid credentials', 'viewer');
            return { success: false, error: 'Invalid password' };
        }

        if (!data.active) {
            await this.logAuthAttempt(data.name || 'unknown', false, 'Account disabled', 'viewer');
            return { success: false, error: 'Account is disabled. Contact administrator.' };
        }

        await this.logAuthAttempt(data.name || data.id, true, 'Login successful', 'viewer');
        return { success: true, user: data };
    }

    private async logAuthAttempt(username: string, success: boolean, reason: string, userType: 'admin' | 'viewer'): Promise<void> {
        try {
            await supabase.from('audit_logs').insert({
                action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
                target_name: username,
                details: { user_type: userType, reason, ip_address: 'client-browser' },
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to log auth attempt:', error);
        }
    }

    private createSession(user: AuthUser): void {
        const session: AuthSession = {
            user,
            timestamp: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000)
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        this.startSessionCheck();
    }

    getSession(): AuthSession | null {
        try {
            const sessionData = sessionStorage.getItem(SESSION_KEY);
            if (!sessionData) return null;
            const session: AuthSession = JSON.parse(sessionData);
            if (Date.now() > session.expiresAt) { this.clearSession(); return null; }
            return session;
        } catch {
            return null;
        }
    }

    async checkSessionValidity(): Promise<boolean> {
        const session = this.getSession();
        if (!session) return false;

        const { data, error } = await supabase
            .from('admin_users')
            .select('active')
            .eq('id', session.user.id)
            .single();

        if (error || !data) { this.invalidateSession('Account no longer exists'); return false; }
        if (!data.active) { this.invalidateSession('Your account has been disabled'); return false; }
        return true;
    }

    private startSessionCheck(): void {
        if (this.sessionCheckInterval) clearInterval(this.sessionCheckInterval);
        this.sessionCheckInterval = setInterval(async () => {
            await this.checkSessionValidity();
        }, SESSION_CHECK_INTERVAL);
    }

    private stopSessionCheck(): void {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
    }

    private invalidateSession(reason: string): void {
        this.clearSession();
        this.sessionInvalidatedCallbacks.forEach(cb => cb(reason));
    }

    clearSession(): void {
        sessionStorage.removeItem(SESSION_KEY);
        this.stopSessionCheck();
    }

    async logout(): Promise<void> {
        const session = this.getSession();
        if (session) await this.logAuthAttempt(session.user.username, true, 'Logout', 'admin');
        this.clearSession();
    }

    onSessionInvalidated(callback: (reason: string) => void): () => void {
        this.sessionInvalidatedCallbacks.push(callback);
        return () => {
            const i = this.sessionInvalidatedCallbacks.indexOf(callback);
            if (i > -1) this.sessionInvalidatedCallbacks.splice(i, 1);
        };
    }
}

export const authService = new AuthService();
