import React, { useState, useEffect } from 'react';
import { XIcon, UsersIcon, TrendingUpIcon, WalletIcon, CalendarIcon } from '../Icons';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { getCollectionPath } from '../../services/firestoreService';
import { formatNumberSmart } from '../../utils/formatNumber';

interface AccountDataViewerProps {
    user: any;
    onClose: () => void;
}

const AccountDataViewer: React.FC<AccountDataViewerProps> = ({ user, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        driverCount: 0,
        transactionCount: 0,
        totalIncome: 0,
        totalExpense: 0
    });
    const [drivers, setDrivers] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'transactions'>('overview');

    useEffect(() => {
        fetchAccountData();
    }, [user.id]);

    const fetchAccountData = async () => {
        setLoading(true);
        try {
            const fleetId = user.id;

            // Fetch drivers
            const driversRef = collection(db, getCollectionPath('drivers', fleetId));
            const driversSnapshot = await getDocs(driversRef);
            const driversData = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDrivers(driversData);

            // Fetch transactions (last 50)
            const txRef = collection(db, getCollectionPath('transactions', fleetId));
            const txQuery = query(txRef, orderBy('timestamp', 'desc'), limit(50));
            const txSnapshot = await getDocs(txQuery);
            const txData = txSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(txData);

            // Calculate stats
            const income = txData.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
            const expense = txData.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

            setStats({
                driverCount: driversData.length,
                transactionCount: txData.length,
                totalIncome: income,
                totalExpense: expense
            });
        } catch (error) {
            console.error('Error fetching account data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-900/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xl">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{user.username}</h2>
                            <p className="text-sm text-gray-400">Account Data (Read-Only)</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-4 border-b border-gray-700">
                    {(['overview', 'drivers', 'transactions'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab
                                ? 'bg-cyan-600 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'overview' && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                                            <UsersIcon className="w-4 h-4" />
                                            <span className="text-xs uppercase">Drivers</span>
                                        </div>
                                        <div className="text-2xl font-bold text-white">{stats.driverCount}</div>
                                    </div>
                                    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                                            <CalendarIcon className="w-4 h-4" />
                                            <span className="text-xs uppercase">Transactions</span>
                                        </div>
                                        <div className="text-2xl font-bold text-white">{stats.transactionCount}</div>
                                    </div>
                                    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                                        <div className="flex items-center gap-2 text-green-400 mb-2">
                                            <TrendingUpIcon className="w-4 h-4" />
                                            <span className="text-xs uppercase">Income</span>
                                        </div>
                                        <div className="text-2xl font-bold text-green-400">
                                            {formatNumberSmart(stats.totalIncome, false, 'uz')}
                                        </div>
                                    </div>
                                    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                                        <div className="flex items-center gap-2 text-red-400 mb-2">
                                            <WalletIcon className="w-4 h-4" />
                                            <span className="text-xs uppercase">Expense</span>
                                        </div>
                                        <div className="text-2xl font-bold text-red-400">
                                            {formatNumberSmart(stats.totalExpense, false, 'uz')}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'drivers' && (
                                <div className="space-y-3">
                                    {drivers.length === 0 ? (
                                        <div className="text-center text-gray-500 py-12">No drivers found</div>
                                    ) : (
                                        drivers.map(driver => (
                                            <div key={driver.id} className="flex items-center gap-4 bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                                                <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                                                    {driver.avatar ? (
                                                        <img src={driver.avatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                            <UsersIcon className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium text-white">{driver.name}</div>
                                                    <div className="text-sm text-gray-500">{driver.carModel} • {driver.licensePlate}</div>
                                                </div>
                                                <div className={`px-2 py-1 rounded text-xs font-medium ${driver.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                                    {driver.status}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'transactions' && (
                                <div className="space-y-2">
                                    {transactions.length === 0 ? (
                                        <div className="text-center text-gray-500 py-12">No transactions found</div>
                                    ) : (
                                        transactions.slice(0, 20).map(tx => (
                                            <div key={tx.id} className="flex items-center justify-between bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${tx.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                    <div>
                                                        <div className="text-sm text-white">{tx.description || 'No description'}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {new Date(tx.timestamp).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={`font-mono font-medium ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                                    {tx.type === 'income' ? '+' : '-'}{formatNumberSmart(tx.amount, false, 'uz')}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountDataViewer;
