import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GlobeIcon, ChevronDownIcon, PlusIcon, SunIcon, MoonIcon
} from './Icons';
import { Tab } from '../types';
import NotificationBell from './NotificationBell';
import { Notification } from '../services/notificationService';
import { Car } from '../src/core/types/car.types';
import { GlassButton } from '../src/components/ui/GlassButton';

interface DesktopHeaderProps {
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  onLanguageChange: (lang: string) => void;
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
  onClearAllRead: (ids?: string[]) => void;
  cars?: Car[];
}

const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  theme,
  onThemeToggle,
  onLanguageChange,
  activeTab,
  isMobile,
  onNewTransactionClick,
  userRole,
  notifications,
  unreadCount,
  readIds,
  userId,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAllRead,
  cars = []
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
      case Tab.FINES:
        return t('fines') || 'Jarimalar';
      default:
        return t('overview');
    }
  };

  const handleLanguageChange = (lang: string) => {
    onLanguageChange(lang);
    setIsLangMenuOpen(false);
  };

  const isDark = theme === 'dark';

  return (
    <header
      className={`
        h-16 flex items-center justify-between px-6 z-30 flex-shrink-0 transition-colors duration-200
        backdrop-blur-2xl border-b
        ${isDark 
          ? 'bg-[#131b2e]/80 border-white/[0.08]' 
          : 'bg-[#faf8ff]/80 border-black/[0.06]'
        }
      `}
      style={{ isolation: 'isolate' }}
    >
      {/* LEFT SECTION - Title */}
      <div className="flex-1">
        <h2
          className={`text-[19px] tracking-tight font-bold transition-colors duration-200 ${isDark ? 'text-white' : 'text-gray-900'}`}
        >
          {getTabTitle()}
        </h2>
      </div>

      {/* RIGHT SECTION - Controls and Actions */}
      <div className="flex items-center gap-3">

        {/* THEME TOGGLE */}
        <GlassButton
          isDark={isDark}
          variant="secondary"
          size="icon"
          onClick={onThemeToggle}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark
            ? <SunIcon className="w-4 h-4" />
            : <MoonIcon className="w-4 h-4" />
          }
        </GlassButton>

        {/* ACTION BUTTON - New Transaction (Global for Admins) */}
        {userRole === 'admin' && (
          <GlassButton
            isDark={isDark}
            variant="primary"
            onClick={onNewTransactionClick}
          >
            <PlusIcon className="w-4 h-4" />
            <span>{t('newTransfer')}</span>
          </GlassButton>
        )}

        {/* NOTIFICATION BELL */}
        <div className="px-1">
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
            cars={cars}
          />
        </div>

        {/* LANGUAGE SELECTOR */}
        <div className="relative" ref={langMenuRef}>
          <GlassButton
            isDark={isDark}
            variant="secondary"
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
          >
            <GlobeIcon className="w-4 h-4" />
            <span className="text-[13px] font-bold uppercase tracking-wider">{i18n.language}</span>
            <ChevronDownIcon
              className={`w-3 h-3 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isLangMenuOpen ? 'rotate-180' : ''}`}
            />
          </GlassButton>

          {/* Language Dropdown Menu */}
          {isLangMenuOpen && (
            <div
              className={`absolute top-full right-0 mt-2 w-44 rounded-2xl overflow-hidden z-50 border transition-all duration-300 animate-modalPop ${isDark
                ? 'bg-[#222a3d]/95 backdrop-blur-3xl border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.4)]'
                : 'bg-white/95 backdrop-blur-3xl border-black/[0.08] shadow-[0_16px_40px_rgba(15,23,42,0.12)]'
                }`}
            >
              <div className="p-1">
                  {(['uz', 'ru', 'en'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageChange(lang)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 flex items-center gap-3 active:scale-[0.98] ${i18n.language === lang
                        ? isDark
                          ? 'bg-white/[0.1] text-[#6bd8cb]'
                          : 'bg-black/[0.05] text-[#0f766e]'
                        : isDark
                          ? 'text-[rgba(235,235,245,0.7)] hover:bg-white/[0.06] hover:text-white'
                          : 'text-[rgba(60,60,67,0.75)] hover:bg-black/[0.04] hover:text-black'
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
                      {i18n.language === lang && (
                        <div className={`ml-auto w-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#6bd8cb]' : 'bg-[#0f766e]'}`} />
                      )}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DesktopHeader;
