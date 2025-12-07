import React from 'react';
import { useTranslation } from 'react-i18next';
import { SirenIcon } from './Icons';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  // lang removed
  isDanger?: boolean;
  theme: 'light' | 'dark';
  showIcon?: boolean;
  align?: 'center' | 'left';
  confirmLabel?: string;
  cancelLabel?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isDanger = false,
  theme,
  showIcon = true,
  align = 'center',
  confirmLabel,
  cancelLabel
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in-95 duration-300 border ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
        }`}>
        <div className={`p-6 ${align === 'left' ? 'text-left' : 'text-center'}`}>
          {showIcon && (
            <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${isDanger
              ? 'bg-red-100 text-red-600'
              : theme === 'dark' ? 'bg-[#0d9488]/20 text-[#0d9488]' : 'bg-[#0d9488]/10 text-[#0d9488]'
              }`}>
              <SirenIcon className="h-6 w-6" />
            </div>
          )}
          <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
          <p className={`text-sm mb-6 whitespace-pre-line ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{message}</p>

          <div className={`flex gap-3 ${align === 'left' ? 'justify-end' : 'justify-center'}`}>
            <button
              onClick={onCancel}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors min-w-[100px] ${theme === 'dark' ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {cancelLabel || t('cancel')}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all min-w-[100px] ${isDanger
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                : 'bg-[#0d9488] hover:bg-[#0f766e] shadow-[#0d9488]/20'
                }`}
            >
              {confirmLabel || t('confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;