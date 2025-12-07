import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { XIcon, CameraIcon, PhoneIcon, UserIcon, EditIcon, UserPlusIcon } from './Icons';
import { Viewer } from '../types';
import { sanitizeInput } from '../utils/security';

interface ViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (viewer: Omit<Viewer, 'id' | 'createdAt' | 'createdBy'>) => void;
    editingViewer?: Viewer | null;
    theme: 'light' | 'dark';
}

const ViewerModal: React.FC<ViewerModalProps> = ({
    isOpen,
    onClose,
    onSave,
    editingViewer,
    theme
}) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [avatar, setAvatar] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (editingViewer) {
            setName(editingViewer.name);
            setPhoneNumber(editingViewer.phoneNumber);
            setPassword(editingViewer.password || '');
            setAvatar(editingViewer.avatar);
            setIsActive(editingViewer.active);
        } else {
            resetForm();
        }
    }, [editingViewer, isOpen]);

    const resetForm = () => {
        setName('');
        setPhoneNumber('+998');
        setPassword('');
        setAvatar('https://api.dicebear.com/7.x/avataaars/svg?seed=' + Math.random());
        setIsActive(true);
        setErrors({});
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!name.trim()) newErrors.name = t('nameRequired') || 'Name is required';
        if (!phoneNumber.trim()) newErrors.phoneNumber = t('phoneRequired') || 'Phone is required';
        if (!password.trim()) newErrors.password = t('passwordRequired') || 'Password is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSave({
                name,
                phoneNumber,
                password,
                avatar,
                active: isActive,
                role: 'viewer'
            });
            onClose();
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-2xl shadow-2xl transform transition-all flex flex-col max-h-[90vh] ${theme === 'dark' ? 'bg-[#1F2937] border border-gray-700' : 'bg-white'
                }`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b shrink-0 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-600'
                            }`}>
                            {editingViewer ? <EditIcon className="w-5 h-5" /> : <UserPlusIcon className="w-5 h-5" />}
                        </div>
                        <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {editingViewer ? t('editViewer') : t('addViewer')}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-xl transition-colors ${theme === 'dark'
                            ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                            : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    {/* Avatar Upload */}
                    <div className="flex justify-center mb-2">
                        <div className="relative group">
                            <div className={`w-24 h-24 rounded-full overflow-hidden border-4 transition-colors ${theme === 'dark' ? 'border-gray-700 group-hover:border-teal-500' : 'border-gray-200 group-hover:border-teal-500'
                                }`}>
                                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer backdrop-blur-[2px]">
                                <CameraIcon className="w-8 h-8 text-white mb-1" />
                                <span className="text-[10px] text-white font-bold uppercase tracking-wider">Edit</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        </div>
                    </div>

                    {/* Name Input */}
                    <div>
                        <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            {t('viewerName')}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(sanitizeInput(e.target.value))}
                            className={`w-full px-4 py-3 rounded-xl border transition-all outline-none ${theme === 'dark'
                                ? 'bg-gray-800 border-gray-700 text-white focus:border-teal-500'
                                : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-teal-500'
                                } ${errors.name ? 'border-red-500' : ''}`}
                            placeholder="John Doe"
                        />
                        {errors.name && (
                            <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                        )}
                    </div>

                    {/* Phone Number Input */}
                    <div>
                        <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            {t('phoneNumber')}
                        </label>
                        <input
                            type="text"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(sanitizeInput(e.target.value))}
                            className={`w-full px-4 py-3 rounded-xl border transition-all outline-none ${theme === 'dark'
                                ? 'bg-gray-800 border-gray-700 text-white focus:border-teal-500'
                                : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-teal-500'
                                } ${errors.phoneNumber ? 'border-red-500' : ''}`}
                            placeholder="+998 90 123 45 67"
                        />
                        {errors.phoneNumber && (
                            <p className="mt-1 text-xs text-red-500">{errors.phoneNumber}</p>
                        )}
                    </div>

                    {/* Password Input */}
                    <div>
                        <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            {t('viewerPassword')}
                        </label>
                        <input
                            type="text"
                            value={password}
                            onChange={(e) => setPassword(sanitizeInput(e.target.value))}
                            className={`w-full px-4 py-3 rounded-xl border transition-all outline-none ${theme === 'dark'
                                ? 'bg-gray-800 border-gray-700 text-white focus:border-teal-500'
                                : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-teal-500'
                                } ${errors.password ? 'border-red-500' : ''}`}
                            placeholder="Secret Password"
                        />
                        {errors.password && (
                            <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                        )}
                    </div>

                    {/* Active Status */}
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isActive
                                    ? theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                                    : theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
                                    }`}>
                                    <UserIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {t('status')}
                                    </h4>
                                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {isActive ? t('active') : t('inactive')}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsActive(!isActive)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${isActive ? 'bg-teal-500' : 'bg-gray-200'
                                    }`}
                            >
                                <span
                                    className={`${isActive ? 'translate-x-6' : 'translate-x-1'
                                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${theme === 'dark'
                                ? 'text-gray-300 hover:bg-gray-800'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-bold shadow-sm transition-all transform active:scale-95"
                        >
                            {editingViewer ? t('save') : t('add')}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default ViewerModal;
