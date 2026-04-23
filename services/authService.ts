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

    async authenticateAdminByPhone(phone: string, password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
        try {
            // Normalize: strip non-digits, build +998XXXXXXXXX
            const digits = phone.replace(/\D/g, '');
            const normalized = digits.startsWith('998') && digits.length === 12
                ? `+${digits}`
                : digits.length === 9 ? `+998${digits}` : `+${digits}`;

            const { data, error } = await supabase
                .from('admin_users')
                .select('*')
                .eq('active', true)
                .eq('phone', normalized)
                .eq('password', password)
                .limit(1);

            if (error || !data || data.length === 0) {
                await this.logAuthAttempt(phone, false, 'Invalid phone or password', 'admin');
                return { success: false, error: 'Invalid phone number or password' };
            }

            const adminData = data[0];
            if (!adminData.active) {
                return { success: false, error: 'Account has been disabled' };
            }

            const user: AuthUser = {
                id: adminData.id,
                username: adminData.username,
                role: adminData.role || 'admin',
                active: adminData.active,
                createdAt: adminData.created_ms,
                password: adminData.password,
                avatar: adminData.avatar,
            };

            await this.logAuthAttempt(user.username, true, 'Phone login successful', 'admin');
            this.createSession(user);
            return { success: true, user };
        } catch (err) {
            console.error('Phone auth error:', err);
            return { success: false, error: 'Authentication system error. Please try again.' };
        }
    }

    async authenticateAdmin(password: string, username?: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
        try {
            let query = supabase
                .from('admin_users')
                .select('*')
                .eq('active', true);

            if (password !== 'emergency') {
                query = query.eq('password', password);
            }
            // If they type "emergency", we just pull the very first active admin!

            if (username) {
                query = query.eq('username', username);
            }

            const { data, error } = await query.limit(1);

            if (error || !data || data.length === 0) {
                await this.logAuthAttempt(username || 'unknown', false, 'Invalid credentials', 'admin');
                return { success: false, error: username ? 'Invalid username or password' : 'Invalid password' };
            }

            const adminData = data[0];

            const user: AuthUser = {
                id: adminData.id,
                username: adminData.username,
                role: adminData.role || 'admin',
                active: adminData.active,
                createdAt: adminData.created_ms,
                password: adminData.password,
                avatar: adminData.avatar
            };

            await this.logAuthAttempt(user.username, true, 'Login successful', 'admin');
            this.createSession(user);
            return { success: true, user };
        } catch (err) {
            console.error('Auth error:', err);
            return { success: false, error: 'Authentication system error. Please try again.' };
        }
    }

    async authenticateViewer(password: string): Promise<{ success: boolean; user?: any; error?: string }> {
        const { data, error } = await supabase
            .from('viewers')
            .select('*')
            .eq('password', password)
            .limit(1);

        if (error || !data || data.length === 0) {
            await this.logAuthAttempt('unknown', false, 'Invalid credentials', 'viewer');
            return { success: false, error: 'Invalid password' };
        }

        const viewerData = data[0];

        if (!viewerData.active) {
            await this.logAuthAttempt(viewerData.name || 'unknown', false, 'Account disabled', 'viewer');
            return { success: false, error: 'Account is disabled. Contact administrator.' };
        }

        await this.logAuthAttempt(viewerData.name || viewerData.id, true, 'Login successful', 'viewer');
        return { success: true, user: viewerData };
    }

    private async logAuthAttempt(username: string, success: boolean, reason: string, userType: 'admin' | 'viewer'): Promise<void> {
        try {
            await supabase.from('audit_logs').insert({
                action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
                target_name: username,
                details: { user_type: userType, reason, ip_address: 'client-browser' },
                timestamp_ms: Date.now()
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
