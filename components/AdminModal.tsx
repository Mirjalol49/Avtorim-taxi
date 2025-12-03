import React, { useState, useEffect } from 'react';
import { XIcon, CameraIcon, EyeIcon, EyeOffIcon } from './Icons';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminData: { name: string; role: string; avatar: string };
  onUpdate: (data: { name: string; role: string; avatar: string; password?: string }) => void;
  lang: Language;
  userRole: 'admin' | 'viewer';
  theme: 'light' | 'dark';
}

const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, adminData, onUpdate, lang, userRole, theme }) => {
  const [name, setName] = useState(adminData.name);
  const [role, setRole] = useState(adminData.role);
  const [avatar, setAvatar] = useState(adminData.avatar);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const t = TRANSLATIONS[lang];
  const isReadOnly = userRole === 'viewer';

  useEffect(() => {
    if (isOpen) {
      setName(adminData.name);
      setRole(adminData.role);
      setAvatar(adminData.avatar);
      setPassword(''); // Reset password field when modal opens
      setPasswordError(''); // Reset password error
    }
  }, [isOpen, adminData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    // Validate password if it's being changed
    if (password.trim()) {
      const hasLetter = /[a-zA-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const isLongEnough = password.length >= 8;

      if (!isLongEnough) {
        setPasswordError(t.passwordTooShort || 'Password must be at least 8 characters');
        return;
      }
      if (!hasLetter) {
        setPasswordError(t.passwordNeedsLetters || 'Password must contain letters');
        return;
      }
      if (!hasNumber) {
        setPasswordError(t.passwordNeedsNumbers || 'Password must contain numbers');
        return;
      }
    }

    const updateData: { name: string; role: string; avatar: string; password?: string } = {
      name,
      role,
      avatar
    };
    // Only include password if it was entered and is valid
    if (password.trim()) {
      updateData.password = password;
    }
    onUpdate(updateData);
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl outline-none transition-all border ${theme === 'dark'
    ? 'bg-gray-800 border-gray-700 text-white focus:border-[#0d9488] placeholder-gray-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#0d9488] placeholder-gray-400'
    } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`;

  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
    }`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200 border ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
        }`}>
        <div className={`px-6 py-5 border-b flex justify-between items-center ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'
          }`}>
          <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {t.editProfile} {isReadOnly && <span className="text-xs bg-gray-700 px-2 py-1 rounded ml-2 text-gray-400 font-normal">(Read Only)</span>}
          </h3>
          <button onClick={onClose} className={`transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
            }`}>
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Avatar Preview */}
          <div className="flex justify-center mb-6">
            <div className={`relative group w-24 h-24 rounded-full overflow-hidden border-4 transition-colors ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
              } ${!isReadOnly ? 'cursor-pointer hover:border-[#0d9488]' : ''}`}>
              <img src={avatar} alt="Admin" className="w-full h-full object-cover" />

              {!isReadOnly && (
                <>
                  <label htmlFor="admin-avatar-upload" className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]">
                    <CameraIcon className="text-white w-8 h-8" />
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


          <div>
            <label className={labelClass}>{t.name}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isReadOnly}
              className={`${inputClass} font-medium`}
            />
          </div>

          <div>
            <label className={labelClass}>{t.role}</label>
            <input
              type="text"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isReadOnly}
              className={inputClass}
            />
          </div>

          {/* Current Password Display */}
          <div>
            <label className={labelClass}>{t.currentPassword}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={localStorage.getItem('avtorim_admin_password') || 'mirjalol4941'}
                disabled
                className={`${inputClass} pr-12 opacity-75`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className={labelClass}>{t.newPassword}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(''); // Clear error when user types
                }}
                disabled={isReadOnly}
                placeholder={t.passwordOptional}
                className={`${inputClass} pr-12 ${passwordError ? 'border-red-500' : ''}`}
              />
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                  {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              )}
            </div>
            {/* Password error message */}
            {passwordError && (
              <p className="text-xs mt-2 text-red-500">
                ⚠️ {passwordError}
              </p>
            )}
            {/* Password strength hint */}
            {!passwordError && (
              <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                💡 {t.strongPasswordHint}
              </p>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              {t.cancel}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#0d9488] text-white hover:bg-[#0f766e] rounded-xl text-sm font-bold shadow-lg shadow-[#0d9488]/20 active:scale-95 transition-all"
              >
                {t.save}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminModal;