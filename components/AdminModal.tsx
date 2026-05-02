import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CameraIcon, EyeIcon, EyeOffIcon, LockIcon, LogOutIcon, ChevronRightIcon, XIcon } from './Icons';
import { getAdminTelegramChatId, setAdminTelegramChatId } from '../services/telegramNotificationService';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminData: { name: string; role: string; avatar?: string; password?: string };
  onUpdate: (data: { name: string; role: string; avatar?: string; password?: string }) => Promise<void> | void;
  userRole: 'admin' | 'viewer';
  theme: 'light' | 'dark';
  onLogout?: () => void;
  onLock?: () => void;
  /** The currently authenticated admin's user ID — used to load/save Telegram chat ID */
  adminId?: string;
}

const Spinner = () => (
  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ── Logout confirmation — proper floating modal ────────────────────────────
const LogoutModal = ({
  isDark,
  onCancel,
  onConfirm,
}: {
  isDark: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => createPortal(
  <div
    className="fixed inset-0 z-[200] flex items-center justify-center p-6"
    style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', animation: 'fadeIn 0.12s ease-out' }}
  >
    <div
      className={`w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl border ${
        isDark ? 'bg-[#1a2236] border-white/[0.08]' : 'bg-white border-gray-200'
      }`}
      style={{ animation: 'popUp 0.18s cubic-bezier(0.34,1.56,0.64,1)' }}
    >
      {/* Icon */}
      <div className="flex flex-col items-center pt-8 pb-2 px-6 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
          isDark ? 'bg-red-500/15' : 'bg-red-50'
        }`}>
          <LogOutIcon className="w-7 h-7 text-red-500" />
        </div>
        <h3 className={`text-[18px] font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Tizimdan chiqish
        </h3>
        <p className={`text-[13px] leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Hisobingizdan chiqmoqchimisiz?<br />
          Barcha ma'lumotlaringiz saqlanib qoladi.
        </p>
      </div>

      {/* Divider */}
      <div className={`mx-6 mt-6 mb-0 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`} />

      {/* Actions */}
      <div className="flex">
        <button
          onClick={onCancel}
          className={`flex-1 py-4 text-[15px] font-semibold transition-colors border-r ${
            isDark
              ? 'text-gray-300 hover:bg-white/[0.04] border-white/[0.06]'
              : 'text-gray-700 hover:bg-gray-50 border-gray-100'
          }`}
        >
          Bekor
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-4 text-[15px] font-bold text-red-500 hover:bg-red-500/[0.06] transition-colors active:scale-[0.98]"
        >
          Chiqish
        </button>
      </div>
    </div>
  </div>,
  document.body
);

// ── Main profile panel ────────────────────────────────────────────────────
const AdminModal: React.FC<AdminModalProps> = ({
  isOpen, onClose, adminData, onUpdate, userRole, theme, onLogout, onLock, adminId,
}) => {
  const isReadOnly = userRole === 'viewer';
  const isDark = theme === 'dark';

  const [showLogoutModal, setShowLogoutModal]   = useState(false);
  const [name, setName]                         = useState(adminData.name);
  const [avatar, setAvatar]                     = useState(adminData.avatar);
  const [newPassword, setNewPassword]           = useState('');
  const [showCurrentPw, setShowCurrentPw]       = useState(false);
  const [showNewPw, setShowNewPw]               = useState(false);
  const [nameError, setNameError]               = useState('');
  const [pwError, setPwError]                   = useState('');
  const [imageError, setImageError]             = useState('');
  const [isSaving, setIsSaving]                 = useState(false);
  const [saveSuccess, setSaveSuccess]           = useState(false);
  const [imageLoading, setImageLoading]         = useState(false);
  const [uploadProgress, setUploadProgress]     = useState(0);

  // ── Telegram chat ID ─────────────────────────────────────────────────────
  const [telegramChatId, setTelegramChatId]     = useState('');
  const [tgSaving, setTgSaving]                 = useState(false);
  const [tgSaved, setTgSaved]                   = useState(false);
  const [tgError, setTgError]                   = useState('');
  const [tgLoading, setTgLoading]               = useState(false);
  // ─────────────────────────────────────────────────────────────────────────

  const hasChanges = avatar !== adminData.avatar || name !== adminData.name || newPassword.trim().length > 0;

  useEffect(() => {
    if (isOpen) {
      setShowLogoutModal(false);
      setName(adminData.name);
      setAvatar(adminData.avatar);
      setNewPassword('');
      setShowCurrentPw(false);
      setNameError('');
      setPwError('');
      setImageError('');
      setIsSaving(false);
      setSaveSuccess(false);
      setImageLoading(false);
      setUploadProgress(0);
      setTgSaved(false);
      setTgError('');

      // Load stored Telegram chat ID for this admin
      if (adminId) {
        setTgLoading(true);
        getAdminTelegramChatId(adminId)
          .then((id) => setTelegramChatId(id ?? ''))
          .catch(() => {})
          .finally(() => setTgLoading(false));
      }
    }
  }, [isOpen, adminData, adminId]);

  useEffect(() => {
    if (!isOpen || showLogoutModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, isSaving, onClose, showLogoutModal]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly || isSaving) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setImageError('JPG, PNG, GIF yoki WEBP kerak');
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
    if (newPassword.trim() && newPassword.length < 6) { setPwError('Parol kamida 6 ta belgi'); return; }
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

  const initials = adminData.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Shared styles
  const inputCls = `w-full rounded-[14px] px-4 py-3 text-[14px] font-medium outline-none transition-all ${
    isDark
      ? 'bg-[#0f1724] text-white placeholder-gray-600 focus:ring-2 focus:ring-teal-500/30'
      : 'bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500/20 focus:bg-white'
  }`;

  const sectionTitle = `text-[11px] font-bold uppercase tracking-[0.1em] mb-4 ${
    isDark ? 'text-white/30' : 'text-gray-400'
  }`;

  return createPortal(
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
        onClick={() => { if (!isSaving && !showLogoutModal) onClose(); }}
      />

      {/* ── Panel — slides in from the right ── */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[110] w-full max-w-[420px] flex flex-col shadow-2xl ${
          isDark ? 'bg-[#111827]' : 'bg-[#f5f5f7]'
        }`}
        style={{ animation: 'slideInRight 0.25s cubic-bezier(0.32,0.72,0,1)' }}
      >

        {/* ── Top nav bar ── */}
        <div className={`flex items-center justify-between px-5 pt-safe-top pt-4 pb-3 flex-shrink-0 ${
          isDark ? 'border-b border-white/[0.06]' : 'border-b border-black/[0.07]'
        } ${isDark ? 'bg-[#111827]' : 'bg-[#f5f5f7]'}`}>
          <h2 className={`text-[17px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Sozlamalar
          </h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isDark
                ? 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
                : 'bg-black/8 text-gray-500 hover:bg-black/12 hover:text-gray-700'
            }`}
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit}>

            {/* ── Profile hero card ── */}
            <div className={`mx-4 mt-4 rounded-[20px] overflow-hidden ${
              isDark ? 'bg-[#1c2333]' : 'bg-white'
            }`}>
              {/* Teal gradient banner */}
              <div className="h-20 bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600 relative">
                <div className="absolute inset-0 opacity-30"
                  style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, rgba(255,255,255,0.2) 0%, transparent 60%)' }} />
              </div>

              {/* Avatar + info */}
              <div className="px-5 pb-5">
                <div className="flex items-end gap-4 -mt-10 mb-0">
                  {/* Avatar with upload */}
                  <div className="relative group flex-shrink-0">
                    <div className={`w-[72px] h-[72px] rounded-[20px] overflow-hidden border-[3px] relative ${
                      isDark ? 'border-[#1c2333] bg-[#0f1724]' : 'border-white bg-gray-100'
                    } shadow-md`}>
                      {(isSaving || imageLoading) && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-[17px]">
                          <Spinner />
                        </div>
                      )}
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={adminData.name}
                          className="w-full h-full object-cover"
                          onError={e => { (e.currentTarget as HTMLImageElement).src = ''; setAvatar(undefined); }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-500 to-teal-700">
                          <span className="text-white text-xl font-black select-none">{initials}</span>
                        </div>
                      )}
                      {!isReadOnly && !isSaving && !imageLoading && (
                        <label
                          htmlFor="admin-avatar-upload"
                          className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[17px]"
                        >
                          <CameraIcon className="text-white w-5 h-5" />
                        </label>
                      )}
                    </div>
                    <input id="admin-avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </div>

                  {/* Name + role */}
                  <div className="pb-1 min-w-0">
                    <p className={`font-bold text-[17px] leading-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {adminData.name}
                    </p>
                    <span className={`mt-1 inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      adminData.role === 'super_admin'
                        ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                        : isDark ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-700'
                    }`}>
                      {roleLabel}
                    </span>
                  </div>
                </div>

                {/* Upload progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className={`mt-3 w-full h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                    <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
                {imageError && (
                  <p className="mt-2 text-xs text-red-500">{imageError}</p>
                )}
              </div>
            </div>

            {/* ── Personal info section ── */}
            <div className="mx-4 mt-6">
              <p className={sectionTitle}>Shaxsiy ma'lumotlar</p>
              <div className={`rounded-[20px] overflow-hidden ${isDark ? 'bg-[#1c2333]' : 'bg-white'}`}>
                <div className="px-4 py-3.5">
                  <label className={`block text-[12px] font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    To'liq ism
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); setNameError(''); }}
                    disabled={isReadOnly || isSaving}
                    placeholder="Ismingizni kiriting"
                    className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed ${
                      nameError ? 'ring-2 ring-red-500/40' : ''
                    }`}
                  />
                  {nameError && <p className="text-xs text-red-500 mt-1.5">{nameError}</p>}
                </div>
              </div>
            </div>

            {/* ── Security section ── */}
            <div className="mx-4 mt-6">
              <p className={sectionTitle}>Xavfsizlik</p>
              <div className={`rounded-[20px] overflow-hidden divide-y ${
                isDark ? 'bg-[#1c2333] divide-white/[0.05]' : 'bg-white divide-gray-100'
              }`}>
                {/* Current password — reveal on tap */}
                <div className="px-4 py-3.5">
                  <label className={`block text-[12px] font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Joriy parol
                  </label>
                  <div className={`flex items-center rounded-[14px] px-4 py-3 font-mono ${
                    isDark ? 'bg-[#0f1724] text-gray-300' : 'bg-gray-50 text-gray-700'
                  }`}>
                    <span className="flex-1 text-[15px] tracking-[0.15em] select-all">
                      {showCurrentPw
                        ? (adminData.password || '—')
                        : '•'.repeat(Math.max(6, (adminData.password || '••••••').length))}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(v => !v)}
                      className={`ml-2 p-1 rounded-lg transition-colors flex-shrink-0 ${
                        isDark ? 'text-gray-600 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title={showCurrentPw ? 'Yashirish' : 'Ko\'rsatish'}
                    >
                      {showCurrentPw
                        ? <EyeOffIcon className="w-4 h-4" />
                        : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New password */}
                {!isReadOnly && (
                  <div className="px-4 py-3.5">
                    <label className={`block text-[12px] font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Yangi parol
                      <span className={`ml-1.5 font-normal ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>(ixtiyoriy)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => { setNewPassword(e.target.value); setPwError(''); }}
                        disabled={isSaving}
                        placeholder="Yangi parol kiriting"
                        className={`${inputCls} pr-11 disabled:opacity-50 ${
                          pwError ? 'ring-2 ring-red-500/40' : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(v => !v)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${
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

            {/* ── Telegram Notifications section ── */}
            {!isReadOnly && adminId && (
              <div className="mx-4 mt-6">
                <p className={sectionTitle}>Telegram Xabarnomalar</p>
                <div className={`rounded-[20px] overflow-hidden ${isDark ? 'bg-[#1c2333]' : 'bg-white'}`}>
                  <div className="px-4 py-3.5">
                    {/* How to find your chat ID */}
                    <div className={`mb-3 p-3 rounded-[12px] text-[12px] leading-relaxed ${
                      isDark ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      <p className="font-semibold mb-1">📱 Chat ID ni qanday topish mumkin?</p>
                      <p>1. Telegramda <strong>@userinfobot</strong> ga {'/start'} yuboring</p>
                      <p>2. Bot sizning Chat ID ni yuboradi</p>
                      <p>3. Uni quyida kiriting va saqlang</p>
                    </div>

                    <label className={`block text-[12px] font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Telegram Chat ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tgLoading ? 'Yuklanmoqda…' : telegramChatId}
                        onChange={(e) => { setTelegramChatId(e.target.value); setTgSaved(false); setTgError(''); }}
                        disabled={tgLoading || tgSaving}
                        placeholder="Masalan: 123456789"
                        className={`flex-1 rounded-[14px] px-4 py-3 text-[14px] font-medium outline-none transition-all disabled:opacity-50 ${
                          isDark
                            ? 'bg-[#0f1724] text-white placeholder-gray-600 focus:ring-2 focus:ring-teal-500/30'
                            : 'bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500/20 focus:bg-white'
                        } ${tgError ? 'ring-2 ring-red-500/40' : ''}`}
                      />
                      <button
                        type="button"
                        disabled={!telegramChatId.trim() || tgSaving || tgLoading}
                        onClick={async () => {
                          if (!adminId || !telegramChatId.trim()) return;
                          setTgSaving(true); setTgError('');
                          try {
                            await setAdminTelegramChatId(adminId, telegramChatId.trim());
                            setTgSaved(true);
                            setTimeout(() => setTgSaved(false), 3000);
                          } catch (e: any) {
                            setTgError(e.message ?? 'Xatolik yuz berdi');
                          } finally {
                            setTgSaving(false);
                          }
                        }}
                        className={`px-4 py-3 rounded-[14px] text-[13px] font-bold transition-all flex-shrink-0 ${
                          tgSaved
                            ? 'bg-emerald-500 text-white'
                            : !telegramChatId.trim() || tgSaving || tgLoading
                            ? isDark ? 'bg-white/[0.05] text-gray-600 cursor-not-allowed' : 'bg-gray-200/70 text-gray-400 cursor-not-allowed'
                            : 'bg-teal-600 hover:bg-teal-500 text-white active:scale-[0.97]'
                        }`}
                      >
                        {tgSaved ? '✓' : tgSaving ? '…' : 'Saqlash'}
                      </button>
                    </div>
                    {tgError && <p className="text-xs text-red-500 mt-1.5">{tgError}</p>}
                    {tgSaved && <p className="text-xs text-emerald-500 mt-1.5">✅ Saqlandi! Endi har bir tranzaksiyada xabarnoma olasiz.</p>}
                    {telegramChatId && !tgSaved && !tgError && (
                      <p className={`text-xs mt-1.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                        Chat ID: <span className="font-mono font-semibold">{telegramChatId}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Save button ── */}
            {!isReadOnly && (
              <div className="mx-4 mt-5">
                <button
                  type="submit"
                  disabled={isSaving || saveSuccess || !hasChanges || !!nameError}
                  className={`w-full py-3.5 rounded-[16px] text-[15px] font-bold transition-all flex items-center justify-center gap-2 ${
                    saveSuccess
                      ? 'bg-emerald-500 text-white'
                      : !hasChanges || !!nameError
                      ? isDark
                        ? 'bg-white/[0.05] text-gray-600 cursor-not-allowed'
                        : 'bg-gray-200/70 text-gray-400 cursor-not-allowed'
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
                    <><Spinner />Saqlanmoqda…</>
                  ) : 'Saqlash'}
                </button>
              </div>
            )}

            {/* ── Account actions section ── */}
            <div className="mx-4 mt-6 mb-8">
              <p className={sectionTitle}>Hisob</p>
              <div className={`rounded-[20px] overflow-hidden divide-y ${
                isDark ? 'bg-[#1c2333] divide-white/[0.05]' : 'bg-white divide-gray-100'
              }`}>
                {/* Lock */}
                {onLock && (
                  <button
                    type="button"
                    onClick={onLock}
                    className={`w-full flex items-center gap-3.5 px-4 py-4 text-left transition-colors ${
                      isDark ? 'hover:bg-white/[0.04] active:bg-white/[0.06]' : 'hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isDark ? 'bg-blue-500/20' : 'bg-blue-50'
                    }`}>
                      <LockIcon className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[14px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Ekranni qulflash
                      </p>
                      <p className={`text-[12px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Parol bilan himoyalash
                      </p>
                    </div>
                    <ChevronRightIcon className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                  </button>
                )}

                {/* Logout */}
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => setShowLogoutModal(true)}
                    className={`w-full flex items-center gap-3.5 px-4 py-4 text-left transition-colors ${
                      isDark ? 'hover:bg-red-500/[0.06] active:bg-red-500/[0.10]' : 'hover:bg-red-50 active:bg-red-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isDark ? 'bg-red-500/20' : 'bg-red-50'
                    }`}>
                      <LogOutIcon className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-red-500">
                        Chiqish
                      </p>
                      <p className={`text-[12px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Tizimdan chiqish
                      </p>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 flex-shrink-0 text-red-400/60" />
                  </button>
                )}
              </div>
            </div>

          </form>
        </div>
      </div>

      {/* ── Logout confirmation modal ── */}
      {showLogoutModal && (
        <LogoutModal
          isDark={isDark}
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={() => { setShowLogoutModal(false); onClose(); onLogout?.(); }}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0);    opacity: 1;   }
        }
        @keyframes popUp {
          from { transform: scale(0.88) translateY(16px); opacity: 0; }
          to   { transform: scale(1)    translateY(0);    opacity: 1; }
        }
      `}</style>
    </>,
    document.body
  );
};

export default AdminModal;
