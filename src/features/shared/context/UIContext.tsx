import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Language } from '../../../core/types';
import { TRANSLATIONS } from '../../../../translations';

interface UIContextType {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (typeof TRANSLATIONS)[Language];
    isMobile: boolean;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Theme State
    const [theme] = useState<'dark' | 'light'>('dark'); // Enforced Dark Mode as per App.tsx
    const { i18n } = useTranslation();

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('avtorim_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        // Theme toggle disabled - Dark mode enforced
    };

    // Language State
    const [language, setLanguageState] = useState<Language>((i18n.language as Language) || 'uz');

    // Derived state for legacy compatibility
    // Fallback to 'uz' if language is not one of the supported types
    const currentLang = (['uz', 'ru', 'en'].includes(language) ? language : 'uz') as Language;

    // Smart Fallback: Use Proxy to return Uzbek translation if missing in current lang
    const t = useMemo(() => {
        const target = TRANSLATIONS[currentLang];
        const fallback = TRANSLATIONS.uz;

        return new Proxy(target, {
            get: (obj, prop) => {
                // 1. Try selected language
                if (prop in obj) {
                    return obj[prop as keyof typeof obj];
                }
                // 2. Fallback to Uzbek
                if (prop in fallback) {
                    console.debug(`[i18n] Missing '${String(prop)}' in ${currentLang}, falling back to uz.`);
                    return fallback[prop as keyof typeof fallback];
                }
                // 3. Return key as last resort (helper for debugging)
                return String(prop);
            }
        });
    }, [currentLang]);

    const setLanguage = (lang: Language) => {
        i18n.changeLanguage(lang);
        setLanguageState(lang);
    };

    // Sync i18n language changes to local state
    useEffect(() => {
        const handleLanguageChanged = (lng: string) => {
            if (['uz', 'ru', 'en'].includes(lng)) {
                setLanguageState(lng as Language);
            }
        };
        i18n.on('languageChanged', handleLanguageChanged);
        return () => {
            i18n.off('languageChanged', handleLanguageChanged);
        };
    }, [i18n]);

    // Mobile State
    const [isMobile, setIsMobile] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <UIContext.Provider value={{
            theme,
            toggleTheme,
            language,
            setLanguage,
            t,
            isMobile,
            isSidebarOpen,
            setIsSidebarOpen
        }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUIContext = () => {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUIContext must be used within a UIProvider');
    }
    return context;
};
