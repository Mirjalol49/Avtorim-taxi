import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import useSound from 'use-sound';
import { LockIcon, SparklesIcon, CarIcon, UserIcon } from './Icons';
import thinkingBearAnimation from '../Images/thinking_bear.json';
import incorrectBearAnimation from '../Images/incorrect_bear.json';
import correctBearAnimation from '../Images/correct_bear.json';
import { useTranslation } from 'react-i18next';
import { Language } from '../types';
import { subscribeToViewers } from '../services/firestoreService';
import { Viewer } from '../types';
import { supabase } from '../supabase';
import correctSound from '../Sounds/correct.mp3';
import incorrectSound from '../Sounds/incorrect.mp3';

interface AuthScreenProps {
  onAuthenticated: (role: 'admin' | 'viewer', viewerData?: any) => void;
  theme: 'light' | 'dark';
}

type LoginMode = 'admin' | 'viewer';

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated, theme }) => {
  const [mode, setMode] = useState<LoginMode>('admin');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [animationState, setAnimationState] = useState<'thinking' | 'incorrect' | 'correct'>('thinking');
  const [ambiguousViewers, setAmbiguousViewers] = useState<Viewer[]>([]);
  const [resolvingAdmins, setResolvingAdmins] = useState<Record<string, string>>({});
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;

  const [playCorrect] = useSound(correctSound, { volume: 0.5 });
  const [playIncorrect] = useSound(incorrectSound, { volume: 0.5 });

  useEffect(() => {
    const unsubscribe = subscribeToViewers((data) => setViewers(data));
    return () => unsubscribe();
  }, []);

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
    if (lockoutTime > 0) return;
    setLoading(true);

    // ── Admin login (phone + password) ──────────────────────────────────────
    if (mode === 'admin') {
      if (phoneDigits.length !== 9) {
        setError(true);
        setErrorMsg('+998 dan keyin 9 ta raqam kiriting');
        setAnimationState('incorrect');
        playIncorrect();
        setLoading(false);
        return;
      }
      try {
        const { authService } = await import('../services/authService');
        const phone = `+998${phoneDigits}`;
        const result = await authService.authenticateAdminByPhone(phone, password);
        if (result.success && result.user) {
          loginSuccess('admin', result.user);
        } else {
          handleFailedLogin(result.error);
        }
      } catch {
        handleFailedLogin();
      }
      setLoading(false);
      return;
    }

    // ── Viewer login (password only) ────────────────────────────────────────
    const matchingViewers = viewers.filter(v => v.active && v.password === password);

    if (matchingViewers.length === 1) {
      loginSuccess('viewer', matchingViewers[0]);
      setLoading(false);
      return;
    }
    if (matchingViewers.length > 1) {
      setAmbiguousViewers(matchingViewers);
      const adminsNeeded = [...new Set(matchingViewers.map(v => v.createdBy))];
      const adminMap: Record<string, string> = {};
      Promise.all(adminsNeeded.map(async id => {
        try {
          const { data } = await supabase.from('admin_users').select('username').eq('id', id).single();
          return { id, name: data?.username ?? 'Unknown' };
        } catch { return { id, name: 'Unknown' }; }
      })).then(results => {
        results.forEach(r => { adminMap[r.id] = r.name; });
        setResolvingAdmins(adminMap);
        setLoading(false);
      }).catch(() => setLoading(false));
      return;
    }

    handleFailedLogin();
    setLoading(false);
  };

  const isDark = theme === 'dark';
  const locked = lockoutTime > 0;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden font-sans transition-colors duration-300 ${isDark ? 'bg-[#111827]' : 'bg-gray-50'}`}>

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
          ? 'bg-[#1F2937]/80 border-gray-700 shadow-black/20'
          : 'bg-white/80 border-gray-200 shadow-xl'
        } ${success ? (isDark ? 'border-emerald-500/50 shadow-emerald-500/20' : 'border-emerald-400 shadow-emerald-400/20') : ''}`}>

          {/* Bear animation */}
          <div className="flex justify-center mb-5">
            <div className={`w-40 h-40 ${animationState === 'incorrect' ? 'scale-x-[-1]' : ''}`}>
              <Lottie
                animationData={animationState === 'correct' ? correctBearAnimation : animationState === 'incorrect' ? incorrectBearAnimation : thinkingBearAnimation}
                loop={animationState !== 'correct'}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Mode toggle */}
          <div className={`flex rounded-2xl p-1 mb-6 ${isDark ? 'bg-gray-900/60' : 'bg-gray-100'}`}>
            {(['admin', 'viewer'] as LoginMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); clearError(); setPassword(''); setPhoneDigits(''); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${mode === m
                  ? isDark ? 'bg-[#1F2937] text-white shadow-md' : 'bg-white text-gray-900 shadow-md'
                  : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {m === 'admin' ? '🏢 Firma' : '👁 Kuzatuvchi'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone field — admin only */}
            {mode === 'admin' && (
              <div className={`transition-all ${locked ? 'opacity-50 grayscale' : ''}`}>
                <div className={`flex rounded-2xl border overflow-hidden focus-within:ring-2 focus-within:ring-teal-500/40 transition-all ${
                  error && !password
                    ? 'border-red-500'
                    : isDark ? 'border-gray-700 hover:border-teal-500/40 bg-gray-900/50' : 'border-gray-200 hover:border-teal-500/40 bg-gray-50'
                }`}>
                  <span className={`flex items-center px-4 text-sm font-mono font-bold border-r select-none ${isDark ? 'text-teal-400 border-gray-700 bg-gray-900/80' : 'text-teal-600 border-gray-200 bg-gray-100'}`}>
                    +998
                  </span>
                  <input
                    type="tel"
                    value={phoneDigits}
                    onChange={e => { setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 9)); clearError(); }}
                    placeholder="XX XXX XX XX"
                    autoComplete="tel"
                    disabled={success || locked}
                    className={`flex-1 px-4 py-4 text-lg font-mono tracking-widest focus:outline-none bg-transparent ${isDark ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
                  />
                </div>
              </div>
            )}

            {/* Password field */}
            <div className={`relative group transition-all ${locked ? 'opacity-50 grayscale' : ''}`}>
              <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${isDark ? 'text-gray-500 group-focus-within:text-teal-500' : 'text-gray-400 group-focus-within:text-teal-600'}`}>
                <LockIcon className="w-5 h-5" />
              </div>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); clearError(); }}
                placeholder={mode === 'admin' ? 'Parol' : '••••••••'}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                disabled={success || locked}
                autoFocus={mode === 'viewer'}
                className={`w-full border rounded-2xl px-5 py-4 pl-12 text-lg tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all duration-150 ${isDark
                  ? 'bg-gray-900/50 text-white placeholder-gray-600'
                  : 'bg-gray-50 text-gray-900 placeholder-gray-400'
                } ${error
                  ? 'border-red-500 shake-animation'
                  : isDark ? 'border-gray-700 hover:border-teal-500/40' : 'border-gray-200 hover:border-teal-500/40'
                }`}
              />
            </div>

            {/* Error message */}
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
              disabled={success || locked || !password.trim() || (mode === 'admin' && phoneDigits.length !== 9)}
              className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transform transition-all duration-150 ${success
                ? 'bg-green-500 text-white scale-[1.02]'
                : locked
                  ? isDark ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : (password && (mode === 'viewer' || phoneDigits.length === 9))
                    ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white hover:shadow-teal-500/25 hover:scale-[1.02] active:scale-[0.98]'
                    : isDark ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
              ) : t('login')}
            </button>
          </form>

          {/* Ambiguous viewer selection */}
          {ambiguousViewers.length > 0 && (
            <div className="absolute inset-0 z-50 rounded-[32px] overflow-hidden flex flex-col bg-white/95 dark:bg-[#1F2937]/95 backdrop-blur-xl p-6">
              <h3 className={`text-lg font-bold mb-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('selectAccount') || 'Select Account'}
              </h3>
              <p className={`text-xs text-center mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('multipleAccountsFound') || 'Multiple accounts found.'}
              </p>
              <div className="flex-1 overflow-y-auto space-y-3">
                {ambiguousViewers.map(viewer => (
                  <button key={viewer.id} onClick={() => loginSuccess('viewer', viewer)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${isDark ? 'bg-gray-800 border-gray-700 hover:border-teal-500' : 'bg-gray-50 border-gray-200 hover:border-teal-500'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{viewer.name}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {resolvingAdmins[viewer.createdBy] ? `Fleet: ${resolvingAdmins[viewer.createdBy]}` : 'Yuklanmoqda...'}
                        </p>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-50 text-teal-600'}`}>
                        <UserIcon className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => { setAmbiguousViewers([]); setPassword(''); }}
                className="mt-4 text-xs font-medium text-gray-400 hover:text-gray-500 text-center w-full">
                {t('cancel') || 'Bekor qilish'}
              </button>
            </div>
          )}

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
