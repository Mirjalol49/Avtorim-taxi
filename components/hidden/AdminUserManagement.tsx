import React, { useState, useEffect, useMemo } from 'react';
import { TrashIcon, PlusIcon, UserIcon, CheckCircleIcon, XIcon, EditIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon } from '../Icons';
import { subscribeToAdminUsers, addAdminUser, updateAdminUser, deleteAdminUser } from '../../services/firestoreService';
import ConfirmModal from '../ConfirmModal';
import { useToast } from '../ToastNotification';

interface AdminUserManagementProps {
    currentUser: any;
    onViewAccountData?: (user: any) => void;
}

const ITEMS_PER_PAGE = 10;

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ currentUser, onViewAccountData }) => {
    const { addToast } = useToast();
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState({ username: '', password: '', active: true, role: 'admin' });

    // Search and Pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Confirmation modals
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; userId: string; username: string }>({
        isOpen: false, userId: '', username: ''
    });
    const [statusConfirm, setStatusConfirm] = useState<{ isOpen: boolean; user: any; newStatus: boolean }>({
        isOpen: false, user: null, newStatus: false
    });

    useEffect(() => {
        const unsubscribe = subscribeToAdminUsers((data) => {
            setUsers(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Filtered and paginated users
    const filteredUsers = useMemo(() => {
        let result = users;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(u =>
                u.username.toLowerCase().includes(query) ||
                u.role.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(u => statusFilter === 'active' ? u.active : !u.active);
        }

        return result;
    }, [users, searchQuery, statusFilter]);

    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredUsers, currentPage]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await updateAdminUser(editingUser.id, formData, currentUser.username);
                addToast('success', 'User updated successfully');
            } else {
                if (users.some(u => u.username === formData.username)) {
                    addToast('error', 'Username already exists');
                    return;
                }
                await addAdminUser(formData, currentUser.username);
                addToast('success', 'User created successfully');
            }
            setIsModalOpen(false);
            setEditingUser(null);
            setFormData({ username: '', password: '', active: true, role: 'admin' });
        } catch (error) {
            console.error('Error saving user:', error);
            addToast('error', 'Failed to save user');
        }
    };

    const handleDelete = async () => {
        try {
            await deleteAdminUser(deleteConfirm.userId, deleteConfirm.username, currentUser.username);
            addToast('success', 'User deleted successfully');
            setDeleteConfirm({ isOpen: false, userId: '', username: '' });
        } catch (error) {
            console.error('Error deleting user:', error);
            addToast('error', 'Failed to delete user');
        }
    };

    const handleStatusToggle = async () => {
        if (!statusConfirm.user) return;
        try {
            await updateAdminUser(statusConfirm.user.id, { active: statusConfirm.newStatus }, currentUser.username);
            addToast('success', `User ${statusConfirm.newStatus ? 'activated' : 'deactivated'} successfully`);
            setStatusConfirm({ isOpen: false, user: null, newStatus: false });
        } catch (error) {
            console.error('Error updating status:', error);
            addToast('error', 'Failed to update status');
        }
    };



    return (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-blue-400" />
                        Admin Users
                        <span className="text-sm font-normal text-gray-400">({filteredUsers.length})</span>
                    </h2>
                    <button
                        onClick={() => {
                            setEditingUser(null);
                            setFormData({ username: '', password: '', active: true, role: 'admin' });
                            setIsModalOpen(true);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Add User
                    </button>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row gap-3 mt-4">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by username or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Disabled Only</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Status</th>

                            <th className="px-6 py-4">Created</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {isLoading ? (
                            // Loading skeleton
                            [...Array(3)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-700" />
                                            <div className="space-y-1">
                                                <div className="h-4 w-24 bg-gray-700 rounded" />
                                                <div className="h-3 w-16 bg-gray-700 rounded" />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><div className="h-5 w-16 bg-gray-700 rounded" /></td>
                                    <td className="px-6 py-4"><div className="h-5 w-14 bg-gray-700 rounded" /></td>

                                    <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-700 rounded" /></td>
                                    <td className="px-6 py-4 text-right"><div className="h-8 w-24 bg-gray-700 rounded ml-auto" /></td>
                                </tr>
                            ))
                        ) : paginatedUsers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    {searchQuery ? 'No users found matching your search.' : 'No users yet.'}
                                </td>
                            </tr>
                        ) : (
                            paginatedUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">{user.username}</div>
                                                <div className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${user.role === 'super_admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => {
                                                if (user.username !== currentUser.username) {
                                                    setStatusConfirm({ isOpen: true, user, newStatus: !user.active });
                                                }
                                            }}
                                            disabled={user.username === currentUser.username}
                                            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${user.username === currentUser.username ? 'cursor-not-allowed opacity-50' : 'hover:opacity-80'} ${user.active ? 'text-green-400' : 'text-red-400'}`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-green-400' : 'bg-red-400'}`} />
                                            {user.active ? 'Active' : 'Disabled'}
                                        </button>
                                    </td>

                                    <td className="px-6 py-4 text-sm text-gray-400">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {onViewAccountData && (
                                                <button
                                                    onClick={() => onViewAccountData(user)}
                                                    className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                                                    title="View Account Data"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setEditingUser(user);
                                                    setFormData({
                                                        username: user.username,
                                                        password: user.password,
                                                        active: user.active,
                                                        role: user.role
                                                    });
                                                    setIsModalOpen(true);
                                                }}
                                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                                            >
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            {user.username !== currentUser.username && (
                                                <button
                                                    onClick={() => setDeleteConfirm({ isOpen: true, userId: user.id, username: user.username })}
                                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
                    <div className="text-sm text-gray-400">
                        Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeftIcon className="w-4 h-4" />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum = i + 1;
                            if (totalPages > 5) {
                                if (currentPage > 3) pageNum = currentPage - 2 + i;
                                if (currentPage > totalPages - 2) pageNum = totalPages - 4 + i;
                            }
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Edit/Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">
                                {editingUser ? 'Edit User' : 'Add New User'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                                <input
                                    type="text"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="super_admin">Super Admin</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                                    <select
                                        value={formData.active ? 'active' : 'inactive'}
                                        onChange={(e) => setFormData({ ...formData, active: e.target.value === 'active' })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Disabled</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Save User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                onCancel={() => setDeleteConfirm({ isOpen: false, userId: '', username: '' })}
                onConfirm={handleDelete}
                title="Delete Admin User"
                message={`Are you sure you want to delete user "${deleteConfirm.username}"? This action cannot be undone.`}
                isDanger={true}
                lang="uz"
                theme="dark"
            />

            {/* Status Toggle Confirmation */}
            <ConfirmModal
                isOpen={statusConfirm.isOpen}
                onCancel={() => setStatusConfirm({ isOpen: false, user: null, newStatus: false })}
                onConfirm={handleStatusToggle}
                title={statusConfirm.newStatus ? "Activate User" : "Deactivate User"}
                message={`Are you sure you want to ${statusConfirm.newStatus ? 'activate' : 'deactivate'} user "${statusConfirm.user?.username}"?${!statusConfirm.newStatus ? ' They will no longer be able to log in.' : ''}`}
                isDanger={!statusConfirm.newStatus}
                lang="uz"
                theme="dark"
            />
        </div>
    );
};

export default AdminUserManagement;

