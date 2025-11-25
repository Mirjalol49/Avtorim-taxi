import React from 'react';
import { XIcon, SirenIcon } from './Icons';
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
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onConfirm, onCancel, lang, isDanger = false }) => {
  const t = TRANSLATIONS[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
        <div className="p-6 text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${isDanger ? 'bg-red-900/30 text-red-500' : 'bg-blue-900/30 text-blue-500'}`}>
            <SirenIcon className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
          <p className="text-sm text-slate-400 mb-6">{message}</p>
          
          <div className="flex gap-3 justify-center">
            <button
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors w-full"
            >
              {t.cancel}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all w-full ${isDanger ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'}`}
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