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
      <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in-95 duration-300 border ${theme === 'dark' ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'
        }`}>
        <div className={`p-6 ${align === 'left' ? 'text-left' : 'text-center'}`}>
          {showIcon && (
            <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${isDanger
              ? 'bg-red-100 text-red-600'
              : theme === 'dark' ? 'bg-[#0f766e]/20 text-[#0f766e]' : 'bg-[#0f766e]/10 text-[#0f766e]'
              }`}>
              <SirenIcon className="h-6 w-6" />
            </div>
          )}
          <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
          <p className={`text-sm mb-6 whitespace-pre-line ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{message}</p>

          <div className={`flex gap-3 ${align === 'left' ? 'justify-end' : 'justify-center'}`}>
            <button
              onClick={onCancel}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors min-w-[100px] ${theme === 'dark' ? 'bg-surface-2 text-gray-300 hover:bg-white/[0.06]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {cancelLabel || t('cancel')}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-all min-w-[100px] ${isDanger
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-[#0f766e] hover:bg-teal-700'
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