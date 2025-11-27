import React, { useState } from 'react';
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
  userRole
}) => {
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const t = TRANSLATIONS[language];

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
        return t.financialReports;
      default:
        return 'Avtorim Taxi';
    }
  };

  return (
    <header
      className={`h-24 flex items-center justify-between px-8 z-10 border-b flex-shrink-0 transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-[#1F2937] border-gray-800'
          : 'bg-white border-gray-200'
      }`}
    >
      {/* LEFT SECTION - Title */}
      <div className="flex-1">
        <h2
          className={`text-2xl font-bold transition-colors duration-200 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
              theme === 'dark'
                ? 'bg-[#2D6A76] hover:bg-[#235560] text-white shadow-lg shadow-blue-900/20'
                : 'bg-[#2D6A76] hover:bg-[#235560] text-white shadow-lg shadow-blue-500/30'
            }`}
          >
            <PlusIcon className="w-4 h-4" />
            <span>{t.newTransfer}</span>
          </button>
        )}

        {/* THEME TOGGLE */}
        <button
          onClick={onThemeToggle}
          className={`flex items-center justify-center p-2 rounded-lg border transition-all duration-200 ${
            theme === 'dark'
              ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-400 hover:text-white'
              : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-600 hover:text-gray-900'
          }`}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <SunIcon className="w-4 h-4" />
          ) : (
            <MoonIcon className="w-4 h-4" />
          )}
        </button>

        {/* LANGUAGE SELECTOR */}
        <div className="relative">
          <button
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
              theme === 'dark'
                ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300 hover:text-white'
                : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-600 hover:text-gray-900'
            }`}
          >
            <GlobeIcon className="w-4 h-4" />
            <span className="text-sm font-bold uppercase">{language}</span>
            <ChevronDownIcon
              className={`w-3 h-3 transition-transform duration-200 ${
                isLangMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Language Dropdown Menu */}
          {isLangMenuOpen && (
            <div
              className={`absolute top-full right-0 mt-2 w-40 rounded-lg shadow-xl overflow-hidden z-50 border transition-all duration-200 ${
                theme === 'dark'
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
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-150 flex items-center gap-3 ${
                    language === lang
                      ? theme === 'dark'
                        ? 'bg-gray-700 text-[#2D6A76]'
                        : 'bg-gray-100 text-[#2D6A76]'
                      : theme === 'dark'
                      ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <GlobeIcon className="w-3 h-3" />
                  <span>
                    {lang === 'uz' && "O'zbek"}
                    {lang === 'ru' && 'Русский'}
                    {lang === 'en' && 'English'}
                  </span>
                  {language === lang && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2D6A76]" />
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
