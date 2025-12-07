import React, { useState, useEffect } from 'react';
import PasswordStrengthMeter from './PasswordStrengthMeter';

interface EnhancedCreateAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    theme?: 'light' | 'dark';
}

const EnhancedCreateAccountModal: React.FC<EnhancedCreateAccountModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    theme = 'dark'
}) => {
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        displayName: ''
    });
    const [passwordValid, setPasswordValid] = useState(false);
    const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa('driver123:secretKey')
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordValid) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:3000/api/admin/create-account-enhanced', {
                method: 'POST',
                headers,
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.errors?.join(', ') || data.error);
            }

            setSuccess(true);
            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ email: '', username: '', password: '', displayName: '' });
        setPasswordValid(false);
        setPasswordErrors([]);
        setError(null);
        setSuccess(false);
    };

    if (!isOpen) return null;

    if (success) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className={`w-full max-w-md p-8 rounded-2xl text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">✅</span>
                    </div>
                    <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Account Created!
                    </h3>
                    <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        The account is pending email verification and admin approval.
                    </p>
                    <button
                        onClick={() => { resetForm(); onClose(); }}
                        className="w-full py-3 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl font-bold"
                    >
                        Done
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>

                {/* Header */}
                <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                Create Admin Account
                            </h3>
                            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                New accounts require email verification + approval
                            </p>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Email */}
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            Email Address *
                        </label>
                        <input
                            type="email"
                            required
                            placeholder="admin@company.com"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#0d9488] ${theme === 'dark'
                                    ? 'bg-gray-900 border-gray-700 text-white'
                                    : 'bg-gray-50 border-gray-200 text-gray-900'
                                }`}
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            Username *
                        </label>
                        <input
                            type="text"
                            required
                            minLength={3}
                            placeholder="unique_username"
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                            className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#0d9488] font-mono ${theme === 'dark'
                                    ? 'bg-gray-900 border-gray-700 text-white'
                                    : 'bg-gray-50 border-gray-200 text-gray-900'
                                }`}
                        />
                    </div>

                    {/* Display Name */}
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            Display Name
                        </label>
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={formData.displayName}
                            onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                            className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#0d9488] ${theme === 'dark'
                                    ? 'bg-gray-900 border-gray-700 text-white'
                                    : 'bg-gray-50 border-gray-200 text-gray-900'
                                }`}
                        />
                    </div>

                    {/* Password with Strength Meter */}
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            Password *
                        </label>
                        <input
                            type="password"
                            required
                            minLength={12}
                            placeholder="••••••••••••"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#0d9488] ${theme === 'dark'
                                    ? 'bg-gray-900 border-gray-700 text-white'
                                    : 'bg-gray-50 border-gray-200 text-gray-900'
                                }`}
                        />
                        <PasswordStrengthMeter
                            password={formData.password}
                            onValidationChange={(valid, errors) => {
                                setPasswordValid(valid);
                                setPasswordErrors(errors);
                            }}
                            theme={theme}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-3 rounded-xl font-bold transition-all ${theme === 'dark'
                                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !passwordValid || !formData.email || !formData.username}
                            className="flex-1 py-3 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating...' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EnhancedCreateAccountModal;
