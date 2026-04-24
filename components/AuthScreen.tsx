import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import useSound from 'use-sound';
import { LockIcon, SparklesIcon, CarIcon } from './Icons';
import thinkingBearAnimation from '../Images/thinking_bear.json';
import incorrectBearAnimation from '../Images/incorrect_bear.json';
import correctBearAnimation from '../Images/correct_bear.json';
import { useTranslation } from 'react-i18next';
import { Language } from '../types';
import correctSound from '../Sounds/correct.mp3';
import incorrectSound from '../Sounds/incorrect.mp3';

interface AuthScreenProps {
  onAuthenticated: (role: 'admin' | 'viewer', viewerData?: any) => void;
  theme: 'light' | 'dark';
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated, theme }) => {
  const [phoneDigits, setPhoneDigits] = useState('');
  const [password, setPassword]       = useState('');
  const [error, setError]             = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');
  const [success, setSuccess]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [animationState, setAnimationState] = useState<'thinking' | 'incorrect' | 'correct'>('thinking');

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

  const clearError = () => { setError(false); setErrorMsg(''); setAnimationState('thinking'); };

  const loginSuccess = (role: 'admin' | 'viewer', data?: any) => {
    setSuccess(true);
    setAnimationState('correct');
    playCorrect();
    setTimeout(() => onAuthenticated(role, data), 1500);
  };

  const handleFailedLogin = (msg?: string) => {
    setError(true);
    setErrorMsg(msg || '');
    setAnimationState('incorrect');
    playIncorrect();
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
      setAnimationState('incorrect');
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

  const isDark = theme === 'dark';
  const locked = lockoutTime > 0;
  const canSubmit = !success && !locked && phoneDigits.length === 9 && password.trim().length > 0;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden font-sans transition-colors duration-300 ${isDark ? 'bg-[#0B0C13]' : 'bg-gray-50'}`}>

      {/* Cyber grid */}
      <div className="absolute inset-0 z-0 opacity-20" style={{
        backgroundImage: `linear-gradient(${isDark ? '#334155' : '#E5E7EB'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? '#334155' : '#E5E7EB'} 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        transform: 'perspective(500px) rotateX(20deg)',
        transformOrigin: 'top center',
      }} />
      <div className={`absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] mix-blend-screen animate-pulse z-0 ${isDark ? 'bg-teal-600/15' : 'bg-teal-400/15'}`} />
      <div className={`absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] mix-blend-screen animate-pulse z-0 ${isDark ? 'bg-blue-600/15' : 'bg-blue-400/15'}`} style={{ animationDelay: '2s' }} />

      <div className="z-10 w-full max-w-md p-6 relative">
        <div className={`backdrop-blur-2xl border rounded-[32px] p-8 shadow-2xl relative overflow-hidden transition-all duration-500 ${isDark
          ? 'bg-[#11131B]/80 border-white/[0.08] shadow-black/20'
          : 'bg-white/80 border-gray-200 shadow-xl'
        } ${success ? (isDark ? 'border-emerald-500/50 shadow-emerald-500/20' : 'border-emerald-400 shadow-emerald-400/20') : ''}`}>

          {/* Bear animation */}
          <div className="flex justify-center mb-6">
            <div className={`w-40 h-40 ${animationState === 'incorrect' ? 'scale-x-[-1]' : ''}`}>
              <Lottie
                animationData={animationState === 'correct' ? correctBearAnimation : animationState === 'incorrect' ? incorrectBearAnimation : thinkingBearAnimation}
                loop={animationState !== 'correct'}
                className="w-full h-full"
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone */}
            <div className={`transition-all ${locked ? 'opacity-50 grayscale' : ''}`}>
              <div className={`flex rounded-2xl border overflow-hidden focus-within:ring-2 focus-within:ring-teal-500/40 transition-all ${
                error ? 'border-red-500'
                  : isDark ? 'border-white/[0.06] hover:border-teal-500/40 bg-[#0B0C13]/40' : 'border-gray-200 hover:border-teal-500/40 bg-gray-50'
              }`}>
                <span className={`flex items-center px-4 text-sm font-mono font-bold border-r select-none ${isDark ? 'text-teal-400 border-white/[0.06] bg-[#0B0C13]/60' : 'text-teal-600 border-gray-200 bg-gray-100'}`}>
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
                  className={`flex-1 px-4 py-4 text-lg font-mono tracking-widest focus:outline-none bg-transparent ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                />
              </div>
            </div>

            {/* Password */}
            <div className={`relative group transition-all ${locked ? 'opacity-50 grayscale' : ''}`}>
              <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${isDark ? 'text-gray-500 group-focus-within:text-teal-500' : 'text-gray-400 group-focus-within:text-teal-600'}`}>
                <LockIcon className="w-5 h-5" />
              </div>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); clearError(); }}
                placeholder="Parol"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                disabled={success || locked}
                className={`w-full border rounded-2xl px-5 py-4 pl-12 text-lg tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all duration-150 ${isDark
                  ? 'bg-[#0B0C13]/40 text-white placeholder-gray-500'
                  : 'bg-gray-50 text-gray-900 placeholder-gray-400'
                } ${error
                  ? 'border-red-500 shake-animation'
                  : isDark ? 'border-white/[0.06] hover:border-teal-500/40' : 'border-gray-200 hover:border-teal-500/40'
                }`}
              />
            </div>

            {/* Error */}
            <div className={`transition-all duration-150 overflow-hidden ${error || locked ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className={`rounded-xl p-3 flex items-center gap-3 border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <p className="text-sm font-medium">
                  {locked
                    ? t('tooManyAttempts').replace('{s}', lockoutTime.toString())
                    : errorMsg || t('invalidPassword')}
                </p>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transform transition-all duration-150 ${success
                ? 'bg-green-500 text-white scale-[1.02]'
                : locked
                  ? isDark ? 'bg-[#181A24] text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : canSubmit
                    ? 'bg-teal-600 text-white hover:bg-teal-700 hover:scale-[1.02] active:scale-[0.98]'
                    : isDark ? 'bg-[#181A24] text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {success ? (
                <span className="flex items-center justify-center gap-2">
                  <SparklesIcon className="w-5 h-5 animate-spin" />
                  {t('welcome')}
                </span>
              ) : locked ? (
                <span className="flex items-center justify-center gap-2 font-mono">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {lockoutTime}s
                </span>
              ) : loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Kirish...
                </span>
              ) : t('login')}
            </button>
          </form>

          {/* Language switcher */}
          <div className="flex justify-center gap-2 mt-6">
            {(['uz', 'ru', 'en'] as Language[]).map(l => (
              <button key={l} onClick={() => i18n.changeLanguage(l)}
                className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg border transition-all ${lang === l
                  ? 'text-teal-500 border-teal-500/30 bg-teal-500/10'
                  : isDark ? 'text-gray-600 border-transparent hover:text-gray-400' : 'text-gray-400 border-transparent hover:text-gray-600'
                }`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center mt-8 opacity-40">
          <div className={`flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <CarIcon className="w-3 h-3" /> Secure Fleet Management v2.0
          </div>
        </div>
      </div>

      <style>{`
        .shake-animation { animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake {
          0%, 100% { transform: translate3d(0,0,0); }
          10%, 30%, 50%, 70%, 90% { transform: translate3d(-4px,0,0); }
          20%, 40%, 60%, 80% { transform: translate3d(4px,0,0); }
        }
      `}</style>
    </div>
  );
};

export default AuthScreen;
