import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, isClosing: true } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 300); // Match animation duration
    }, []);

    const addToast = useCallback((type: ToastType, message: string, duration: number = 4000) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const newToast: Toast = { id, type, message, duration, isClosing: false };

        setToasts(prev => [...prev, newToast]);

        // No notification sound - only login sounds are enabled

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
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

    // Limit to 5 toasts to prevent clutter
    const visibleToasts = toasts.slice(-5);

    return (
        <div
            className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none"
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
        </div>
    );
};

const ToastItem: React.FC<{ toast: Toast; theme: 'light' | 'dark'; onClose: () => void }> = ({ toast, theme, onClose }) => {
    const [isPaused, setIsPaused] = useState(false);

    const getStyles = (type: ToastType) => {
        const isDark = theme === 'dark';
        const base = "relative overflow-hidden rounded-2xl border p-4 shadow-lg backdrop-blur-md transition-all duration-300 ease-out pointer-events-auto";

        switch (type) {
            case 'success':
                return isDark
                    ? `${base} bg-emerald-900/80 border-emerald-500/30 text-emerald-100 shadow-emerald-900/20`
                    : `${base} bg-white/90 border-emerald-200 text-emerald-900 shadow-emerald-100`;
            case 'error':
                return isDark
                    ? `${base} bg-red-900/80 border-red-500/30 text-red-100 shadow-red-900/20`
                    : `${base} bg-white/90 border-red-200 text-red-900 shadow-red-100`;
            case 'warning':
                return isDark
                    ? `${base} bg-amber-900/80 border-amber-500/30 text-amber-100 shadow-amber-900/20`
                    : `${base} bg-white/90 border-amber-200 text-amber-900 shadow-amber-100`;
            case 'info':
                return isDark
                    ? `${base} bg-blue-900/80 border-blue-500/30 text-blue-100 shadow-blue-900/20`
                    : `${base} bg-white/90 border-blue-200 text-blue-900 shadow-blue-100`;
        }
    };

    const getIcon = (type: ToastType) => {
        const className = "w-6 h-6 shrink-0";
        switch (type) {
            case 'success': return <CheckCircleIcon className={`${className} text-emerald-500`} />;
            case 'error': return <AlertCircleIcon className={`${className} text-red-500`} />;
            case 'warning': return <ClockAlertIcon className={`${className} text-amber-500`} />;
            case 'info': return <AlertCircleIcon className={`${className} text-blue-500`} />;
        }
    };

    return (
        <div
            className={`
                ${getStyles(toast.type)}
                ${toast.isClosing ? 'opacity-0 translate-x-full scale-95' : 'opacity-100 translate-x-0 scale-100 animate-slide-in-right'}
                hover:scale-[1.02] active:scale-[0.98]
            `}
            role={toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'}
            aria-live="polite"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            dir="auto"
        >
            <div className="flex items-start gap-4">
                {getIcon(toast.type)}
                <div className="flex-1 pt-0.5">
                    <p className="font-semibold text-sm leading-5">
                        {toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}
                    </p>
                    <p className="text-sm opacity-90 mt-1 leading-relaxed">
                        {toast.message}
                    </p>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className={`
                        shrink-0 rounded-lg p-1.5 transition-colors
                        ${theme === 'dark' ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-black/5 text-black/40 hover:text-black'}
                    `}
                    aria-label="Close"
                >
                    <XIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Progress Bar */}
            {toast.duration && toast.duration > 0 && (
                <div className="absolute bottom-0 left-0 h-1 w-full bg-current opacity-10">
                    <style>{`
                        @keyframes shrink {
                            from { width: 100%; }
                            to { width: 0%; }
                        }
                    `}</style>
                    <div
                        className="h-full bg-current opacity-40"
                        style={{
                            animation: `shrink ${toast.duration}ms linear forwards`,
                            animationPlayState: isPaused ? 'paused' : 'running'
                        }}
                    />
                </div>
            )}
        </div>
    );
};
