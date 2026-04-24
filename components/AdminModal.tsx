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

type View = 'profile' | 'logout-confirm';

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

  const [view, setView]                       = useState<View>('profile');
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
      setView('profile');
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
      setImageError('JPG, PNG, GIF yoki WEBP formatida bo\'lishi kerak');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImageError('Rasm 2MB dan kichik bo\'lishi kerak');
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

  const roleLabel = adminData.role === 'super_admin' ? 'Super Admin' : adminData.role === 'admin' ? 'Admin' : adminData.role;
  const roleColor = adminData.role === 'super_admin' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : adminData.role === 'admin' ? 'bg-teal-500/20 text-teal-400 border-teal-500/30'
    : 'bg-[#181A24] text-gray-400 border-white/[0.08]';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget && !isSaving) onClose(); }}
      style={{ animation: 'fadeIn 0.15s ease-out' }}
    >
      <div
        className="w-full max-w-sm bg-[#11131B] border border-white/[0.06] rounded-[2rem] shadow-2xl overflow-hidden"
        style={{ animation: 'modalPop 0.2s ease-out' }}
      >
        {view === 'profile' ? (
          <>
            {/* Header */}
            <div className="relative px-6 pt-6 pb-0 flex justify-end">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.04] transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center px-6 pb-5">
              <div className="relative group mb-4">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/[0.08] bg-[#181A24] relative">
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
                      (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'A')}`;
                    }}
                  />
                  {!isReadOnly && !isSaving && !imageLoading && (
                    <label
                      htmlFor="admin-avatar-upload"
                      className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl"
                    >
                      <CameraIcon className="text-white w-6 h-6" />
                      <span className="text-white text-[10px] mt-1 font-medium">Rasm</span>
                    </label>
                  )}
                </div>
                <input id="admin-avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                {/* Online dot */}
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-teal-500 border-2 border-[#11131B] rounded-full" />
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full h-0.5 bg-[#181A24] rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}

              <p className="text-white font-bold text-lg leading-none">{adminData.name}</p>
              <span className={`mt-2 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${roleColor}`}>
                {roleLabel}
              </span>
              {imageError && (
                <p className="mt-2 text-xs text-red-400 text-center">{imageError}</p>
              )}
            </div>

            <div className="h-px border-white/[0.05] mx-6" />

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">F.I.SH</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setNameError(''); }}
                  disabled={isReadOnly || isSaving}
                  className="w-full bg-[#0B0C13]/40 border border-white/[0.06] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 transition-colors placeholder-gray-500 disabled:opacity-50"
                />
                {nameError && <p className="text-xs text-red-400 mt-1">{nameError}</p>}
              </div>

              {/* Current Password (display only) */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Joriy parol</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={adminData.password || '••••••••'}
                    disabled
                    className="w-full bg-[#0B0C13]/20 border border-white/[0.05] rounded-xl px-4 py-2.5 text-gray-400 text-sm font-mono pr-10 opacity-70"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    {showCurrentPw ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              {!isReadOnly && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">Yangi parol</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setPwError(''); }}
                      disabled={isSaving}
                      placeholder="(ixtiyoriy - faqat o'zgartirish uchun)"
                      className={`w-full bg-[#0B0C13]/40 border rounded-xl px-4 py-2.5 text-white text-sm pr-10 focus:outline-none transition-colors placeholder-gray-500 disabled:opacity-50 ${pwError ? 'border-red-500' : 'border-white/[0.06] focus:border-teal-500'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                    >
                      {showNewPw ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  {pwError
                    ? <p className="text-xs text-red-400 mt-1">{pwError}</p>
                    : <p className="text-xs text-gray-600 mt-1">💡 Kuchli parol ishlating (kamida 6 ta belgi)</p>
                  }
                </div>
              )}

              {/* Save button */}
              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={isSaving || saveSuccess || !hasChanges || !!nameError}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${saveSuccess
                    ? 'bg-green-500 text-white'
                    : !hasChanges || !!nameError
                      ? 'bg-[#181A24] text-gray-600 cursor-not-allowed'
                      : 'bg-teal-500 hover:bg-teal-600 text-white shadow-sm active:scale-95'
                    }`}
                >
                  {saveSuccess ? (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Saqlandi</>
                  ) : isSaving ? (
                    <><Spinner /> Saqlanmoqda...</>
                  ) : 'Saqlash'}
                </button>
              )}
            </form>

            <div className="h-px border-white/[0.05] mx-6" />

            {/* Lock & Logout */}
            <div className="px-6 py-4 flex gap-3">
              {onLock && (
                <button
                  onClick={onLock}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#181A24] border border-white/[0.08] text-gray-300 hover:text-white hover:border-white/[0.08] transition-all text-sm font-semibold group shadow-sm"
                >
                  <LockIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Qulflash
                </button>
              )}
              {onLogout && (
                <button
                  onClick={() => setView('logout-confirm')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all text-sm font-semibold group"
                >
                  <LogOutIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  Chiqish
                </button>
              )}
            </div>
          </>
        ) : (
          /* Logout confirmation */
          <div className="p-8 flex flex-col items-center text-center" style={{ animation: 'modalPop 0.18s ease-out' }}>
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center mb-5">
              <LogOutIcon className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">Chiqishni tasdiqlang</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Hisobdan chiqmoqchimisiz?<br />
              Barcha saqlangan ma'lumotlar saqlanadi.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setView('profile')}
                className="flex-1 py-3 rounded-xl bg-[#181A24] border border-white/[0.08] text-gray-200 hover:text-white hover:bg-white/[0.06] transition-all font-semibold text-sm shadow-sm"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => { onClose(); onLogout?.(); }}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all text-sm active:scale-95"
              >
                Ha, chiqish
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>,
    document.body
  );
};

export default AdminModal;
