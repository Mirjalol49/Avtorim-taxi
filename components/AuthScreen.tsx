import React, { useState, useEffect } from 'react';
import useSound from 'use-sound';
import { useTranslation } from 'react-i18next';
import { Language } from '../types';
import correctSound from '../Sounds/correct.mp3';
import incorrectSound from '../Sounds/incorrect.mp3';
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, LogInIcon, PhoneIcon } from './Icons';


interface AuthScreenProps {
    onAuthenticated: (role: 'admin' | 'viewer', viewerData?: any) => void;
    theme: 'light' | 'dark';
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
    const [phoneDigits, setPhoneDigits] = useState('');
    const [password, setPassword]       = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
            setErrorMsg(t('phoneNineDigitsError'));
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

    const statusText = locked
        ? t('tooManyAttempts', { s: lockoutTime })
        : error
            ? (errorMsg || t('invalidPassword'))
            : success
                ? t('welcome')
                : t('loginSubtitle');

    const formatPhone = (digits: string) => {
        if (digits.length <= 2) return digits;
        if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
        if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
        return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
    };

    const inputBase = 'h-14 w-full rounded-2xl border px-4 text-[15px] font-semibold outline-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60';
    const inputChrome = 'bg-[#111827] border-[#2a3a4a] text-white placeholder:text-slate-500 focus:border-[#5eead4]';

    return (
        <div
            className="min-h-screen relative overflow-hidden bg-[#0f766e] text-white"
        >
            <div className="absolute inset-0 bg-[#0f766e]" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-[#0c5f59]" />

            <main className="relative z-10 min-h-screen flex items-center justify-center px-5 py-8 sm:px-6">
                <div className={`w-full max-w-[440px] ${shake ? 'animate-shake' : ''}`}>
                    <div className="mb-7 flex flex-col items-center text-center select-none">
                        <img
                            src="/images/taksapark-logo.png"
                            alt="Taksapark"
                            className="h-11 sm:h-12 object-contain mb-5"
                            style={{ filter: 'brightness(0) invert(1)' }}
                        />
                        <div className={`relative flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/20 bg-[#2f7772] transition-all duration-300 ${success ? 'scale-[1.02] bg-[#2f7772]' : ''}`}>
                            <img
                                src="/images/lock.png"
                                alt=""
                                aria-hidden="true"
                                className="h-14 w-14 object-contain"
                            />
                        </div>
                    </div>

                    <section className="rounded-[28px] border border-[#223344] bg-[#0f1b2a] p-5 shadow-[0_18px_36px_rgba(0,0,0,0.22)] sm:p-6">
                        <div className="mb-6">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#18384a] text-[#99f6e4]">
                                    <LogInIcon className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                    <h1 className="text-[24px] font-black leading-tight tracking-tight">
                                        {t('welcome')}
                                    </h1>
                                    <p className="mt-0.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                        {t('secureFleetAccess')}
                                    </p>
                                </div>
                            </div>

                            <p
                                className={`min-h-[40px] rounded-2xl px-4 py-3 text-[14px] font-medium leading-snug ${
                                    error && !locked
                                        ? 'bg-[#3a1f27] text-red-100 border border-[#7f2d36]'
                                        : success
                                            ? 'bg-[#123629] text-emerald-100 border border-[#1f6f55]'
                                            : 'bg-[#182838] text-slate-300 border border-[#24384a]'
                                }`}
                            >
                                {statusText}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <label htmlFor="login-phone" className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                        {t('phoneNumber')}
                                    </label>
                                    <span className="text-[12px] font-semibold text-slate-500">
                                        {phoneDigits.length}/9
                                    </span>
                                </div>
                                <div className={`flex h-14 overflow-hidden rounded-2xl border transition-all duration-200 ${
                                    error && phoneDigits.length !== 9
                                        ? 'border-[#f87171]'
                                        : 'border-[#2a3a4a] focus-within:border-[#5eead4]'
                                } bg-[#111827]`}>
                                    <div className="flex items-center gap-2 border-r border-[#2a3a4a] bg-[#182838] px-4 text-[15px] font-black text-[#ccfbf1]">
                                        <PhoneIcon className="h-4 w-4 text-[#99f6e4]" />
                                        +998
                                    </div>
                                    <input
                                        id="login-phone"
                                        type="tel"
                                        inputMode="numeric"
                                        value={formatPhone(phoneDigits)}
                                        onChange={e => {
                                            setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 9));
                                            clearError();
                                        }}
                                        placeholder="90 123 45 67"
                                        autoComplete="tel"
                                        disabled={success || locked}
                                        autoFocus
                                        className="min-w-0 flex-1 bg-transparent px-4 text-[17px] font-bold tracking-[0.08em] text-white outline-none placeholder:text-slate-600 disabled:opacity-60"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="login-password" className="mb-2 block text-[12px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                    {t('password')}
                                </label>
                                <div className="relative">
                                    <LockIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => { setPassword(e.target.value); clearError(); }}
                                        placeholder={t('passwordPlaceholder')}
                                        autoComplete="current-password"
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                        spellCheck={false}
                                        disabled={success || locked}
                                        className={`${inputBase} ${inputChrome} pl-11 pr-12 tracking-[0.08em]`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        disabled={success || locked}
                                        aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
                                    >
                                        {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!canSubmit || loading}
                                className={`group flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-black transition-all duration-200 ${
                                    canSubmit && !loading
                                        ? 'bg-[#2dd4bf] text-[#06211f] hover:bg-[#5eead4] active:scale-[0.985]'
                                        : 'cursor-not-allowed bg-[#1f3040] text-slate-500'
                                }`}
                            >
                                {success ? (
                                    <>
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        {t('welcome')}
                                    </>
                                ) : locked ? (
                                    <span className="font-mono">{lockoutTime}s</span>
                                ) : loading ? (
                                    <>
                                        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        {t('signingIn')}
                                    </>
                                ) : (
                                    <>
                                        {t('login')}
                                        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                    </>
                                )}
                            </button>
                        </form>
                    </section>

                    <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-[#175f59] p-1.5">
                        {(['uz', 'ru', 'en'] as Language[]).map(l => (
                            <button
                                key={l}
                                type="button"
                                onClick={() => {
                                    localStorage.setItem('avtorim_lang', l);
                                    i18n.changeLanguage(l);
                                }}
                                className={`h-10 flex-1 rounded-xl text-[12px] font-black uppercase tracking-[0.08em] transition-all ${
                                    lang === l
                                        ? 'bg-white text-[#0b1424]'
                                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                                }`}
                                aria-pressed={lang === l}
                            >
                                {l}
                            </button>
                        ))}
                    </div>

                    <p className="mt-6 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-white/[0.28]">
                        {t('secureFleetManagement')}
                    </p>
                </div>
            </main>

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
