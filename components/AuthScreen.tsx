import React, { useState, useEffect } from 'react';
import useSound from 'use-sound';
import { useTranslation } from 'react-i18next';
import { Language } from '../types';
import correctSound from '../Sounds/correct.mp3';
import incorrectSound from '../Sounds/incorrect.mp3';

interface AuthScreenProps {
  onAuthenticated: (role: 'admin' | 'viewer', viewerData?: any) => void;
  theme: 'light' | 'dark';
}

// Teal padlock SVG matching the provided image
const TealPadlock: React.FC = () => (
  <svg width="96" height="108" viewBox="0 0 96 108" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shackleGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c8f5f0" />
        <stop offset="50%" stopColor="#9ee8e0" />
        <stop offset="100%" stopColor="#6bd8cb" />
      </linearGradient>
      <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#4dcdc3" />
        <stop offset="45%"  stopColor="#29a195" />
        <stop offset="100%" stopColor="#1a7a72" />
      </linearGradient>
      <linearGradient id="bodyShine" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stopColor="rgba(255,255,255,0.18)" />
        <stop offset="40%"  stopColor="rgba(255,255,255,0.06)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="rgba(0,80,72,0.45)" />
      </filter>
    </defs>

    {/* Shackle */}
    <rect x="27" y="5" width="11" height="46" rx="5.5" fill="url(#shackleGrad)" />
    <rect x="58" y="5" width="11" height="46" rx="5.5" fill="url(#shackleGrad)" />
    <rect x="27" y="5" width="42" height="11" rx="5.5" fill="url(#shackleGrad)" />

    {/* Body */}
    <rect x="4" y="40" width="88" height="64" rx="14" fill="url(#bodyGrad)" filter="url(#shadow)" />
    <rect x="4" y="40" width="88" height="64" rx="14" fill="url(#bodyShine)" />

    {/* Keyhole circle */}
    <circle cx="48" cy="68" r="11" fill="rgba(0,60,56,0.55)" />
    {/* Keyhole slot */}
    <rect x="44" y="72" width="8" height="16" rx="4" fill="rgba(0,60,56,0.55)" />

    {/* Highlight edge top */}
    <rect x="4" y="40" width="88" height="4" rx="14" fill="rgba(255,255,255,0.15)" />
  </svg>
);

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [phoneDigits, setPhoneDigits] = useState('');
  const [password, setPassword]       = useState('');
  const [error, setError]             = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');
  const [success, setSuccess]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [shake, setShake]             = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);

  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;

  const [playCorrect]   = useSound(correctSound, { volume: 0.5 });
  const [playIncorrect] = useSound(incorrectSound, { volume: 0.5 });

  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setInterval(() => setLockoutTime(p => p - 1), 1000);
      return () => clearInterval(timer);
    } else if (lockoutTime === 0 && loginAttempts >= 3) {
      setLoginAttempts(0);
    }
  }, [lockoutTime, loginAttempts]);

  const clearError = () => { setError(false); setErrorMsg(''); };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const loginSuccess = (role: 'admin' | 'viewer', data?: any) => {
    setSuccess(true);
    playCorrect();
    setTimeout(() => onAuthenticated(role, data), 1200);
  };

  const handleFailedLogin = (msg?: string) => {
    setError(true);
    setErrorMsg(msg || '');
    playIncorrect();
    triggerShake();
    const next = loginAttempts + 1;
    setLoginAttempts(next);
    if (next >= 3) setLockoutTime(30);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTime > 0 || loading) return;

    if (phoneDigits.length !== 9) {
      setError(true);
      setErrorMsg('+998 dan keyin 9 ta raqam kiriting');
      triggerShake();
      playIncorrect();
      return;
    }

    setLoading(true);
    try {
      const { authService } = await import('../services/authService');
      const result = await authService.authenticateAdminByPhone(`+998${phoneDigits}`, password);
      if (result.success && result.user) {
        loginSuccess('admin', result.user);
      } else {
        handleFailedLogin(result.error);
      }
    } catch {
      handleFailedLogin();
    }
    setLoading(false);
  };

  const locked = lockoutTime > 0;
  const canSubmit = !success && !locked && phoneDigits.length === 9 && password.trim().length > 0;

  // Background: solid teal accent hsl(176, 79%, 26%)
  const BG = 'hsl(176deg, 79%, 26%)';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: BG }}
    >
      {/* Subtle radial glow for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 30%, hsl(176,79%,36%) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
        style={{ background: 'linear-gradient(to top, hsl(176,79%,20%), transparent)' }}
      />

      <div
        className={`relative z-10 w-full max-w-xs px-6 flex flex-col items-center ${shake ? 'animate-shake' : ''}`}
      >
        {/* Padlock */}
        <div className={`mb-6 transition-all duration-500 ${success ? 'scale-110 opacity-100' : 'scale-100 opacity-100'}`}>
          <TealPadlock />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-white mb-1 text-center tracking-tight">
          {success ? t('welcome') : 'Xush kelibsiz'}
        </h1>
        <p className="text-sm text-white/60 mb-8 text-center font-medium">
          {locked
            ? t('tooManyAttempts').replace('{s}', lockoutTime.toString())
            : error
              ? (errorMsg || t('invalidPassword'))
              : 'Tizimga kirish uchun ma\'lumotlaringizni kiriting'}
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-3">
          {/* Phone input */}
          <div className={`flex rounded-2xl overflow-hidden border-2 transition-all ${
            error ? 'border-red-300/60' : 'border-white/20 focus-within:border-white/60'
          }`} style={{ background: 'rgba(255,255,255,0.12)' }}>
            <span className="flex items-center px-4 text-sm font-mono font-bold text-white/80 border-r border-white/20 select-none">
              +998
            </span>
            <input
              type="tel"
              value={phoneDigits}
              onChange={e => { setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 9)); clearError(); }}
              placeholder="XX XXX XX XX"
              autoComplete="tel"
              disabled={success || locked}
              autoFocus
              className="flex-1 px-4 py-4 text-base font-mono tracking-widest focus:outline-none bg-transparent text-white placeholder-white/40"
            />
          </div>

          {/* Password label */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 text-center pt-1">
            Parolni kiriting
          </p>

          {/* Password input */}
          <div className={`rounded-2xl overflow-hidden border-2 transition-all ${
            error ? 'border-red-300/60' : 'border-white/20 focus-within:border-white/60'
          }`} style={{ background: 'rgba(255,255,255,0.12)' }}>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); clearError(); }}
              placeholder="••••••"
              autoComplete="current-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={success || locked}
              className="w-full px-5 py-4 text-lg tracking-[0.5em] font-mono focus:outline-none bg-transparent text-white placeholder-white/40 text-center"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-4 rounded-2xl font-bold text-base mt-2 transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              background: canSubmit
                ? 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.12) 100%)'
                : 'rgba(255,255,255,0.08)',
              color: canSubmit ? '#ffffff' : 'rgba(255,255,255,0.35)',
              border: `2px solid ${canSubmit ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.10)'}`,
              boxShadow: canSubmit ? '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none',
              backdropFilter: 'blur(8px)',
            }}
          >
            {success ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {t('welcome')}
              </>
            ) : locked ? (
              <span className="font-mono">{lockoutTime}s</span>
            ) : loading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Kirish...
              </>
            ) : (
              <>
                {t('login')}
                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Language switcher */}
        <div className="flex justify-center gap-2 mt-8">
          {(['uz', 'ru', 'en'] as Language[]).map(l => (
            <button
              key={l}
              onClick={() => i18n.changeLanguage(l)}
              className="text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg border transition-all"
              style={{
                color: lang === l ? '#ffffff' : 'rgba(255,255,255,0.4)',
                borderColor: lang === l ? 'rgba(255,255,255,0.4)' : 'transparent',
                background: lang === l ? 'rgba(255,255,255,0.12)' : 'transparent',
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-white/25">
          Secure Fleet Management v2.0
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-6px); }
          30%, 60%, 90% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.45s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
    </div>
  );
};

export default AuthScreen;
