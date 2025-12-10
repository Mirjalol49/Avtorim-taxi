import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    SearchIcon, PlusIcon, GridIcon, ListIcon,
    TrashIcon, EditIcon, PhoneIcon, UserIcon
} from '../../../components/Icons';
import { Viewer } from '../../core/types';
import { subscribeToViewers, addViewer, updateViewer, deleteViewer } from '../../../services/firestoreService';
import ViewerModal from '../../../components/ViewerModal';
import ConfirmModal from '../../../components/ConfirmModal';
import { useToast } from '../../../components/ToastNotification';
import Skeleton from '../../../components/Skeleton';

interface RolesPageProps {
    theme: 'light' | 'dark';
    // language removed
    adminName: string;
    adminId: string;
}

export const RolesPage: React.FC<RolesPageProps> = ({ theme, adminName, adminId }) => {
    const { t } = useTranslation();
    const { addToast } = useToast();

    // State
    const [viewers, setViewers] = useState<Viewer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingViewer, setEditingViewer] = useState<Viewer | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [viewerToDelete, setViewerToDelete] = useState<Viewer | null>(null);

    // Subscribe to viewers
    useEffect(() => {
        const unsubscribe = subscribeToViewers((data) => {
            setViewers(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Filter viewers by Search AND by Current Admin (Scoping)
    const filteredViewers = viewers.filter(viewer => {
        // Scoping: Only show viewers created by THIS admin (by ID) or Legacy (by Name)
        // This ensures tenant isolation while keeping legacy data visible
        const isMyViewer = viewer.createdBy === adminId || viewer.createdBy === adminName;

        // Search
        const matchesSearch = viewer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            viewer.phoneNumber.includes(searchQuery);

        return isMyViewer && matchesSearch;
    });

    // Handlers
    const handleAddViewer = async (viewerData: Omit<Viewer, 'id' | 'createdAt' | 'createdBy'>) => {
        try {
            await addViewer({
                ...viewerData,
                role: 'viewer', // Explicitly set role
                active: true,   // Default to active
                avatar: viewerData.avatar || '', // Ensure avatar string
                createdAt: Date.now(),
                createdBy: adminId // Always use ID for new viewers (Best Practice)
            });
            addToast('success', t('viewerAdded') || 'Viewer added', 3000);
        } catch (error) {
            addToast('error', 'Failed to add viewer', 3000);
        }
    };

    const handleUpdateViewer = async (viewerData: Omit<Viewer, 'id' | 'createdAt' | 'createdBy'>) => {
        if (!editingViewer) return;
        try {
            await updateViewer(editingViewer.id, viewerData);
            addToast('success', t('viewerUpdated') || 'Viewer updated', 3000);
        } catch (error) {
            addToast('error', 'Failed to update viewer', 3000);
        }
    };

    const handleDeleteViewer = async () => {
        if (!viewerToDelete) return;
        try {
            await deleteViewer(viewerToDelete.id);
            addToast('success', t('viewerDeleted') || 'Viewer deleted', 3000);
            setIsDeleteModalOpen(false);
            setViewerToDelete(null);
        } catch (error) {
            addToast('error', 'Failed to delete viewer', 3000);
        }
    };

    const openEditModal = (viewer: Viewer) => {
        setEditingViewer(viewer);
        setIsModalOpen(true);
    };

    const openDeleteModal = (viewer: Viewer) => {
        setViewerToDelete(viewer);
        setIsDeleteModalOpen(true);
    };

    return (
        <div className="space-y-6 pb-24 md:pb-0 animate-fadeIn">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className={`relative w-full md:w-96 group ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                    <SearchIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${theme === 'dark' ? 'text-gray-500 group-focus-within:text-teal-500' : 'text-gray-400 group-focus-within:text-teal-600'
                        }`} />
                    <input
                        type="text"
                        placeholder={t('searchPlaceholder') || 'Search...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all ${theme === 'dark'
                            ? 'bg-[#1F2937] border-gray-700 focus:border-teal-500 placeholder-gray-600'
                            : 'bg-white border-gray-200 focus:border-teal-500 placeholder-gray-400'
                            }`}
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className={`flex p-1 rounded-xl border ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
                        }`}>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid'
                                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                                : theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <GridIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list'
                                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                                : theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <ListIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setEditingViewer(null);
                            setIsModalOpen(true);
                        }}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-teal-900/20 active:scale-95"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>{t('addViewer') || 'Add Viewer'}</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
                            }`}>
                            <div className="flex items-center gap-4">
                                <Skeleton variant="circular" width={56} height={56} theme={theme} />
                                <div className="flex-1 space-y-2">
                                    <Skeleton variant="text" width="60%" height={20} theme={theme} />
                                    <Skeleton variant="text" width="40%" height={16} theme={theme} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredViewers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${theme === 'dark' ? 'bg-gray-800 text-gray-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                        <UserIcon className="w-10 h-10" />
                    </div>
                    <h3 className={`text-lg font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {t('noViewers') || 'No Viewers'}
                    </h3>
                    <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                        {searchQuery ? (t('tryAdjustingSearch') || 'Try adjusting search') : (t('addViewerToStart') || 'Add a viewer to get started')}
                    </p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredViewers.map((viewer) => (
                        <div key={viewer.id} className={`group relative p-6 rounded-2xl border transition-all hover:shadow-xl ${theme === 'dark'
                            ? 'bg-[#1F2937] border-gray-700 hover:border-teal-500/50'
                            : 'bg-white border-gray-200 hover:border-teal-500/50'
                            }`}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <img
                                        src={viewer.avatar}
                                        alt={viewer.name}
                                        className="w-14 h-14 rounded-full object-cover border-2 border-teal-500/20"
                                    />
                                    <div>
                                        <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                            {viewer.name}
                                        </h3>
                                        <div className={`flex items-center gap-1.5 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                            <PhoneIcon className="w-3.5 h-3.5" />
                                            {viewer.phoneNumber}
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${viewer.active
                                    ? theme === 'dark' ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'
                                    : theme === 'dark' ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
                                    }`}>
                                    {viewer.active ? (t('active') || 'Active') : (t('inactive') || 'Inactive')}
                                </div>
                            </div>

                            <div className={`pt-4 mt-4 border-t flex items-center justify-between ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
                                }`}>
                                <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {t('addedBy') || 'Added by'} {viewer.createdBy === adminId ? adminName : viewer.createdBy}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openEditModal(viewer)}
                                        className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-teal-400' : 'hover:bg-gray-100 text-teal-600'
                                            }`}
                                    >
                                        <EditIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => openDeleteModal(viewer)}
                                        className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'
                                            }`}
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
                    }`}>
                    <table className="w-full text-left">
                        <thead className={`border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider opacity-60">{t('viewer') || 'Viewer'}</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider opacity-60">{t('phone') || 'Phone'}</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider opacity-60">{t('status') || 'Status'}</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider opacity-60 text-right">{t('actions') || 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredViewers.map((viewer) => (
                                <tr key={viewer.id} className={`group transition-colors ${theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
                                    }`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={viewer.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                                            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                {viewer.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {viewer.phoneNumber}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${viewer.active
                                            ? theme === 'dark' ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'
                                            : theme === 'dark' ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
                                            }`}>
                                            {viewer.active ? (t('active') || 'Active') : (t('inactive') || 'Inactive')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditModal(viewer)}
                                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-teal-400' : 'hover:bg-gray-100 text-teal-600'
                                                    }`}
                                            >
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(viewer)}
                                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'
                                                    }`}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modals */}
            <ViewerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={editingViewer ? handleUpdateViewer : handleAddViewer}
                editingViewer={editingViewer}
                theme={theme}
            />

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onCancel={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteViewer}
                title={t('viewerDeleted') || 'Viewer deleted'}
                message={t('confirmDeleteViewer') || 'Are you sure you want to delete this viewer?'}
                theme={theme}
            />
        </div>
    );
};
