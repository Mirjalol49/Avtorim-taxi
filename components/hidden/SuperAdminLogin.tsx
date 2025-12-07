import React, { useState, useEffect } from 'react';
import { LockIcon, SparklesIcon } from '../Icons';
import { subscribeToAdminUsers } from '../../services/firestoreService';

interface SuperAdminLoginProps {
    onAuthenticated: (user: any) => void;
}

const SuperAdminLogin: React.FC<SuperAdminLoginProps> = ({ onAuthenticated }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [lockoutTime, setLockoutTime] = useState(0);
    const [adminUsers, setAdminUsers] = useState<any[]>([]);

    useEffect(() => {
        const unsubscribe = subscribeToAdminUsers((users) => {
            setAdminUsers(users);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (lockoutTime > 0) {
            const timer = setInterval(() => {
                setLockoutTime(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        } else if (lockoutTime === 0 && attempts >= 3) {
            setAttempts(0);
        }
    }, [lockoutTime, attempts]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (lockoutTime > 0) return;

        setLoading(true);
        setError('');

        try {
            // Import authService for secure authentication
            const { authService } = await import('../../services/authService');

            // Authenticate using centralized service (checks password AND active status)
            const result = await authService.authenticateAdmin(password);

            if (result.success && result.user) {
                // Successful authentication
                onAuthenticated(result.user);
            } else {
                // Authentication failed
                const newAttempts = attempts + 1;
                setAttempts(newAttempts);

                // Show specific error message
                if (result.error?.includes('disabled')) {
                    setError('Account is disabled. Contact system administrator.');
                } else {
                    setError('Invalid password');
                }

                // Lockout after 3 failed attempts
                if (newAttempts >= 3) {
                    setLockoutTime(30);
                    setError('Too many failed attempts. Try again in 30s.');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('System error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                        <LockIcon className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-wider uppercase">Restricted Access</h1>
                    <p className="text-gray-400 text-sm mt-2">Authorized Personnel Only</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">

                    <div>
                        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                            placeholder="••••••••"
                            disabled={lockoutTime > 0}
                            autoFocus // Added autoFocus
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || lockoutTime > 0 || !password} // Updated disabled condition
                        className={`w-full py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${loading || lockoutTime > 0
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-600/20'
                            }`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <SparklesIcon className="w-4 h-4 animate-spin" />
                                Verifying...
                            </span>
                        ) : (
                            lockoutTime > 0 ? `Locked (${lockoutTime}s)` : 'Authenticate'
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-600 font-mono">
                        IP: {window.location.hostname} | System ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminLogin;
