import React, { useState } from 'react';
import { SuperAdminAccount } from '../types';
import { StatusBadge } from './StatusBadge';
import { SuperAdminService } from '../hooks/superAdminService';

interface AccountListProps {
    accounts: SuperAdminAccount[];
    loading: boolean;
    theme: 'light' | 'dark';
    onRefresh: () => void;
}

export const AccountList: React.FC<AccountListProps> = ({ accounts, loading, theme, onRefresh }) => {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const handleToggleStatus = async (account: SuperAdminAccount) => {
        if (!window.confirm(`Are you sure you want to ${account.status === 'active' ? 'DISABLE' : 'ENABLE'} ${account.accountName}?`)) {
            return;
        }

        setProcessingId(account.id);
        try {
            await SuperAdminService.toggleStatus(account.id, account.status === 'active'); // Pass true if active (to disable) or false (to enable) -> Incorrect?
            // toggleStatus(uid, disabled)
            // If status is active, we want to disable (disabled=true)
            // If status is disabled, we want to enable (disabled=false)
            // const shouldDisable = account.status === 'active';
            // await SuperAdminService.toggleStatus(account.id, shouldDisable);
            onRefresh();
        } catch (error) {
            alert('Failed to update status');
            console.error(error);
        } finally {
            setProcessingId(null);
        }
    };

    const filteredAccounts = accounts.filter(acc =>
        acc.accountName.toLowerCase().includes(search.toLowerCase()) ||
        acc.ownerEmail.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`h-20 rounded-xl animate-pulse ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`} />
                ))}
            </div>
        );
    }

    if (accounts.length === 0) {
        return <div className="text-center py-10 opacity-50">No accounts found. Create one!</div>;
    }

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <input
                type="text"
                placeholder="Search accounts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#0d9488] transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
            />

            <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className={`${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'} text-xs uppercase font-bold tracking-wider`}>
                            <tr>
                                <th className="p-4">Account Name</th>
                                <th className="p-4">Admin Email</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
                            {filteredAccounts.map(account => (
                                <tr key={account.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                    <td className={`p-4 font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {account.accountName}
                                        <div className="text-[10px] font-mono opacity-50 font-normal">{account.id}</div>
                                    </td>
                                    <td className={`p-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {account.ownerEmail}
                                    </td>
                                    <td className="p-4">
                                        <StatusBadge status={account.status} />
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleToggleStatus(account)}
                                            disabled={processingId === account.id}
                                            className={`text-sm font-bold px-3 py-1.5 rounded-lg transition-all ${account.status === 'active'
                                                    ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                    : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                } disabled:opacity-50`}
                                        >
                                            {processingId === account.id ? 'Processing...' : (account.status === 'active' ? 'Disable' : 'Enable')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredAccounts.length === 0 && search && (
                        <div className="p-8 text-center opacity-60">No matches found for "{search}"</div>
                    )}
                </div>
            </div>
        </div>
    );
};
