import React, { useState, useEffect } from 'react';
import { LockIcon, SparklesIcon, CarIcon, PhoneIcon, UserIcon } from './Icons';
import logo from '../Images/logo.png';
import { TRANSLATIONS } from '../translations';
import { Language } from '../types';
import { subscribeToViewers } from '../services/firestoreService';
import { Viewer } from '../types';

interface AuthScreenProps {
  onAuthenticated: (role: 'admin' | 'viewer', viewerData?: any) => void;
  lang: Language;
  setLang: (l: Language) => void;
  theme: 'light' | 'dark';
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated, lang, setLang, theme }) => {
  const [role, setRole] = useState<'admin' | 'viewer'>('admin');
  const [password, setPassword] = useState('');
  const [selectedViewerId, setSelectedViewerId] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);
  const t = TRANSLATIONS[lang];

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTime > 0) return;

    if (role === 'viewer') {
      setLoading(true);

      // Check if viewer exists, is active, and password matches
      const viewer = viewers.find(v =>
        v.id === selectedViewerId &&
        v.active &&
        v.password === password
      );

      if (viewer) {
        setSuccess(true);
        setTimeout(() => {
          onAuthenticated('viewer', viewer);
        }, 800);
      } else {
        handleFailedLogin();
      }
      setLoading(false);
      return;
    }

    if (password === 'mirjalol4941') {
      setSuccess(true);
      setTimeout(() => {
        onAuthenticated('admin');
      }, 800);
    } else {
      // Check against stored password
      const storedPassword = localStorage.getItem('avtorim_admin_password');
      if (storedPassword && password === storedPassword) {
        setSuccess(true);
        setTimeout(() => {
          onAuthenticated('admin');
        }, 800);
      } else {
        handleFailedLogin();
      }
    }
  };

  const handleFailedLogin = () => {
    setError(true);
    setTimeout(() => setError(false), 2000);
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    if (newAttempts >= 3) {
      setLockoutTime(30);
    }
  };

  // Clock effect
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

          {/* Status Bar */}
          <div className={`flex justify-between items-center mb-8 border-b pb-4 ${isDark ? 'border-gray-700' : 'border-gray-100'
            }`}>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${success ? 'bg-emerald-400 animate-ping' : 'bg-red-500'}`}></span>
              <span className={`text-[10px] uppercase tracking-[0.2em] font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                {success ? t.accessGranted : t.systemLocked}
              </span>
            </div>
            <div className={`text-xs font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {time.toLocaleTimeString()}
            </div>
          </div>

          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              {/* Rotating Rings around Logo */}
              <div className={`absolute -inset-4 border rounded-full ${isDark ? 'border-blue-500/30' : 'border-blue-400/30'
                } ${success ? 'scale-110 opacity-0' : 'animate-[spin_4s_linear_infinite]'}`}></div>
              <div className={`absolute -inset-2 border border-dashed rounded-full ${isDark ? 'border-indigo-400/30' : 'border-indigo-300/30'
                } ${success ? 'scale-110 opacity-0' : 'animate-[spin_10s_linear_infinite_reverse]'}`}></div>

              <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 overflow-hidden ${success
                ? 'bg-emerald-500 rotate-0'
                : isDark ? 'bg-gray-800 rotate-0 border border-gray-700' : 'bg-white rotate-0 border border-gray-200'
                }`}>
                <img src={logo} alt="Avtorim Taxi" className="w-12 h-auto object-contain" />
              </div>
            </div>

            <h1 className={`text-lg md:text-xl font-bold text-center uppercase tracking-[0.2em] mt-6 transition-all duration-300 ${isDark
              ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]'
              : 'text-gray-900'
              }`}>
              {t.loginTitle}
            </h1>
          </div>

          {/* Role Selection */}
          <div className={`flex p-1 rounded-xl mb-6 border ${isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-100 border-gray-200'
            }`}>
            <button
              onClick={() => setRole('admin')}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${role === 'admin'
                ? 'bg-[#0d9488] text-white shadow-lg'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              {t.admin || 'Admin'}
            </button>
            <button
              onClick={() => setRole('viewer')}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${role === 'viewer'
                ? 'bg-emerald-600 text-white shadow-lg'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              {t.viewer || 'Viewer'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Input Fields */}
            <div className="space-y-4">
              {role === 'admin' ? (
                <div className="relative group">
                  <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${isDark ? 'text-gray-500 group-focus-within:text-teal-500' : 'text-gray-400 group-focus-within:text-teal-600'
                    }`}>
                    <LockIcon className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    autoFocus
                    disabled={success}
                    className={`w-full border rounded-2xl px-5 py-4 pl-12 text-lg tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-[#0d9488]/50 transition-all ${isDark
                      ? 'bg-gray-900/50 text-white placeholder-gray-600'
                      : 'bg-gray-50 text-gray-900 placeholder-gray-400'
                      } ${error
                        ? 'border-red-500 shake-animation'
                        : isDark ? 'border-gray-700 group-hover:border-[#0d9488]/50' : 'border-gray-200 group-hover:border-[#0d9488]/50'
                      }`}
                  />
                </div>
              ) : (
                <>
                  <div className="relative group">
                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${isDark ? 'text-gray-500 group-focus-within:text-teal-500' : 'text-gray-400 group-focus-within:text-teal-600'
                      }`}>
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <select
                      value={selectedViewerId}
                      onChange={(e) => setSelectedViewerId(e.target.value)}
                      disabled={success}
                      className={`w-full border rounded-2xl px-5 py-4 pl-12 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#0d9488]/50 transition-all appearance-none ${isDark
                        ? 'bg-gray-900/50 text-white placeholder-gray-600'
                        : 'bg-gray-50 text-gray-900 placeholder-gray-400'
                        } ${error
                          ? 'border-red-500 shake-animation'
                          : isDark ? 'border-gray-700 group-hover:border-[#0d9488]/50' : 'border-gray-200 group-hover:border-[#0d9488]/50'
                        }`}
                    >
                      <option value="" disabled>{t.selectViewer}</option>
                      {viewers.filter(v => v.active).map(v => (
                        <option key={v.id} value={v.id} className={isDark ? 'bg-gray-800' : 'bg-white'}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                    <div className={`absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none ${isDark ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  <div className="relative group">
                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${isDark ? 'text-gray-500 group-focus-within:text-teal-500' : 'text-gray-400 group-focus-within:text-teal-600'
                      }`}>
                      <LockIcon className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={success}
                      className={`w-full border rounded-2xl px-5 py-4 pl-12 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#0d9488]/50 transition-all ${isDark
                        ? 'bg-gray-900/50 text-white placeholder-gray-600'
                        : 'bg-gray-50 text-gray-900 placeholder-gray-400'
                        } ${error
                          ? 'border-red-500 shake-animation'
                          : isDark ? 'border-gray-700 group-hover:border-[#0d9488]/50' : 'border-gray-200 group-hover:border-[#0d9488]/50'
                        }`}
                    />
                  </div>
                </>
              )}

              {/* Error Message */}
              <div className={`h-6 text-center transition-all duration-300 ${error || lockoutTime > 0 ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-2'
                }`}>
                <p className="text-red-500 text-sm font-medium flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {lockoutTime > 0
                    ? t.tooManyAttempts.replace('{s}', lockoutTime.toString())
                    : (role === 'admin' ? t.invalidPassword : t.invalidCredentials)}
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={success || lockoutTime > 0 || (role === 'admin' ? !password : (!selectedViewerId || !password))}
                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transform transition-all duration-200 ${success
                  ? 'bg-green-500 text-white scale-[1.02]'
                  : (role === 'admin' ? password : (selectedViewerId && password))
                    ? 'bg-gradient-to-r from-[#0d9488] to-[#0f766e] text-white hover:shadow-[#0d9488]/25 hover:scale-[1.02] active:scale-[0.98]'
                    : isDark
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
              >
                {success ? (
                  <span className="flex items-center justify-center gap-2">
                    <SparklesIcon className="w-5 h-5 animate-spin" />
                    {t.welcome}
                  </span>
                ) : (
                  t.login
                )}
              </button>
            </div>
          </form>

          {/* Language Switcher in Login */}
          <div className="flex justify-center gap-2 mt-8">
            {(['uz', 'ru', 'en'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
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
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
};

export default AuthScreen;