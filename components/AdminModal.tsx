import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, CameraIcon, EyeIcon, EyeOffIcon, LockIcon, LogOutIcon } from './Icons';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminData: { name: string; role: string; avatar?: string; password?: string };
  onUpdate: (data: { name: string; role: string; avatar?: string; password?: string }) => Promise<void> | void;
  userRole: 'admin' | 'viewer';
  theme: 'light' | 'dark';
  onLogout?: () => void;
  onLock?: () => void;
}

const Spinner = () => (
  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const AdminModal: React.FC<AdminModalProps> = ({
  isOpen, onClose, adminData, onUpdate, userRole, theme, onLogout, onLock,
}) => {
  const isReadOnly = userRole === 'viewer';
  const isDark = theme === 'dark';

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [name, setName]                       = useState(adminData.name);
  const [avatar, setAvatar]                   = useState(adminData.avatar);
  const [newPassword, setNewPassword]         = useState('');
  const [showNewPw, setShowNewPw]             = useState(false);
  const [showCurrentPw, setShowCurrentPw]     = useState(false);
  const [nameError, setNameError]             = useState('');
  const [pwError, setPwError]                 = useState('');
  const [imageError, setImageError]           = useState('');
  const [isSaving, setIsSaving]               = useState(false);
  const [saveSuccess, setSaveSuccess]         = useState(false);
  const [imageLoading, setImageLoading]       = useState(false);
  const [uploadProgress, setUploadProgress]   = useState(0);

  const hasChanges = avatar !== adminData.avatar || name !== adminData.name || newPassword.trim().length > 0;

  useEffect(() => {
    if (isOpen) {
      setShowLogoutConfirm(false);
      setName(adminData.name);
      setAvatar(adminData.avatar);
      setNewPassword('');
      setNameError('');
      setPwError('');
      setImageError('');
      setIsSaving(false);
      setSaveSuccess(false);
      setImageLoading(false);
      setUploadProgress(0);
    }
  }, [isOpen, adminData]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving && isOpen) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, isSaving, onClose]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly || isSaving) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setImageError("JPG, PNG, GIF yoki WEBP formatida bo'lishi kerak");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImageError("Rasm 2MB dan kichik bo'lishi kerak");
      return;
    }
    setImageLoading(true);
    setUploadProgress(30);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
      setImageLoading(false);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 500);
    };
    reader.onerror = () => { setImageLoading(false); setUploadProgress(0); };
    reader.readAsDataURL(file);
  }, [isReadOnly, isSaving]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || isSaving) return;
    if (name.trim().length < 2) { setNameError('Ism kamida 2 ta belgi'); return; }
    if (newPassword.trim()) {
      if (newPassword.length < 6) { setPwError('Parol kamida 6 ta belgi'); return; }
    }
    setIsSaving(true);
    try {
      const payload: { name: string; role: string; avatar?: string; password?: string } = {
        name: name.trim(),
        role: adminData.role,
        avatar,
      };
      if (newPassword.trim()) payload.password = newPassword;
      await onUpdate(payload);
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); onClose(); }, 700);
    } catch {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const roleLabel = adminData.role === 'super_admin' ? 'Super Admin'
    : adminData.role === 'admin' ? 'Admin'
    : adminData.role;

  const roleColor = adminData.role === 'super_admin'
    ? isDark
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
      : 'bg-amber-50 text-amber-700 border-amber-200'
    : adminData.role === 'admin'
    ? isDark
      ? 'bg-teal-500/15 text-teal-400 border-teal-500/25'
      : 'bg-teal-50 text-teal-700 border-teal-200'
    : isDark
    ? 'bg-white/[0.05] text-gray-400 border-white/[0.08]'
    : 'bg-gray-100 text-gray-600 border-gray-200';

  const inputCls = `w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all border-2 ${
    isDark
      ? 'bg-[#2C2C2E] border-white/10 text-white placeholder-gray-600 focus:border-teal-500/70 focus:bg-[#161616]'
      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10'
  }`;

  const sectionCls = `rounded-2xl border p-5 ${
    isDark ? 'bg-[#2C2C2E] border-white/[0.06]' : 'bg-gray-50/80 border-gray-200/60'
  }`;

  const labelCls = `text-[11px] font-bold uppercase tracking-widest mb-1.5 block ${
    isDark ? 'text-gray-500' : 'text-gray-400'
  }`;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget && !isSaving) onClose(); }}
      style={{ animation: 'fadeIn 0.15s ease-out' }}
    >
      <div
        className={`w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDark ? 'bg-[#1C1C1E] border border-white/[0.06]' : 'bg-white border border-gray-200/80'
        }`}
        style={{ animation: 'modalPop 0.2s ease-out' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${
          isDark ? 'border-white/[0.05]' : 'border-gray-100'
        }`}>
          <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Profil sozlamalari
          </h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {/* Banner + Avatar */}
          <div className="relative">
            <div className="h-24 bg-gradient-to-r from-teal-800 via-teal-700 to-teal-600" />
            <div className="px-6 pb-4">
              <div className="flex items-end gap-4 -mt-10 mb-3">
                <div className="relative group flex-shrink-0">
                  <div className={`w-20 h-20 rounded-2xl overflow-hidden border-4 relative ${
                    isDark ? 'border-[#181818] bg-[#2C2C2E]' : 'border-white bg-gray-100'
                  }`}>
                    {(isSaving || imageLoading) && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                        <Spinner />
                      </div>
                    )}
                    <img
                      src={avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'A')}`}
                      alt={name}
                      className="w-full h-full object-cover"
                      onError={e => {
                        (e.currentTarget as HTMLImageElement).src =
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'A')}`;
                      }}
                    />
                    {!isReadOnly && !isSaving && !imageLoading && (
                      <label
                        htmlFor="admin-avatar-upload"
                        className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <CameraIcon className="text-white w-5 h-5" />
                        <span className="text-white text-[9px] mt-0.5 font-semibold">Rasm</span>
                      </label>
                    )}
                  </div>
                  <span className={`absolute -bottom-1 -right-1 w-4 h-4 bg-teal-500 rounded-full border-2 ${
                    isDark ? 'border-[#181818]' : 'border-white'
                  }`} />
                  <input id="admin-avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
                <div className="pb-1">
                  <p className={`font-bold text-base leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {adminData.name}
                  </p>
                  <span className={`mt-1 inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border ${roleColor}`}>
                    {roleLabel}
                  </span>
                </div>
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className={`w-full h-1 rounded-full overflow-hidden mb-1 ${isDark ? 'bg-[#2C2C2E]' : 'bg-gray-100'}`}>
                  <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
              {imageError && <p className="text-xs text-red-500 mt-1">{imageError}</p>}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
            {/* Personal info section */}
            <div className={sectionCls}>
              <p className={`text-[11px] font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Shaxsiy ma'lumotlar
              </p>
              <div>
                <label className={labelCls}>F.I.SH</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setNameError(''); }}
                  disabled={isReadOnly || isSaving}
                  placeholder="To'liq ismingiz"
                  className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed ${nameError ? (isDark ? '!border-red-500/60' : '!border-red-400') : ''}`}
                />
                {nameError && <p className="text-xs text-red-500 mt-1.5">{nameError}</p>}
              </div>
            </div>

            {/* Security section */}
            <div className={sectionCls}>
              <p className={`text-[11px] font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Xavfsizlik
              </p>
              <div className="space-y-3">
                {/* Current password */}
                <div>
                  <label className={labelCls}>Joriy parol</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={adminData.password || '••••••••'}
                      disabled
                      className={`w-full rounded-xl px-4 py-3 text-sm font-mono pr-10 border-2 outline-none opacity-60 ${
                        isDark
                          ? 'bg-[#0d0d0d] border-white/[0.06] text-gray-400'
                          : 'bg-gray-100 border-gray-200 text-gray-600'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(v => !v)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                        isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {showCurrentPw ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New password */}
                {!isReadOnly && (
                  <div>
                    <label className={labelCls}>Yangi parol</label>
                    <div className="relative">
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => { setNewPassword(e.target.value); setPwError(''); }}
                        disabled={isSaving}
                        placeholder="(ixtiyoriy — faqat o'zgartirish uchun)"
                        className={`${inputCls} pr-10 disabled:opacity-50 ${pwError ? (isDark ? '!border-red-500/60' : '!border-red-400') : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(v => !v)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                          isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {showNewPw ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                    {pwError
                      ? <p className="text-xs text-red-500 mt-1.5">{pwError}</p>
                      : <p className={`text-xs mt-1.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                          Kamida 6 ta belgi
                        </p>
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Save button */}
            {!isReadOnly && (
              <button
                type="submit"
                disabled={isSaving || saveSuccess || !hasChanges || !!nameError}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  saveSuccess
                    ? 'bg-emerald-500 text-white'
                    : !hasChanges || !!nameError
                    ? isDark
                      ? 'bg-[#2C2C2E] text-gray-600 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-500 text-white shadow-sm active:scale-[0.98]'
                }`}
              >
                {saveSuccess ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Saqlandi
                  </>
                ) : isSaving ? (
                  <><Spinner /> Saqlanmoqda...</>
                ) : 'Saqlash'}
              </button>
            )}

            {/* Account actions section */}
            <div className={sectionCls}>
              <p className={`text-[11px] font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Hisob amallar
              </p>

              {showLogoutConfirm ? (
                <div className={`rounded-xl p-4 border ${isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                  <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                    Chiqishni tasdiqlang
                  </p>
                  <p className={`text-xs mb-3 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    Hisobdan chiqmoqchimisiz? Barcha ma'lumotlar saqlanadi.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(false)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        isDark
                          ? 'bg-white/[0.05] text-gray-300 hover:bg-white/[0.08]'
                          : 'bg-white text-gray-700 hover:bg-black/[0.03] border border-gray-200'
                      }`}
                    >
                      Bekor
                    </button>
                    <button
                      type="button"
                      onClick={() => { onClose(); onLogout?.(); }}
                      className="flex-1 py-2 rounded-lg text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-colors active:scale-95"
                    >
                      Ha, chiqish
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  {onLock && (
                    <button
                      type="button"
                      onClick={onLock}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all group ${
                        isDark
                          ? 'bg-[#1C1C1E] border-white/[0.08] text-gray-400 hover:text-white hover:border-white/[0.15]'
                          : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
                      }`}
                    >
                      <LockIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Qulflash
                    </button>
                  )}
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-red-500/25 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 transition-all group"
                    >
                      <LogOutIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      Chiqish
                    </button>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalPop { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>,
    document.body
  );
};

export default AdminModal;
