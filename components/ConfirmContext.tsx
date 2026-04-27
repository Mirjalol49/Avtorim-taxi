import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ConfirmModal from './ConfirmModal';

export interface ConfirmOptions {
    title: string;
    message: string;
    isDanger?: boolean;
    confirmLabel?: string;
    cancelLabel?: string;
    showIcon?: boolean;
    align?: 'center' | 'left';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export const useConfirm = (): ConfirmFn => {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
    return ctx;
};

interface ConfirmProviderProps {
    theme: 'light' | 'dark';
    children: React.ReactNode;
}

export const ConfirmProvider: React.FC<ConfirmProviderProps> = ({ theme, children }) => {
    const [state, setState] = useState<(ConfirmOptions & { isOpen: boolean }) | null>(null);
    const resolveRef = useRef<((v: boolean) => void) | null>(null);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise(resolve => {
            resolveRef.current = resolve;
            setState({ ...options, isOpen: true });
        });
    }, []);

    const handleConfirm = () => {
        resolveRef.current?.(true);
        setState(null);
    };

    const handleCancel = () => {
        resolveRef.current?.(false);
        setState(null);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {state?.isOpen && (
                <ConfirmModal
                    isOpen={state.isOpen}
                    title={state.title}
                    message={state.message}
                    isDanger={state.isDanger ?? true}
                    confirmLabel={state.confirmLabel}
                    cancelLabel={state.cancelLabel}
                    showIcon={state.showIcon}
                    align={state.align}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    theme={theme}
                />
            )}
        </ConfirmContext.Provider>
    );
};
