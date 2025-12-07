import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { XIcon, CameraIcon, EyeIcon, EyeOffIcon } from './Icons';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminData: { name: string; role: string; avatar?: string; password?: string };
  onUpdate: (data: { name: string; role: string; avatar?: string; password?: string }) => Promise<void> | void;
  // lang removed
  userRole: 'admin' | 'viewer';
  theme: 'light' | 'dark';
}

const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, adminData, onUpdate, userRole, theme }) => {
  const { t } = useTranslation();

  // Constants for validation
  const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
  const MIN_NAME_LENGTH = 3;
  const MAX_NAME_LENGTH = 100;

  // Form State
  const [name, setName] = useState(adminData.name);
  const [role, setRole] = useState(adminData.role);
  const [avatar, setAvatar] = useState(adminData.avatar);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Validation State
  const [nameError, setNameError] = useState('');
  const [imageError, setImageError] = useState('');

  // UI State
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isReadOnly = userRole === 'viewer';

  // Check if there are any changes
  const hasChanges =
    avatar !== adminData.avatar ||
    name !== adminData.name ||
    role !== adminData.role ||
    password.trim().length > 0;

  // Validate name input
  const validateName = (value: string): string => {
    if (value.trim().length < MIN_NAME_LENGTH) {
      return t('nameTooShort') || `Name must be at least ${MIN_NAME_LENGTH} characters`;
    }
    if (value.length > MAX_NAME_LENGTH) {
      return t('nameTooLong') || `Name must be under ${MAX_NAME_LENGTH} characters`;
    }
    // Allow letters, spaces, hyphens, and Unicode characters
    if (!/^[\p{L}\s-]+$/u.test(value.trim())) {
      return t('nameInvalidChars') || 'Name contains invalid characters';
    }
    return '';
  };

  // Handle name change with validation
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (value.trim()) {
      setNameError(validateName(value));
    } else {
      setNameError('');
    }
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(adminData.name);
      setRole(adminData.role);
      setAvatar(adminData.avatar);
      setPassword('');
      setPasswordError('');
      setNameError('');
      setImageError('');
      setIsSaving(false);
      setImageLoading(false);
      setSaveSuccess(false);
      setUploadProgress(0);
    }
  }, [isOpen, adminData]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSaving, onClose]);

  // Image upload handler with enhanced validation
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly || isSaving) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear previous errors
    setImageError('');

    // Validate format
    if (!ALLOWED_FORMATS.includes(file.type)) {
      setImageError(t('invalidFormat') || 'Invalid format. Only JPG, PNG, GIF, WEBP allowed.');
      return;
    }

    // Validate size
    if (file.size > MAX_IMAGE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setImageError(t('imageTooLarge') || `Image too large (${sizeMB}MB). Max 2MB allowed.`);
      return;
    }

    setImageLoading(true);
    setUploadProgress(20);

    // Use URL.createObjectURL for instant preview
    const previewUrl = URL.createObjectURL(file);
    setAvatar(previewUrl);
    setUploadProgress(50);

    // Convert to base64 for saving
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
      setImageLoading(false);
      setUploadProgress(100);
      // Clean up the object URL
      URL.revokeObjectURL(previewUrl);
      setTimeout(() => setUploadProgress(0), 500);
    };
    reader.onerror = () => {
      setImageError(t('imageReadFailed') || 'Failed to read image file');
      setImageLoading(false);
      setUploadProgress(0);
      URL.revokeObjectURL(previewUrl);
    };
    reader.readAsDataURL(file);
  }, [isReadOnly, isSaving, t]);

  // Early return AFTER all hooks
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || isSaving) return;

    // Validate name before submit
    const nameValidationError = validateName(name);
    if (nameValidationError) {
      setNameError(nameValidationError);
      return;
    }

    // Validate password if provided
    if (password.trim()) {
      const hasLetter = /[a-zA-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const isLongEnough = password.length >= 8;

      if (!isLongEnough) {
        setPasswordError(t('passwordTooShort'));
        return;
      }
      if (!hasLetter) {
        setPasswordError(t('passwordNeedsLetters'));
        return;
      }
      if (!hasNumber) {
        setPasswordError(t('passwordNeedsNumbers'));
        return;
      }
    }

    setIsSaving(true);

    // OPTIMISTIC UPDATE: Show success immediately for perceived speed
    const updateData: { name: string; role: string; avatar?: string; password?: string } = {
      name: name.trim(),
      role: role.trim(),
      avatar
    };

    if (password.trim()) {
      updateData.password = password;
    }

    try {
      await onUpdate(updateData);
      // Show success state briefly before closing
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 500); // Fast close after success animation
    } catch (error) {
      console.error('Failed to update profile:', error);
      // On error, show error state (button will stay enabled for retry)
      setIsSaving(false);
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl outline-none transition-all duration-200 border ${theme === 'dark'
    ? 'bg-gray-800 border-gray-700 text-white focus:border-[#0d9488] placeholder-gray-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#0d9488] placeholder-gray-400'
    } ${(isReadOnly || isSaving) ? 'opacity-50 cursor-not-allowed' : ''}`;

  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
    }`;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border animate-in fade-in zoom-in duration-200 ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
        }`}>
        {/* Header */}
        <div className={`px-6 py-5 border-b flex justify-between items-center ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'
          }`}>
          <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {t('editProfile')}
            {isReadOnly && (
              <span className="text-xs bg-gray-700 px-2 py-1 rounded ml-2 text-gray-400 font-normal">
                (Read Only)
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            disabled={isSaving}
            className={`p-1.5 rounded-lg transition-all ${theme === 'dark'
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Avatar Section */}
          <div className="flex justify-center mb-6">
            <div className={`relative group w-28 h-28 rounded-full overflow-hidden border-4 transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
              } ${(!isReadOnly && !isSaving) ? 'cursor-pointer hover:border-[#0d9488]' : ''}`}>

              {/* Loading overlay */}
              {(isSaving || imageLoading) && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                  <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}

              {/* Avatar image */}
              <img
                src={avatar}
                alt="Admin"
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'Admin')}`;
                }}
              />

              {/* Upload overlay */}
              {!isReadOnly && !isSaving && !imageLoading && (
                <>
                  <label
                    htmlFor="admin-avatar-upload"
                    className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <CameraIcon className="text-white w-8 h-8 mb-1" />
                    <span className="text-white text-xs font-medium">{t('uploadPhoto')}</span>
                  </label>
                  <input
                    id="admin-avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </>
              )}
            </div>
          </div>

          {/* Upload Progress Bar */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {/* Image Error */}
          {imageError && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${theme === 'dark' ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
              <span className="text-red-400">⚠️</span>
              <span className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>{imageError}</span>
            </div>
          )}

          {/* Name Input */}
          <div>
            <label className={labelClass}>{t('name')}</label>
            <input
              type="text"
              required
              value={name}
              onChange={handleNameChange}
              disabled={isReadOnly || isSaving}
              className={`${inputClass} font-medium ${nameError ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {nameError && (
              <p className="text-xs mt-1.5 text-red-400 flex items-center gap-1">
                <span>⚠️</span> {nameError}
              </p>
            )}
          </div>

          {/* Role Input */}
          <div>
            <label className={labelClass}>{t('role')}</label>
            <input
              type="text"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isReadOnly || isSaving}
              className={inputClass}
            />
          </div>

          {/* Current Password */}
          <div>
            <label className={labelClass}>{t('currentPassword')}</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={adminData.password || localStorage.getItem('avtorim_admin_password') || '••••••••'}
                disabled
                className={`${inputClass} pr-12 opacity-60`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                {showCurrentPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className={labelClass}>{t('newPassword')}</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                disabled={isReadOnly || isSaving}
                placeholder={t('passwordOptional')}
                className={`${inputClass} pr-12 ${passwordError ? 'border-red-500' : ''}`}
              />
              {!isReadOnly && !isSaving && (
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                  {showNewPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              )}
            </div>

            {/* Password error or hint */}
            {passwordError ? (
              <p className="text-xs mt-2 text-red-500">⚠️ {passwordError}</p>
            ) : (
              <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                💡 {t('strongPasswordHint')}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${theme === 'dark'
                ? 'text-gray-300 hover:bg-gray-800'
                : 'text-gray-600 hover:bg-gray-100'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {t('cancel')}
            </button>

            {!isReadOnly && (
              <button
                type="submit"
                disabled={isSaving || saveSuccess || !hasChanges || !!nameError}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${saveSuccess
                  ? 'bg-green-500 text-white cursor-default'
                  : isSaving || !hasChanges || !!nameError
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-[#0d9488] text-white hover:bg-[#0f766e] shadow-lg shadow-[#0d9488]/20 active:scale-95'
                  }`}
              >
                {saveSuccess ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>✓</span>
                  </>
                ) : isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('save')}...</span>
                  </>
                ) : (
                  t('save')
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminModal;
