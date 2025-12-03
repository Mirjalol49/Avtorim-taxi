import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
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

    const addToast = useCallback((type: ToastType, message: string, duration: number = 5000) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const newToast: Toast = { id, type, message, duration };

        setToasts(prev => [...prev, newToast]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

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

    const getToastStyles = (type: ToastType) => {
        const baseStyles = 'rounded-lg shadow-lg border backdrop-blur-sm';
        switch (type) {
            case 'success':
                return `${baseStyles} ${theme === 'dark'
                    ? 'bg-green-900/90 border-green-700 text-green-100'
                    : 'bg-green-50/90 border-green-200 text-green-900'}`;
            case 'error':
                return `${baseStyles} ${theme === 'dark'
                    ? 'bg-red-900/90 border-red-700 text-red-100'
                    : 'bg-red-50/90 border-red-200 text-red-900'}`;
            case 'warning':
                return `${baseStyles} ${theme === 'dark'
                    ? 'bg-yellow-900/90 border-yellow-700 text-yellow-100'
                    : 'bg-yellow-50/90 border-yellow-200 text-yellow-900'}`;
            case 'info':
                return `${baseStyles} ${theme === 'dark'
                    ? 'bg-blue-900/90 border-blue-700 text-blue-100'
                    : 'bg-blue-50/90 border-blue-200 text-blue-900'}`;
        }
    };

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success': return '✓';
            case 'error': return '✕';
            case 'warning': return '⚠';
            case 'info': return 'ℹ';
        }
    };

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`${getToastStyles(toast.type)} p-4 pr-10 relative animate-slide-in-right`}
                    role="alert"
                    aria-live="assertive"
                >
                    <div className="flex items-start gap-3">
                        <span className="text-lg font-bold flex-shrink-0 mt-0.5">
                            {getIcon(toast.type)}
                        </span>
                        <p className="text-sm font-medium flex-1">{toast.message}</p>
                    </div>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        aria-label="Close notification"
                    >
                        <span className="text-xs">✕</span>
                    </button>
                </div>
            ))}
        </div>
    );
};

// Add animation to index.css:
// @keyframes slide-in-right {
//   from {
//     transform: translateX(100%);
//     opacity: 0;
//   }
//   to {
//     transform: translateX(0);
//     opacity: 1;
//   }
// }
// .animate-slide-in-right {
//   animation: slide-in-right 0.3s ease-out;
// }
