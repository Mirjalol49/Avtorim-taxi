import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import useSound from 'use-sound';
import { LockIcon, SparklesIcon, CarIcon, UserIcon } from './Icons';
import thinkingBearAnimation from '../Images/thinking_bear.json';
import incorrectBearAnimation from '../Images/incorrect_bear.json';
import correctBearAnimation from '../Images/correct_bear.json';
import { useTranslation } from 'react-i18next';
// import { TRANSLATIONS } from '../translations';
import { Language } from '../types';
import { subscribeToViewers } from '../services/firestoreService';
import { Viewer } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import correctSound from '../Sounds/correct.mp3';
import incorrectSound from '../Sounds/incorrect.mp3';

interface AuthScreenProps {
  onAuthenticated: (role: 'admin' | 'viewer', viewerData?: any) => void;
  theme: 'light' | 'dark';
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated, theme }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
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

  // Sound effects
  const [playCorrect] = useSound(correctSound, { volume: 0.5 });
  const [playIncorrect] = useSound(incorrectSound, { volume: 0.5 });

  useEffect(() => {
    const unsubscribe = subscribeToViewers((data) => {
      setViewers(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (lockoutTime === 0 && loginAttempts >= 3) {
      setLoginAttempts(0);
    }
  }, [lockoutTime, loginAttempts]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) {
      setError(false);
      setAnimationState('thinking');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTime > 0) return;
    setLoading(true);

    // 1. Check Viewers first (for quick viewer access)
    const matchingViewers = viewers.filter(v => v.active && v.password === password);

    if (matchingViewers.length === 1) {
      loginSuccess('viewer', matchingViewers[0]);
      setLoading(false);
      return;
    } else if (matchingViewers.length > 1) {
      // Handle collision
      setAmbiguousViewers(matchingViewers);

      // Fetch admin names for context
      const adminsNeeded = [...new Set(matchingViewers.map(v => v.createdBy))];
      const adminMap: Record<string, string> = {};

      Promise.all(adminsNeeded.map(async (adminId) => {
        try {
          // Try admin_users first
          const adminRef = doc(db, 'admin_users', adminId);
          const adminSnap = await getDoc(adminRef);
          if (adminSnap.exists()) {
            return { id: adminId, name: adminSnap.data().username };
          }
          // Try generic admin profile or fallback
          return { id: adminId, name: 'Unknown Admin' };
        } catch (e) {
          return { id: adminId, name: 'Unknown Admin' };
        }
      })).then(results => {
        results.forEach(r => { adminMap[r.id] = r.name; });
        setResolvingAdmins(adminMap);
        setLoading(false);
      });

      return;
    }

    // 2. Check Admin Users via authService (with proper status validation)
    try {
      const { authService } = await import('../services/authService');
      const result = await authService.authenticateAdmin(password);

      if (result.success && result.user) {
        loginSuccess('admin', result.user);
        setLoading(false);
        return;
      }

      // Authentication failed - check if it's due to disabled account
      if (result.error?.includes('disabled')) {
        setError(true);
        setAnimationState('incorrect');
        playIncorrect();
        // Don't increment attempts for disabled accounts - show specific error
        setLoading(false);
        return;
      }

      // Regular failed login - increment attempts
      handleFailedLogin();
      setLoading(false);
    } catch (error) {
      console.error('Error checking admin users:', error);
      handleFailedLogin();
      setLoading(false);
    }
  };

  const loginSuccess = (role: 'admin' | 'viewer', data?: any) => {
    setSuccess(true);
    setAnimationState('correct');
    playCorrect(); // Play success sound
    setTimeout(() => {
      onAuthenticated(role, data);
    }, 1500); // Increased timeout to let animation play a bit
  };

  const handleFailedLogin = () => {
    setError(true);
    setAnimationState('incorrect');
    playIncorrect(); // Play error sound

    // Error persists until user interaction

    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    if (newAttempts >= 3) {
      setLockoutTime(30);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden font-sans transition-colors duration-300 ${isDark ? 'bg-[#111827]' : 'bg-gray-50'
      }`}>

      {/* Cyber Grid Background */}
      <div
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(${isDark ? '#334155' : '#E5E7EB'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? '#334155' : '#E5E7EB'} 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          transform: 'perspective(500px) rotateX(20deg)',
          transformOrigin: 'top center'
        }}
      />

      {/* Ambient Glows */}
      <div className={`absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] mix-blend-screen animate-pulse z-0 ${isDark ? 'bg-blue-600/20' : 'bg-blue-400/20'
        }`}></div>
      <div className={`absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] mix-blend-screen animate-pulse z-0 ${isDark ? 'bg-indigo-600/20' : 'bg-indigo-400/20'
        }`} style={{ animationDelay: '2s' }}></div>

      <div className="z-10 w-full max-w-md p-6 relative">

        {/* Main Glass Card */}
        <div className={`backdrop-blur-2xl border rounded-[32px] p-8 shadow-2xl relative overflow-hidden transition-all duration-500 ${isDark
          ? 'bg-[#1F2937]/80 border-gray-700 shadow-black/20'
          : 'bg-white/80 border-gray-200 shadow-xl'
          } ${success ? (isDark ? 'border-emerald-500/50 shadow-emerald-500/20' : 'border-emerald-400 shadow-emerald-400/20') : ''}`}>

          {/* Animation Section */}
          <div className="flex justify-center mb-6">
            <div className={`w-48 h-48 ${animationState === 'incorrect' ? 'scale-x-[-1]' : ''}`}>
              <Lottie
                animationData={
                  animationState === 'correct' ? correctBearAnimation :
                    animationState === 'incorrect' ? incorrectBearAnimation :
                      thinkingBearAnimation
                }
                loop={animationState !== 'correct'} // Don't loop correct animation
                className="w-full h-full"
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Input Fields */}
            <div className="space-y-4">
              <div className={`relative group transition-all duration-150 ${lockoutTime > 0 ? 'opacity-50 grayscale' : ''}`}>
                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${isDark ? 'text-gray-500 group-focus-within:text-teal-500' : 'text-gray-400 group-focus-within:text-teal-600'
                  }`}>
                  <LockIcon className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  autoFocus
                  disabled={success || lockoutTime > 0}
                  className={`w-full border rounded-2xl px-5 py-4 pl-12 text-lg tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-[#0d9488]/50 transition-all duration-150 ${isDark
                    ? 'bg-gray-900/50 text-white placeholder-gray-600'
                    : 'bg-gray-50 text-gray-900 placeholder-gray-400'
                    } ${error
                      ? 'border-red-500 shake-animation'
                      : isDark ? 'border-gray-700 group-hover:border-[#0d9488]/50' : 'border-gray-200 group-hover:border-[#0d9488]/50'
                    }`}
                />
              </div>

              {/* Error Message - INSTANT Feedback */}
              <div className={`transition-all duration-150 overflow-hidden ${error || lockoutTime > 0 ? 'max-h-20 opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0'}`}>
                <div className={`rounded-xl p-3 flex items-center gap-3 border ${isDark
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-red-50 border-red-200 text-red-600'
                  }`}>
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-sm font-medium">
                    {lockoutTime > 0
                      ? t('tooManyAttempts').replace('{s}', lockoutTime.toString())
                      : t('invalidPassword')}
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={success || lockoutTime > 0 || !password}
                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transform transition-all duration-150 ${success
                  ? 'bg-green-500 text-white scale-[1.02]'
                  : lockoutTime > 0
                    ? isDark ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : password
                      ? 'bg-gradient-to-r from-[#0d9488] to-[#0f766e] text-white hover:shadow-[#0d9488]/25 hover:scale-[1.02] active:scale-[0.98]'
                      : isDark
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
              >
                {success ? (
                  <span className="flex items-center justify-center gap-2">
                    <SparklesIcon className="w-5 h-5 animate-spin" />
                    {t('welcome')}
                  </span>
                ) : lockoutTime > 0 ? (
                  <span className="flex items-center justify-center gap-2 font-mono">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {lockoutTime}s
                  </span>
                ) : (
                  t('login')
                )}
              </button>
            </div>
          </form>

          {/* Ambiguous Viewer Selection Modal/Overlay */}
          {ambiguousViewers.length > 0 && (
            <div className="absolute inset-0 z-50 rounded-[32px] overflow-hidden flex flex-col bg-white/95 dark:bg-[#1F2937]/95 backdrop-blur-xl p-6 transition-all">
              <h3 className={`text-lg font-bold mb-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('selectAccount') || 'Select Account'}
              </h3>
              <p className={`text-xs text-center mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('multipleAccountsFound') || 'Multiple accounts found with these credentials.'}
              </p>

              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                {ambiguousViewers.map(viewer => (
                  <button
                    key={viewer.id}
                    onClick={() => loginSuccess('viewer', viewer)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${isDark
                        ? 'bg-gray-800 border-gray-700 hover:border-[#0d9488] hover:bg-gray-700'
                        : 'bg-gray-50 border-gray-200 hover:border-[#0d9488] hover:bg-gray-100'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{viewer.name}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {resolvingAdmins[viewer.createdBy] ? `Fleet: ${resolvingAdmins[viewer.createdBy]}` : 'Loading...'}
                        </p>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-[#0d9488]/20 text-[#0d9488]' : 'bg-[#0d9488]/10 text-[#0d9488]'
                        }`}>
                        <UserIcon className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setAmbiguousViewers([]);
                  setPassword('');
                }}
                className="mt-4 text-xs font-medium text-gray-400 hover:text-gray-500 text-center w-full"
              >
                {t('cancel') || 'Cancel'}
              </button>
            </div>
          )}

          {/* Language Switcher in Login */}
          <div className="flex justify-center gap-2 mt-8">
            {(['uz', 'ru', 'en'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => i18n.changeLanguage(l)}
                className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg border transition-all ${lang === l
                  ? 'text-[#0d9488] border-[#0d9488]/30 bg-[#0d9488]/10'
                  : isDark ? 'text-gray-600 border-transparent hover:text-gray-400' : 'text-gray-400 border-transparent hover:text-gray-600'
                  }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Identity */}
        <div className="text-center mt-8 opacity-40">
          <div className={`flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
            <CarIcon className="w-3 h-3" /> Secure Fleet Management v2.0
          </div>
        </div>
      </div>

      <style>{`
        .shake-animation {
          animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          0%, 100% { transform: translate3d(0, 0, 0); }
          10%, 30%, 50%, 70%, 90% { transform: translate3d(-4px, 0, 0); }
          20%, 40%, 60%, 80% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
};

export default AuthScreen;