import React, { useState, useEffect } from 'react';
import useSound from 'use-sound';
import { useTranslation } from 'react-i18next';
import { Language } from '../types';
import correctSound from '../Sounds/correct.mp3';
import incorrectSound from '../Sounds/incorrect.mp3';

const PadlockSVG = () => (
    <svg width="112" height="112" viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="112" height="112" rx="28" fill="rgba(255,255,255,0.12)" />
        <rect x="30" y="52" width="52" height="40" rx="10" fill="rgba(255,255,255,0.90)" />
        <rect x="38" y="60" width="36" height="24" rx="6" fill="hsl(176,79%,26%)" />
        <path d="M40 52V38a16 16 0 0 1 32 0v14" stroke="rgba(255,255,255,0.90)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="56" cy="70" r="5" fill="rgba(255,255,255,0.85)" />
        <rect x="53" y="70" width="6" height="8" rx="3" fill="rgba(255,255,255,0.85)" />
    </svg>
);

interface AuthScreenProps {
    onAuthenticated: (role: 'admin' | 'viewer', viewerData?: any) => void;
    theme: 'light' | 'dark';
}

const BG = 'hsl(176deg, 79%, 26%)';

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
        setErrorMsg(msg || t('invalidPassword'));
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

    const locked   = lockoutTime > 0;
    const canSubmit = !success && !locked && phoneDigits.length === 9 && password.trim().length > 0;

    const statusText = locked
        ? t('tooManyAttempts').replace('{s}', lockoutTime.toString())
        : error
            ? (errorMsg || t('invalidPassword'))
            : success
                ? t('welcome')
                : "Tizimga kirish uchun ma'lumotlaringizni kiriting";

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
            style={{ background: BG }}
        >
            {/* Depth glows */}
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 70% 55% at 50% 25%, hsl(176,79%,36%) 0%, transparent 70%)',
            }} />
            <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none" style={{
                background: 'linear-gradient(to top, hsl(176,79%,20%), transparent)',
            }} />

            {/* Card */}
            <div className={`relative z-10 w-full max-w-sm px-6 flex flex-col items-center ${shake ? 'animate-shake' : ''}`}>

                {/* Padlock */}
                <div className={`mb-6 drop-shadow-2xl select-none transition-all duration-500 ${success ? 'scale-110' : 'scale-100'}`}>
                    <PadlockSVG />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-black text-white mb-1.5 text-center tracking-tight">
                    {success ? t('welcome') : 'Xush kelibsiz'}
                </h1>

                {/* Status / error */}
                <p
                    className="text-sm font-medium text-center mb-8 leading-snug px-4"
                    style={{ color: error && !locked ? 'rgba(255,180,170,0.95)' : 'rgba(255,255,255,0.60)' }}
                >
                    {statusText}
                </p>

                <form onSubmit={handleSubmit} className="w-full space-y-3">
                    {/* ── Phone ── */}
                    <div>
                        <label
                            className="block text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1"
                            style={{ color: 'rgba(255,255,255,0.50)' }}
                        >
                            Telefon raqam
                        </label>
                        <div
                            className={`flex items-center rounded-2xl border-2 overflow-hidden transition-all ${
                                error && phoneDigits.length !== 9
                                    ? 'border-red-300/50'
                                    : locked
                                        ? 'border-white/10'
                                        : 'border-white/25 focus-within:border-white/60'
                            }`}
                            style={{ background: 'rgba(255,255,255,0.13)' }}
                        >
                            {/* Prefix badge */}
                            <div
                                className="flex-shrink-0 flex items-center justify-center px-4 py-4 border-r"
                                style={{ borderColor: 'rgba(255,255,255,0.18)' }}
                            >
                                <span className="text-sm font-bold font-mono text-white/80 whitespace-nowrap">
                                    +998
                                </span>
                            </div>
                            {/* Number input */}
                            <input
                                type="tel"
                                value={phoneDigits}
                                onChange={e => {
                                    setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 9));
                                    clearError();
                                }}
                                placeholder="XX XXX XX XX"
                                autoComplete="tel"
                                disabled={success || locked}
                                autoFocus
                                className="flex-1 min-w-0 px-4 py-4 text-base font-mono tracking-widest focus:outline-none bg-transparent text-white placeholder-white/30 disabled:opacity-50"
                            />
                        </div>
                    </div>

                    {/* ── Password ── */}
                    <div>
                        <label
                            className="block text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1"
                            style={{ color: 'rgba(255,255,255,0.50)' }}
                        >
                            Parol
                        </label>
                        <div
                            className={`rounded-2xl border-2 overflow-hidden transition-all ${
                                error && phoneDigits.length === 9
                                    ? 'border-red-300/50'
                                    : locked
                                        ? 'border-white/10'
                                        : 'border-white/25 focus-within:border-white/60'
                            }`}
                            style={{ background: 'rgba(255,255,255,0.13)' }}
                        >
                            <input
                                type="password"
                                value={password}
                                onChange={e => { setPassword(e.target.value); clearError(); }}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                                disabled={success || locked}
                                className="w-full px-5 py-4 text-lg tracking-[0.5em] font-mono focus:outline-none bg-transparent text-white placeholder-white/30 disabled:opacity-50"
                            />
                        </div>
                    </div>

                    {/* ── Submit ── */}
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full py-4 rounded-2xl font-bold text-base mt-1 transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2"
                        style={{
                            background: canSubmit
                                ? 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.10) 100%)'
                                : 'rgba(255,255,255,0.07)',
                            color: canSubmit ? '#ffffff' : 'rgba(255,255,255,0.30)',
                            border: `2px solid ${canSubmit ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.08)'}`,
                            boxShadow: canSubmit
                                ? '0 4px 24px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.18)'
                                : 'none',
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
                                color: lang === l ? '#ffffff' : 'rgba(255,255,255,0.38)',
                                borderColor: lang === l ? 'rgba(255,255,255,0.38)' : 'transparent',
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
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.22)' }}>
                    Secure Fleet Management v2.0
                </p>
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    15%, 45%, 75% { transform: translateX(-7px); }
                    30%, 60%, 90% { transform: translateX(7px); }
                }
                .animate-shake { animation: shake 0.45s cubic-bezier(.36,.07,.19,.97) both; }
            `}</style>
        </div>
    );
};

export default AuthScreen;
