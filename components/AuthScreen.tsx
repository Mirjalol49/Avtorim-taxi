import React, { useState, useEffect } from 'react';
import { LockIcon, SparklesIcon, CarIcon } from './Icons';
import logo from '../Images/logo.png';
import { TRANSLATIONS } from '../translations';
import { Language } from '../types';

interface AuthScreenProps {
  onAuthenticated: (role: 'admin' | 'viewer') => void;
  lang: Language;
  setLang: (l: Language) => void;
  theme: 'light' | 'dark';
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated, lang, setLang, theme }) => {
  const [role, setRole] = useState<'admin' | 'viewer'>('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const t = TRANSLATIONS[lang];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (role === 'viewer') {
      setSuccess(true);
      setTimeout(() => {
        onAuthenticated('viewer');
      }, 800);
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
        setError(true);
        setTimeout(() => setError(false), 2000);
      }
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
                {success ? 'ACCESS GRANTED' : 'SYSTEM LOCKED'}
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

            <p className={`text-xs mt-2 text-center uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>{t.loginTitle}</p>
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
            {role === 'admin' && (
              <div className="relative group">
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
                  className={`w-full border rounded-2xl px-5 py-4 text-center text-lg tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-[#0d9488]/50 transition-all ${isDark
                    ? 'bg-gray-900/50 text-white placeholder-gray-600'
                    : 'bg-gray-50 text-gray-900 placeholder-gray-400'
                    } ${error
                      ? 'border-red-500 shake-animation'
                      : isDark ? 'border-gray-700 group-hover:border-[#0d9488]/50' : 'border-gray-200 group-hover:border-[#0d9488]/50'
                    }`}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={success}
              className={`w-full font-bold py-4 rounded-2xl shadow-lg transform transition-all duration-300 ${success
                ? 'bg-emerald-500 text-white scale-95'
                : role === 'admin'
                  ? 'bg-[#0d9488] hover:bg-[#0f766e] text-white hover:shadow-[#0d9488]/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-emerald-600/30'
                } active:scale-[0.98]`}
            >
              {success ? (
                <span className="flex items-center justify-center gap-2">
                  <SparklesIcon className="w-5 h-5" /> WELCOME BACK
                </span>
              ) : (role === 'admin' ? t.enter : t.enterAsViewer)}
            </button>
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