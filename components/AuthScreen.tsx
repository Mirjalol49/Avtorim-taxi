import React, { useState, useEffect } from 'react';
import { LockIcon, SparklesIcon, CarIcon } from './Icons';
import { TRANSLATIONS } from '../translations';
import { Language } from '../types';

interface AuthScreenProps {
  onAuthenticated: (role: 'admin' | 'viewer') => void;
  lang: Language;
  setLang: (l: Language) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated, lang, setLang }) => {
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
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  // Clock effect
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans">

      {/* Cyber Grid Background */}
      <div
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          transform: 'perspective(500px) rotateX(20deg)',
          transformOrigin: 'top center'
        }}
      />

      {/* Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse z-0"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse z-0" style={{ animationDelay: '2s' }}></div>

      <div className="z-10 w-full max-w-md p-6 relative">

        {/* Main Glass Card */}
        <div className={`backdrop-blur-2xl bg-slate-900/70 border ${success ? 'border-emerald-500/50 shadow-emerald-500/20' : 'border-slate-600/50 shadow-blue-500/10'} rounded-[32px] p-8 shadow-2xl relative overflow-hidden transition-all duration-500`}>

          {/* Status Bar */}
          <div className="flex justify-between items-center mb-8 border-b border-slate-700/50 pb-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${success ? 'bg-emerald-400 animate-ping' : 'bg-red-500'}`}></span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-400">
                {success ? 'ACCESS GRANTED' : 'SYSTEM LOCKED'}
              </span>
            </div>
            <div className="text-xs font-mono text-slate-500">
              {time.toLocaleTimeString()}
            </div>
          </div>

          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-6">
              {/* Rotating Rings */}
              <div className={`absolute -inset-4 border border-blue-500/30 rounded-full ${success ? 'scale-110 opacity-0' : 'animate-[spin_4s_linear_infinite]'}`}></div>
              <div className={`absolute -inset-2 border border-dashed border-indigo-400/30 rounded-full ${success ? 'scale-110 opacity-0' : 'animate-[spin_10s_linear_infinite_reverse]'}`}></div>

              <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${success ? 'bg-emerald-500 rotate-0' : 'bg-slate-800 rotate-0 border border-slate-600'}`}>
                <LockIcon className={`w-8 h-8 transition-all duration-500 ${success ? 'text-white' : 'text-blue-400'}`} />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white text-center flex items-center gap-2 tracking-tight">
              Avtorim<span className="text-blue-500">Taxi</span>
            </h1>
            <p className="text-slate-400 text-xs mt-2 text-center uppercase tracking-widest">{t.loginTitle}</p>
          </div>

          {/* Role Selection */}
          <div className="flex bg-slate-950/50 p-1 rounded-xl mb-6 border border-slate-700/50">
            <button
              onClick={() => setRole('admin')}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${role === 'admin' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              {t.admin || 'Admin'}
            </button>
            <button
              onClick={() => setRole('viewer')}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${role === 'viewer' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
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
                  className={`w-full bg-slate-950/50 border ${error ? 'border-red-500 shake-animation' : 'border-slate-700 group-hover:border-blue-500/50'} rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-center text-lg tracking-[0.5em] font-mono`}
                  placeholder="••••••••"
                  autoFocus
                  disabled={success}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={success}
              className={`w-full font-bold py-4 rounded-2xl shadow-lg transform transition-all duration-300 ${success
                ? 'bg-emerald-500 text-white scale-95'
                : role === 'admin'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white hover:shadow-blue-600/30'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white hover:shadow-emerald-600/30'
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
                  ? 'text-blue-400 border-blue-500/30 bg-blue-500/10'
                  : 'text-slate-600 border-transparent hover:text-slate-400'
                  }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Identity */}
        <div className="text-center mt-8 opacity-40">
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
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