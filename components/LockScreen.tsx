import React, { useState, useEffect } from 'react';
import useSound from 'use-sound';
import { useTranslation } from 'react-i18next';
import correctSound from '../Sounds/correct.mp3';
import incorrectSound from '../Sounds/incorrect.mp3';
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon } from './Icons';


interface LockScreenProps {
    adminName: string;
    adminPhone: string;
    onUnlock: (password: string) => Promise<boolean>;
}

const LockScreen: React.FC<LockScreenProps> = ({ adminName, adminPhone, onUnlock }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError]       = useState(false);
    const [loading, setLoading]   = useState(false);
    const [shake, setShake]       = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [lockout, setLockout]   = useState(0);

    const [playCorrect]   = useSound(correctSound, { volume: 0.5 });
    const [playIncorrect] = useSound(incorrectSound, { volume: 0.5 });
    const { t } = useTranslation();

    useEffect(() => {
        if (lockout <= 0) return;
        const t = setInterval(() => setLockout(p => p - 1), 1000);
        return () => clearInterval(t);
    }, [lockout]);

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (lockout > 0 || loading || !password.trim()) return;

        setLoading(true);
        const ok = await onUnlock(password);
        setLoading(false);

        if (ok) {
            playCorrect();
        } else {
            playIncorrect();
            triggerShake();
            setError(true);
            setPassword('');
            const next = attempts + 1;
            setAttempts(next);
            if (next >= 3) setLockout(30);
        }
    };

    const locked = lockout > 0;
    const canSubmit = !loading && !locked && password.trim().length > 0;
    const maskedPhone = adminPhone
        ? adminPhone.replace(/(\+\d{3})\s?(\d{2})\s?(\d{3})\s?(\d{2})\s?(\d{2})/, '$1 $2 *** ** $5')
        : '';
    const statusText = locked
        ? t('tooManyAttempts', { s: lockout })
        : error
            ? t('invalidPassword', "Parol noto'g'ri. Qayta urinib ko'ring")
            : t('enterPassword', 'Parolni kiriting');

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
                        <div className="relative flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/20 bg-[#2f7772]">
                            <img
                                src="/images/lock.png"
                                alt=""
                                aria-hidden="true"
                                className="h-14 w-14 object-contain"
                            />
                        </div>
                    </div>

                    <section className="rounded-[30px] border border-[#223344] bg-[#0f1b2a] p-6 shadow-[0_18px_36px_rgba(0,0,0,0.22)] sm:p-7">
                        <div className="mb-6 text-center">
                            <h1 className="text-[25px] font-black leading-tight tracking-tight">
                                {t('securityCheck', 'Xavfsizlik tekshiruvi')}
                            </h1>
                            <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                {adminName}
                            </p>
                            {maskedPhone && !error && !locked && (
                                <p className="mt-2 text-[12px] font-semibold text-slate-500">{maskedPhone}</p>
                            )}
                            {(error || locked) && (
                                <p className={`mt-4 rounded-2xl px-4 py-3 text-[14px] font-semibold leading-snug ${
                                    error && !locked
                                        ? 'bg-[#3a1f27] text-red-100 border border-[#7f2d36]'
                                        : 'bg-[#182838] text-slate-300 border border-[#24384a]'
                                }`}>
                                    {statusText}
                                </p>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <div className={`relative rounded-2xl border bg-[#111827] transition-all duration-200 ${
                                    error ? 'border-[#f87171]' : 'border-[#2a3a4a] focus-within:border-[#5eead4]'
                                }`}>
                                    <LockIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                    <input
                                        id="lock-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => { setPassword(e.target.value); setError(false); }}
                                        placeholder={t('passwordPlaceholder')}
                                        autoComplete="current-password"
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                        spellCheck={false}
                                        autoFocus
                                        disabled={loading || locked}
                                        className="h-14 w-full rounded-2xl bg-transparent pl-11 pr-12 text-[15px] font-semibold tracking-[0.04em] text-white outline-none placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        disabled={loading || locked}
                                        aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
                                    >
                                        {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className={`group flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-black transition-all duration-200 ${
                                    canSubmit
                                        ? 'bg-[#2dd4bf] text-[#06211f] hover:bg-[#5eead4] active:scale-[0.985]'
                                        : 'cursor-not-allowed bg-[#1f3040] text-slate-500'
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        {t('checking', 'Tekshirilmoqda...')}
                                    </>
                                ) : locked ? (
                                    <span className="font-mono">{lockout}s</span>
                                ) : (
                                    <>
                                        {t('unlock', 'Ochish')}
                                        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                    </>
                                )}
                            </button>
                        </form>
                    </section>

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

export default LockScreen;
