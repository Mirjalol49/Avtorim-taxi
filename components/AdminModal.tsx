import React, { useState, useEffect } from 'react';
import { XIcon, CameraIcon } from './Icons';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminData: { name: string; role: string; avatar: string };
  onUpdate: (data: { name: string; role: string; avatar: string }) => void;
  lang: Language;
  userRole: 'admin' | 'viewer';
}

const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, adminData, onUpdate, lang, userRole }) => {
  const [name, setName] = useState(adminData.name);
  const [role, setRole] = useState(adminData.role);
  const [avatar, setAvatar] = useState(adminData.avatar);
  const t = TRANSLATIONS[lang];
  const isReadOnly = userRole === 'viewer';

  useEffect(() => {
    if (isOpen) {
      setName(adminData.name);
      setRole(adminData.role);
      setAvatar(adminData.avatar);
    }
  }, [isOpen, adminData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    onUpdate({ name, role, avatar });
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

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-slate-900/50 px-6 py-5 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">{t.editProfile} {isReadOnly && <span className="text-xs bg-slate-700 px-2 py-1 rounded ml-2 text-slate-400 font-normal">(Read Only)</span>}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Avatar Preview */}
          <div className="flex justify-center mb-6">
            <div className={`relative group w-24 h-24 rounded-full overflow-hidden bg-slate-900 border-4 border-slate-700 ${!isReadOnly ? 'cursor-pointer hover:border-blue-500' : ''} transition-colors`}>
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
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.imageUrl}</label>
            <input
              type="text"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              disabled={isReadOnly}
              className={`w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white text-sm ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.name}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isReadOnly}
              className={`w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white font-medium ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.role}</label>
            <input
              type="text"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isReadOnly}
              className={`w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-300 hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors"
            >
              {isReadOnly ? t.cancel : t.cancel}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-500 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
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