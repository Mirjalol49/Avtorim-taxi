import React from 'react';
import { SirenIcon } from './Icons';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  lang: Language;
  isDanger?: boolean;
  theme: 'light' | 'dark';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onConfirm, onCancel, lang, isDanger = false, theme }) => {
  const t = TRANSLATIONS[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 border ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
        }`}>
        <div className="p-6 text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${isDanger
              ? 'bg-red-100 text-red-600'
              : theme === 'dark' ? 'bg-[#2D6A76]/20 text-[#2D6A76]' : 'bg-[#2D6A76]/10 text-[#2D6A76]'
            }`}>
            <SirenIcon className="h-6 w-6" />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
          <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{message}</p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={onCancel}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors w-full ${theme === 'dark' ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {t.cancel}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all w-full ${isDanger
                  ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                  : 'bg-[#2D6A76] hover:bg-[#235560] shadow-[#2D6A76]/20'
                }`}
            >
              {t.confirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;