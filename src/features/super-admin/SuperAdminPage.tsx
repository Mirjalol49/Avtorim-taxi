import React, { useEffect, useState } from 'react';
import { SuperAdminService } from './hooks/superAdminService';
import { SuperAdminAccount } from './types';
import { AccountList } from './components/AccountList';
import EnhancedCreateAccountModal from './components/EnhancedCreateAccountModal';
import MFASetupModal from './components/MFASetupModal';
import AuditLogViewer from './components/AuditLogViewer';

interface SuperAdminPageProps {
    theme: 'light' | 'dark';
}

type Tab = 'accounts' | 'pending' | 'audit' | 'settings';

const SuperAdminPage: React.FC<SuperAdminPageProps> = ({ theme }) => {
    const [accounts, setAccounts] = useState<SuperAdminAccount[]>([]);
    const [pendingAccounts, setPendingAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('accounts');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mfaModalOpen, setMfaModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<{ id: string, username: string } | null>(null);

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa('driver123:secretKey')
    };

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const data = await SuperAdminService.getAccounts();
            setAccounts(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingAccounts = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/admin/pending-accounts', { headers });
            const data = await response.json();
            setPendingAccounts(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchAccounts();
        fetchPendingAccounts();
    }, []);

    const handleApprove = async (accountId: string) => {
        try {
            await fetch('http://localhost:3000/api/admin/approve-account', {
                method: 'POST',
                headers,
                body: JSON.stringify({ accountId })
            });
            fetchPendingAccounts();
            fetchAccounts();
        } catch (err) {
            console.error(err);
        }
    };

    const handleReject = async (accountId: string) => {
        const reason = prompt('Rejection reason:');
        if (!reason) return;

        try {
            await fetch('http://localhost:3000/api/admin/reject-account', {
                method: 'POST',
                headers,
                body: JSON.stringify({ accountId, reason })
            });
            fetchPendingAccounts();
        } catch (err) {
            console.error(err);
        }
    };

    const totalAccounts = accounts.length;
    const activeAccounts = accounts.filter(a => a.status === 'active').length;

    const tabs = [
        { id: 'accounts', label: 'Accounts', count: totalAccounts },
        { id: 'pending', label: 'Pending', count: pendingAccounts.length },
        { id: 'audit', label: 'Audit Logs' },
        { id: 'settings', label: 'Settings' }
    ];

    return (
        <div className={`min-h-screen p-6 md:p-10 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">🔐 Super Admin Panel</h1>
                        <p className="opacity-60 mt-1">Enterprise Security & Account Management</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#0d9488] text-white rounded-xl font-bold shadow-lg shadow-[#0d9488]/20 hover:bg-[#0f766e] active:scale-95 transition-all"
                    >
                        <span>+</span> Create Account
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="opacity-60 text-sm font-bold uppercase tracking-wider">Total Accounts</div>
                        <div className="text-4xl font-black mt-2">{totalAccounts}</div>
                    </div>
                    <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="opacity-60 text-sm font-bold uppercase tracking-wider text-green-500">Active</div>
                        <div className="text-4xl font-black mt-2 text-green-500">{activeAccounts}</div>
                    </div>
                    <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="opacity-60 text-sm font-bold uppercase tracking-wider text-yellow-500">Pending</div>
                        <div className="text-4xl font-black mt-2 text-yellow-500">{pendingAccounts.length}</div>
                    </div>
                    <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="opacity-60 text-sm font-bold uppercase tracking-wider text-red-500">Disabled</div>
                        <div className="text-4xl font-black mt-2 text-red-500">{totalAccounts - activeAccounts}</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className={`flex gap-1 p-1 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all ${activeTab === tab.id
                                    ? 'bg-[#0d9488] text-white shadow-lg'
                                    : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-white/20' : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                                    }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'accounts' && (
                    <AccountList
                        accounts={accounts}
                        loading={loading}
                        theme={theme}
                        onRefresh={fetchAccounts}
                    />
                )}

                {activeTab === 'pending' && (
                    <div className="space-y-4">
                        {pendingAccounts.length === 0 ? (
                            <div className={`p-8 text-center rounded-2xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                <div className="text-4xl mb-4">✅</div>
                                <p className="opacity-60">No pending accounts</p>
                            </div>
                        ) : (
                            pendingAccounts.map(account => (
                                <div key={account.id} className={`p-4 rounded-xl border flex justify-between items-center ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div>
                                        <div className="font-bold">{account.username || account.email}</div>
                                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {account.email} • Created {new Date(account.createdAt?._seconds * 1000 || account.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApprove(account.id)}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleReject(account.id)}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'audit' && (
                    <AuditLogViewer theme={theme} />
                )}

                {activeTab === 'settings' && (
                    <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <h3 className="text-xl font-bold mb-4">Security Settings</h3>
                        <div className="space-y-4">
                            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="font-bold">Two-Factor Authentication</div>
                                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Add extra security to your account
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedUser({ id: 'current', username: 'mirjalol' });
                                            setMfaModalOpen(true);
                                        }}
                                        className="px-4 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-lg font-bold text-sm"
                                    >
                                        Setup MFA
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <EnhancedCreateAccountModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    fetchAccounts();
                    fetchPendingAccounts();
                }}
                theme={theme}
            />

            {selectedUser && (
                <MFASetupModal
                    isOpen={mfaModalOpen}
                    onClose={() => { setMfaModalOpen(false); setSelectedUser(null); }}
                    userId={selectedUser.id}
                    username={selectedUser.username}
                    theme={theme}
                />
            )}
        </div>
    );
};

export default SuperAdminPage;
