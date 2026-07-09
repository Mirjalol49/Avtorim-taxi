import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, AlertCircleIcon, XIcon, ClockAlertIcon } from './Icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
    isClosing?: boolean;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (type: ToastType, message: string, duration?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, isClosing: true } : t));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
    }, []);

    const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        setToasts(prev => [...prev, { id, type, message, duration, isClosing: false }]);
        if (duration > 0) setTimeout(() => removeToast(id), duration);
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
        </ToastContext.Provider>
    );
};

interface ToastContainerProps {
    theme: 'light' | 'dark';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ theme }) => {
    const { toasts, removeToast } = useToast();
    const visibleToasts = toasts.slice(-5);

    return createPortal(
        <div
            className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 w-full max-w-[360px] pointer-events-none"
            role="region"
            aria-label="Notifications"
        >
            {visibleToasts.map(toast => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    theme={theme}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>,
        document.body
    );
};

const ACCENT: Record<ToastType, { bar: string; iconBg: string; icon: string; label: string }> = {
    success: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-500/15', icon: 'text-emerald-500', label: 'success' },
    error:   { bar: 'bg-red-500',     iconBg: 'bg-red-500/15',     icon: 'text-red-500',     label: 'error'   },
    warning: { bar: 'bg-amber-500',   iconBg: 'bg-amber-500/15',   icon: 'text-amber-500',   label: 'warning' },
    info:    { bar: 'bg-blue-500',    iconBg: 'bg-blue-500/15',    icon: 'text-blue-500',    label: 'info'    },
};

function ToastIcon({ type, className }: { type: ToastType; className?: string }) {
    const cls = `w-4.5 h-4.5 ${className}`;
    switch (type) {
        case 'success': return <CheckCircleIcon className={cls} />;
        case 'error':   return <AlertCircleIcon className={cls} />;
        case 'warning': return <ClockAlertIcon  className={cls} />;
        case 'info':    return <AlertCircleIcon className={cls} />;
    }
}

const ToastItem: React.FC<{ toast: Toast; theme: 'light' | 'dark'; onClose: () => void }> = ({ toast, theme, onClose }) => {
    const { t } = useTranslation();
    const [paused, setPaused] = useState(false);
    const isDark = theme === 'dark';
    const a = ACCENT[toast.type];

    return (
        <div
            className={`pointer-events-auto relative flex items-stretch rounded-2xl border overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.16)] transition-all duration-350 ease-out ${
                toast.isClosing
                    ? 'opacity-0 translate-x-4 scale-95'
                    : 'opacity-100 translate-x-0 scale-100'
            } ${isDark
                ? 'bg-surface border-white/[0.08]'
                : 'bg-white border-gray-200/80'
            }`}
            style={{
                animation: toast.isClosing ? undefined : 'toastSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}
            role={toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'}
            aria-live="polite"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {/* Left accent strip */}
            <div className={`w-1 flex-shrink-0 ${a.bar}`} />

            {/* Icon */}
            <div className="flex items-center pl-3.5 pr-1">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${a.iconBg}`}>
                    <ToastIcon type={toast.type} className={`w-4 h-4 ${a.icon}`} />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 py-3.5 pr-2 min-w-0">
                <p className={`text-[13px] font-bold leading-none mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {t(a.label)}
                </p>
                <p className={`text-[12px] leading-snug ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {toast.message}
                </p>
            </div>

            {/* Close */}
            <button
                onClick={onClose}
                className={`flex-shrink-0 flex items-center px-3 transition-colors ${
                    isDark ? 'text-gray-600 hover:text-gray-300' : 'text-gray-300 hover:text-gray-600'
                }`}
                aria-label="Close"
            >
                <XIcon className="w-3.5 h-3.5" />
            </button>

            {/* Progress bar */}
            {toast.duration && toast.duration > 0 && (
                <div
                    className={`absolute bottom-0 left-1 right-0 h-[2px] ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]'}`}
                >
                    <div
                        className={`h-full ${a.bar} opacity-60`}
                        style={{
                            animation: `toastProgress ${toast.duration}ms linear forwards`,
                            animationPlayState: paused ? 'paused' : 'running',
                        }}
                    />
                </div>
            )}

            <style>{`
                @keyframes toastSlideIn {
                    from { opacity: 0; transform: translateX(16px) scale(0.95); }
                    to   { opacity: 1; transform: translateX(0)    scale(1);    }
                }
                @keyframes toastProgress {
                    from { width: 100%; }
                    to   { width: 0%;   }
                }
            `}</style>
        </div>
    );
};
