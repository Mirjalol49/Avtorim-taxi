import React, { useState, useEffect, useCallback } from 'react';
import SuperAdminLogin from './SuperAdminLogin';
import AdminUserManagement from './AdminUserManagement';
import AdminAuditLog from './AdminAuditLog';
import AccountDataViewer from './AccountDataViewer';
import { LogOutIcon, ShieldIcon } from '../Icons';
import NotificationComposer from './NotificationComposer';
import { useToast } from '../ToastNotification';

type TabType = 'users' | 'audit' | 'notifications';

const TABS = [
    { id: 'users' as const, label: 'User Management', color: 'blue', icon: '👥' },
    { id: 'audit' as const, label: 'Audit Logs', color: 'purple', icon: '📋' },
    { id: 'notifications' as const, label: 'Notifications', color: 'teal', icon: '📣' }
];

const HiddenDashboard: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<TabType>('users');
    const [viewingUser, setViewingUser] = useState<any>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const { addToast } = useToast();

    // Check for session on mount
    useEffect(() => {
        const session = sessionStorage.getItem('avtorim_super_admin_session');
        if (session) {
            try {
                const user = JSON.parse(session);
                setCurrentUser(user);
                setIsAuthenticated(true);
            } catch (e) {
                sessionStorage.removeItem('avtorim_super_admin_session');
            }
        }
    }, []);

    const handleLogin = useCallback((user: any) => {
        setCurrentUser(user);
        setIsAuthenticated(true);
        sessionStorage.setItem('avtorim_super_admin_session', JSON.stringify(user));
        addToast('success', `Welcome back, ${user.username}!`);
    }, [addToast]);

    const handleLogout = useCallback(() => {
        setIsAuthenticated(false);
        setCurrentUser(null);
        sessionStorage.removeItem('avtorim_super_admin_session');
    }, []);

    const handleTabChange = useCallback((tab: TabType) => {
        if (tab === activeTab) return;
        setIsTransitioning(true);
        setTimeout(() => {
            setActiveTab(tab);
            setIsTransitioning(false);
        }, 150);
    }, [activeTab]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isAuthenticated) return;

            // Alt + 1/2/3 for tab switching
            if (e.altKey && ['1', '2', '3'].includes(e.key)) {
                e.preventDefault();
                const tabIndex = parseInt(e.key) - 1;
                if (TABS[tabIndex]) {
                    handleTabChange(TABS[tabIndex].id);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isAuthenticated, handleTabChange]);

    if (!isAuthenticated) {
        return <SuperAdminLogin onAuthenticated={handleLogin} />;
    }

    const getTabColor = (tabId: TabType, isActive: boolean) => {
        if (!isActive) return 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white';
        switch (tabId) {
            case 'users': return 'bg-blue-600 text-white shadow-lg shadow-blue-600/20';
            case 'audit': return 'bg-purple-600 text-white shadow-lg shadow-purple-600/20';
            case 'notifications': return 'bg-teal-600 text-white shadow-lg shadow-teal-600/20';
            default: return 'bg-gray-600 text-white';
        }
    };

    return (
        <div className="h-screen overflow-y-auto bg-gray-900 text-white font-sans custom-scrollbar">
            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/30 transform hover:scale-105 transition-transform">
                                <ShieldIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold tracking-wide bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                                    ADMIN CONSOLE
                                </h1>
                                <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    Restricted Environment
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Session Info */}
                            <div className="hidden sm:flex items-center gap-3 bg-gray-900/50 px-4 py-2 rounded-xl border border-gray-700">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <div>
                                    <span className="text-sm font-medium text-gray-200">
                                        {currentUser?.username}
                                    </span>
                                    <span className="ml-2 text-xs px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-bold uppercase">
                                        {currentUser?.role}
                                    </span>
                                </div>
                            </div>

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="p-2.5 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all duration-200 group"
                                title="Logout"
                            >
                                <LogOutIcon className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tabs */}
                <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
                    {TABS.map((tab, index) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`px-5 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${getTabColor(tab.id, activeTab === tab.id)}`}
                            title={`Alt+${index + 1}`}
                        >
                            <span className="text-base">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area with Transition */}
                <div
                    className={`transition-all duration-200 ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
                >
                    {activeTab === 'users' && (
                        <AdminUserManagement
                            currentUser={currentUser}
                            onViewAccountData={(user) => setViewingUser(user)}
                        />
                    )}
                    {activeTab === 'audit' && <AdminAuditLog />}
                    {activeTab === 'notifications' && (
                        <div className="max-w-2xl mx-auto">
                            <NotificationComposer
                                lang="en"
                                theme="dark"
                                currentUserId={currentUser?.id || 'superadmin'}
                                currentUserName={currentUser?.username || 'Super Admin'}
                                addToast={addToast}
                            />
                        </div>
                    )}
                </div>
            </main>

            {/* Account Data Viewer Modal */}
            {viewingUser && (
                <AccountDataViewer
                    user={viewingUser}
                    onClose={() => setViewingUser(null)}
                />
            )}
        </div>
    );
};

export default HiddenDashboard;
