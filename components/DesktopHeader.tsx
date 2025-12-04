import React, { useState, useRef, useEffect } from 'react';
import {
  GlobeIcon, SunIcon, MoonIcon, ChevronDownIcon, PlusIcon
} from './Icons';
import { Language, Tab } from '../types';
import { TRANSLATIONS } from '../translations';

interface DesktopHeaderProps {
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  activeTab: Tab;
  isMobile: boolean;
  onNewTransactionClick: () => void;
  onAddDriverClick: () => void;
  userRole: 'admin' | 'viewer';
}

const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  theme,
  onThemeToggle,
  language,
  onLanguageChange,
  activeTab,
  isMobile,
  onNewTransactionClick,
  onAddDriverClick,
  userRole
}) => {
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[language];

  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };

    if (isLangMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isLangMenuOpen]);

  // Only show desktop header on larger screens
  if (isMobile) return null;

  const getTabTitle = () => {
    switch (activeTab) {
      case Tab.DASHBOARD:
        return t.overview;
      case Tab.MAP:
        return t.globalTracking;
      case Tab.DRIVERS:
        return t.driversList;
      case Tab.FINANCE:
        return t.transactions;
      case Tab.SALARY:
        return t.salaryManagement;
      case Tab.ROLES:
        return t.roleManagement;
      default:
        return t.transactions;
    }
  };

  return (
    <header
      className={`h-24 flex items-center justify-between px-8 z-10 border-b flex-shrink-0 transition-colors duration-200 ${theme === 'dark'
        ? 'bg-[#1F2937] border-gray-800'
        : 'bg-white border-gray-200'
        }`}
    >
      {/* LEFT SECTION - Title */}
      <div className="flex-1">
        <h2
          className={`text-2xl font-bold transition-colors duration-200 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
        >
          {getTabTitle()}
        </h2>
      </div>

      {/* RIGHT SECTION - Controls and Actions */}
      <div className="flex items-center gap-3">


        {/* ACTION BUTTON - New Transaction (Finance/Dashboard) */}
        {(activeTab === Tab.DASHBOARD || activeTab === Tab.FINANCE) && userRole === 'admin' && (
          <button
            onClick={onNewTransactionClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all active:scale-95 ${theme === 'dark'
              ? 'bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-sm'
              : 'bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-sm'
              }`}
          >
            <PlusIcon className="w-4 h-4" />
            <span>{t.newTransfer}</span>
          </button>
        )}

        {/* THEME TOGGLE REMOVED */}

        {/* LANGUAGE SELECTOR */}
        <div className="relative" ref={langMenuRef}>
          <button
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${theme === 'dark'
              ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300 hover:text-white'
              : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-600 hover:text-gray-900'
              }`}
          >
            <GlobeIcon className="w-4 h-4" />
            <span className="text-sm font-bold uppercase">{language}</span>
            <ChevronDownIcon
              className={`w-3 h-3 transition-transform duration-200 ${isLangMenuOpen ? 'rotate-180' : ''
                }`}
            />
          </button>

          {/* Language Dropdown Menu */}
          {isLangMenuOpen && (
            <div
              className={`absolute top-full right-0 mt-2 w-40 rounded-lg shadow-xl overflow-hidden z-50 border transition-all duration-200 ${theme === 'dark'
                ? 'bg-[#1F2937] border-gray-700'
                : 'bg-white border-gray-200'
                }`}
            >
              {(['uz', 'ru', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    onLanguageChange(lang);
                    setIsLangMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-150 flex items-center gap-3 ${language === lang
                    ? theme === 'dark'
                      ? 'bg-gray-700 text-[#0d9488]'
                      : 'bg-gray-100 text-[#0d9488]'
                    : theme === 'dark'
                      ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <span className="text-xl">
                    {lang === 'uz' && '🇺🇿'}
                    {lang === 'ru' && '🇷🇺'}
                    {lang === 'en' && '🇬🇧'}
                  </span>
                  <span>
                    {lang === 'uz' && "O'zbek"}
                    {lang === 'ru' && 'Русский'}
                    {lang === 'en' && 'English'}
                  </span>
                  {language === lang && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0d9488]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DesktopHeader;
