import React, { useState } from 'react';
import { CreateAccountDTO } from '../types';
import { SuperAdminService } from '../hooks/superAdminService';

interface CreateAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    theme: 'light' | 'dark';
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
    isOpen, onClose, onSuccess, theme
}) => {
    const [formData, setFormData] = useState<CreateAccountDTO>({
        email: '',
        accountName: '',
        initialAdminName: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdPassword, setCreatedPassword] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const result = await SuperAdminService.createAccount(formData);
            // @ts-ignore - password is added by our service wrapper even if not in standard response type
            setCreatedPassword(result.password || 'Unknown');
            onSuccess(); // Refresh list background
        } catch (err: any) {
            setError(err.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    const resetAndClose = () => {
        setFormData({ email: '', accountName: '', initialAdminName: '' });
        setCreatedPassword(null);
        setError(null);
        onClose();
    };

    if (createdPassword) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">✅</span>
                        </div>
                        <h3 className="text-xl font-bold">Account Created!</h3>
                        <p className="opacity-80 mt-2">Please copy the temporary password below.</p>
                    </div>

                    <div className={`p-4 rounded-xl border mb-6 text-center font-mono text-lg break-all select-all ${theme === 'dark' ? 'bg-black/30 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                        {createdPassword}
                    </div>

                    <div className="text-xs text-center opacity-60 mb-6">
                        ⚠️ Share this securely. It cannot be retrieved again.
                    </div>

                    <button onClick={resetAndClose} className="w-full py-3 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all">
                        Done
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Create Tenant Account</h3>
                    <button onClick={onClose} className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}>
                        ✕
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Account Name</label>
                        <input
                            type="text"
                            required
                            minLength={3}
                            placeholder="e.g. Tashkent City Taxi"
                            className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#0d9488] transition-all ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                            value={formData.accountName}
                            onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Admin Email</label>
                        <input
                            type="email"
                            required
                            placeholder="admin@company.com"
                            className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#0d9488] transition-all ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Admin Name</label>
                        <input
                            type="text"
                            placeholder="Full Name"
                            className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#0d9488] transition-all ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                            value={formData.initialAdminName}
                            onChange={e => setFormData({ ...formData, initialAdminName: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-3 rounded-xl font-bold transition-colors ${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
