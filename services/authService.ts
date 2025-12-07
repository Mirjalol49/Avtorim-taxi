import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot, doc } from 'firebase/firestore';

// Session storage keys
const SESSION_KEY = 'avtorim_session';
const SESSION_CHECK_INTERVAL = 60000; // 60 seconds

export interface AuthUser {
    id: string;
    username: string;
    role: 'admin' | 'super_admin' | 'viewer';
    active: boolean;
    createdAt: number;
    password?: string; // Include password for profile display
    avatar?: string;   // Include avatar for profile display
}

export interface AuthSession {
    user: AuthUser;
    timestamp: number;
    expiresAt: number;
}

/**
 * Centralized authentication service with proper security checks
 */
class AuthService {
    private sessionCheckInterval: NodeJS.Timeout | null = null;
    private sessionInvalidatedCallbacks: Array<(reason: string) => void> = [];

    /**
     * Authenticate an admin user by password
     * Uses server-side bcrypt verification for security
     */
    async authenticateAdmin(password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
        try {
            // Call server login API for bcrypt verification
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const result = await response.json();

            if (!result.success) {
                return { success: false, error: result.error || 'Invalid password' };
            }

            // Successful authentication
            const user: AuthUser = {
                id: result.user.id,
                username: result.user.username,
                role: result.user.role || 'admin',
                active: result.user.active,
                createdAt: Date.now(),
                avatar: result.user.avatar
            };

            // Create session
            this.createSession(user);

            return { success: true, user };
        } catch (error) {
            console.error('Authentication error:', error);

            // Fallback to direct Firestore query for plain-text passwords (legacy support)
            try {
                const q = query(
                    collection(db, 'admin_users'),
                    where('password', '==', password)
                );
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const userDoc = snapshot.docs[0];
                    const userData = userDoc.data();

                    if (userData.active) {
                        const user: AuthUser = {
                            id: userDoc.id,
                            username: userData.username,
                            role: userData.role || 'admin',
                            active: userData.active,
                            createdAt: userData.createdAt,
                            password: userData.password,
                            avatar: userData.avatar
                        };

                        this.createSession(user);
                        return { success: true, user };
                    } else {
                        return { success: false, error: 'Account is disabled' };
                    }
                }
            } catch (fallbackError) {
                console.error('Fallback auth error:', fallbackError);
            }

            return { success: false, error: 'Authentication system error. Please try again.' };
        }
    }

    /**
     * Authenticate a viewer user by password
     * Checks both password match AND active status
     */
    async authenticateViewer(password: string): Promise<{ success: boolean; user?: any; error?: string }> {
        try {
            // Query viewers collection for matching password
            const q = query(
                collection(db, 'viewers'),
                where('password', '==', password)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                await this.logAuthAttempt('unknown', false, 'Invalid credentials', 'viewer');
                return { success: false, error: 'Invalid password' };
            }

            const viewerDoc = snapshot.docs[0];
            const viewerData = viewerDoc.data();

            // Check if account is active
            if (!viewerData.active) {
                await this.logAuthAttempt(viewerData.name || 'unknown', false, 'Account disabled', 'viewer');
                return { success: false, error: 'Account is disabled. Contact administrator.' };
            }

            // Successful authentication
            const user = {
                id: viewerDoc.id,
                ...viewerData
            };

            await this.logAuthAttempt(viewerData.name || user.id, true, 'Login successful', 'viewer');

            return { success: true, user };
        } catch (error) {
            console.error('Viewer authentication error:', error);
            await this.logAuthAttempt('unknown', false, `System error: ${error}`, 'viewer');
            return { success: false, error: 'Authentication system error. Please try again.' };
        }
    }

    /**
     * Log authentication attempt to audit logs
     */
    private async logAuthAttempt(
        username: string,
        success: boolean,
        reason: string,
        userType: 'admin' | 'viewer'
    ): Promise<void> {
        try {
            await addDoc(collection(db, 'audit_logs'), {
                action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
                targetName: username,
                userType,
                reason,
                timestamp: Date.now(),
                ipAddress: this.getClientIP()
            });
        } catch (error) {
            console.error('Failed to log auth attempt:', error);
            // Don't throw - logging failure shouldn't prevent authentication
        }
    }

    /**
     * Create a session for authenticated user
     */
    private createSession(user: AuthUser): void {
        const session: AuthSession = {
            user,
            timestamp: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };

        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

        // Start periodic session validation
        this.startSessionCheck();
    }

    /**
     * Get current session if valid
     */
    getSession(): AuthSession | null {
        try {
            const sessionData = sessionStorage.getItem(SESSION_KEY);
            if (!sessionData) return null;

            const session: AuthSession = JSON.parse(sessionData);

            // Check if session has expired
            if (Date.now() > session.expiresAt) {
                this.clearSession();
                return null;
            }

            return session;
        } catch (error) {
            console.error('Error reading session:', error);
            return null;
        }
    }

    /**
     * Check if current session is still valid (account still active)
     */
    async checkSessionValidity(): Promise<boolean> {
        const session = this.getSession();
        if (!session) return false;

        try {
            // Verify user account is still active in database
            const userDoc = await getDocs(
                query(collection(db, 'admin_users'), where('__name__', '==', session.user.id))
            );

            if (userDoc.empty) {
                // User no longer exists
                this.invalidateSession('Account no longer exists');
                return false;
            }

            const userData = userDoc.docs[0].data();
            if (!userData.active) {
                // Account has been disabled
                this.invalidateSession('Your account has been disabled');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error checking session validity:', error);
            return true; // Don't invalidate on error
        }
    }

    /**
     * Start periodic session validation
     */
    private startSessionCheck(): void {
        // Clear existing interval if any
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
        }

        // Check session validity every minute
        this.sessionCheckInterval = setInterval(async () => {
            await this.checkSessionValidity();
        }, SESSION_CHECK_INTERVAL);
    }

    /**
     * Stop session validation checks
     */
    private stopSessionCheck(): void {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
    }

    /**
     * Invalidate current session and notify listeners
     */
    private invalidateSession(reason: string): void {
        this.clearSession();
        this.sessionInvalidatedCallbacks.forEach(callback => callback(reason));
    }

    /**
     * Clear session data and stop checks
     */
    clearSession(): void {
        sessionStorage.removeItem(SESSION_KEY);
        this.stopSessionCheck();
    }

    /**
     * Logout user and log the event
     */
    async logout(): Promise<void> {
        const session = this.getSession();
        if (session) {
            await this.logAuthAttempt(session.user.username, true, 'Logout', 'admin');
        }
        this.clearSession();
    }

    /**
     * Register callback for session invalidation events
     */
    onSessionInvalidated(callback: (reason: string) => void): () => void {
        this.sessionInvalidatedCallbacks.push(callback);

        // Return unsubscribe function
        return () => {
            const index = this.sessionInvalidatedCallbacks.indexOf(callback);
            if (index > -1) {
                this.sessionInvalidatedCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * Get client IP address (placeholder - in real app would use server-side)
     */
    private getClientIP(): string {
        // In a real application, this would be determined server-side
        // For now, return a placeholder
        return 'client-browser';
    }
}

// Export singleton instance
export const authService = new AuthService();
