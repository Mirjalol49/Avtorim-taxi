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
  theme: 'light' | 'dark';
}

const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, adminData, onUpdate, lang, userRole, theme }) => {
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

  const inputClass = `w-full px-4 py-3 rounded-xl outline-none transition-all border ${theme === 'dark'
    ? 'bg-gray-800 border-gray-700 text-white focus:border-[#2D6A76] placeholder-gray-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#2D6A76] placeholder-gray-400'
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
              } ${!isReadOnly ? 'cursor-pointer hover:border-[#2D6A76]' : ''}`}>
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
                className="px-6 py-2.5 bg-[#2D6A76] text-white hover:bg-[#235560] rounded-xl text-sm font-bold shadow-lg shadow-[#2D6A76]/20 active:scale-95 transition-all"
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