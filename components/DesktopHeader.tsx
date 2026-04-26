import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GlobeIcon, ChevronDownIcon, PlusIcon, SunIcon, MoonIcon
} from './Icons';
import { Tab } from '../types';
import NotificationBell from './NotificationBell';
import { Notification } from '../services/notificationService';

interface DesktopHeaderProps {
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  // language and onLanguageChange removed
  activeTab: Tab;
  isMobile: boolean;
  onNewTransactionClick: () => void;
  onAddDriverClick: () => void;
  userRole: 'admin' | 'viewer';
  // Notification props
  notifications: Notification[];
  unreadCount: number;
  readIds: Set<string>;
  userId: string;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onClearAllRead: () => void;
}

const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  theme,
  onThemeToggle,
  activeTab,
  isMobile,
  onNewTransactionClick,
  onAddDriverClick,
  userRole,
  notifications,
  unreadCount,
  readIds,
  userId,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAllRead
}) => {
  const { t, i18n } = useTranslation();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

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
        return t('overview');
      case Tab.MAP:
        return t('globalTracking');
      case Tab.DRIVERS:
        return t('driversList');
      case Tab.TRANSACTIONS:
        return t('transactions');
      case Tab.FINANCE:
        return t('financialReports');
      case Tab.SALARY:
        return t('salaryManagement');
      case Tab.ROLES:
        return t('roleManagement');
      case Tab.CARS:
        return t('cars');
      case Tab.NOTES:
        return t('notes');
      case Tab.MONTHLY_PLAN:
        return t('monthlyPlan');
      default:
        return t('overview');
    }
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setIsLangMenuOpen(false);
  };

  return (
    <header
      className={`h-16 flex items-center justify-between px-6 z-10 border-b flex-shrink-0 transition-colors duration-200 ${theme === 'dark'
        ? 'border-white/[0.08]'
        : 'bg-white border-black/[0.08]'
        }`}
      style={{ background: theme === 'dark' ? 'var(--color-sidebar)' : undefined }}
    >
      {/* LEFT SECTION - Title */}
      <div className="flex-1">
        <h2
          className={`text-[17px] font-semibold transition-colors duration-200 ${theme === 'dark' ? 'text-white' : 'text-black'
            }`}
        >
          {getTabTitle()}
        </h2>
      </div>

      {/* RIGHT SECTION - Controls and Actions */}
      <div className="flex items-center gap-2">

        {/* THEME TOGGLE */}
        <button
          onClick={onThemeToggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`p-2 rounded-xl transition-all ${theme === 'dark'
            ? 'bg-white/[0.08] hover:bg-white/[0.13] text-[rgba(235,235,245,0.6)] hover:text-white'
            : 'bg-black/[0.05] hover:bg-black/[0.09] text-[rgba(60,60,67,0.6)] hover:text-black'
            }`}
        >
          {theme === 'dark'
            ? <SunIcon className="w-4 h-4" />
            : <MoonIcon className="w-4 h-4" />
          }
        </button>

        {/* ACTION BUTTON - New Transaction (Global for Admins) */}
        {userRole === 'admin' && (
          <button
            onClick={onNewTransactionClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-[15px] bg-[#0f766e] hover:bg-[#0a5c56] text-white transition-all active:scale-95"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{t('newTransfer')}</span>
          </button>
        )}

        {/* NOTIFICATION BELL */}
        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          readIds={readIds}
          userId={userId}
          theme={theme}
          onMarkAsRead={onMarkAsRead}
          onMarkAllAsRead={onMarkAllAsRead}
          onDeleteNotification={onDeleteNotification}
          onClearAllRead={onClearAllRead}
        />

        {/* LANGUAGE SELECTOR */}
        <div className="relative" ref={langMenuRef}>
          <button
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 ${theme === 'dark'
              ? 'bg-white/[0.08] hover:bg-white/[0.13] text-[rgba(235,235,245,0.7)] hover:text-white'
              : 'bg-black/[0.05] hover:bg-black/[0.09] text-[rgba(60,60,67,0.7)] hover:text-black'
              }`}
          >
            <GlobeIcon className="w-4 h-4" />
            <span className="text-[13px] font-semibold uppercase tracking-wide">{i18n.language}</span>
            <ChevronDownIcon
              className={`w-3 h-3 transition-transform duration-200 ${isLangMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Language Dropdown Menu */}
          {isLangMenuOpen && (
            <div
              className={`absolute top-full right-0 mt-2 w-40 rounded-xl overflow-hidden z-50 border transition-all duration-200 ${theme === 'dark'
                ? 'bg-[#2C2C2E] border-white/[0.10] shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
                : 'bg-white border-black/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.12)]'
                }`}
            >
              {(['uz', 'ru', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={`w-full text-left px-4 py-2.5 text-[15px] font-medium transition-colors duration-150 flex items-center gap-3 ${i18n.language === lang
                    ? theme === 'dark'
                      ? 'bg-white/[0.08] text-[#0d9488]'
                      : 'bg-black/[0.04] text-[#0f766e]'
                    : theme === 'dark'
                      ? 'text-[rgba(235,235,245,0.7)] hover:bg-white/[0.06] hover:text-white'
                      : 'text-[rgba(60,60,67,0.75)] hover:bg-black/[0.03] hover:text-black'
                    }`}
                >
                  <span className="text-lg">
                    {lang === 'uz' && '🇺🇿'}
                    {lang === 'ru' && '🇷🇺'}
                    {lang === 'en' && '🇬🇧'}
                  </span>
                  <span>
                    {lang === 'uz' && "O'zbek"}
                    {lang === 'ru' && 'Русский'}
                    {lang === 'en' && 'English'}
                  </span>
                  {i18n.language === lang && (
                    <div className={`ml-auto w-1.5 h-1.5 rounded-full ${theme === 'dark' ? 'bg-[#0d9488]' : 'bg-[#0f766e]'}`} />
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
