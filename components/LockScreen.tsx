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
        <div className="min-h-screen relative overflow-hidden text-white selection:bg-teal-500/30 bg-[#042421]">
            {/* Rich, vibrant Teal gradient (Avtorim brand) */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0f766e] via-[#09504a] to-[#042421] opacity-95" />

            {/* Animated orbs for premium feel */}
            <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-teal-400/20 blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-emerald-500/15 blur-[120px] pointer-events-none" />

            <main className="relative z-10 min-h-screen flex items-center justify-center px-5 py-8 sm:px-6">
                <div className={`w-full max-w-[380px] ${shake ? 'animate-shake' : ''}`}>
                    <div className="mb-8 flex flex-col items-center text-center select-none">
                        <img
                            src="/images/taksapark-logo.png"
                            alt="Taksapark"
                            className="h-10 sm:h-11 object-contain mb-8 opacity-95 drop-shadow-md"
                            style={{ filter: 'brightness(0) invert(1)' }}
                        />
                        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl">
                            <img
                                src="/images/lock.png"
                                alt=""
                                aria-hidden="true"
                                className="h-12 w-12 object-contain opacity-95 drop-shadow-lg"
                            />
                        </div>
                    </div>

                    <section className="rounded-[32px] border border-white/20 bg-white/10 p-7 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                        <div className="mb-8 text-center">
                            <h1 className="text-[24px] font-bold tracking-tight text-white">
                                {t('securityCheck', 'Xavfsizlik tekshiruvi')}
                            </h1>
                            <p className="mt-2 text-[13px] font-semibold tracking-wide text-teal-200/90 uppercase">
                                {adminName}
                            </p>
                            {maskedPhone && !error && !locked && (
                                <p className="mt-1 text-[14px] font-medium text-white/70">{maskedPhone}</p>
                            )}
                            {(error || locked) && (
                                <div className={`mt-4 rounded-xl px-4 py-3 text-[13px] font-medium backdrop-blur-md transition-all ${
                                    error && !locked
                                        ? 'bg-red-500/30 text-red-100 border border-red-500/40'
                                        : 'bg-black/20 text-white/90 border border-white/10'
                                }`}>
                                    {statusText}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <div className={`relative flex items-center rounded-2xl border transition-all duration-300 ${
                                    error
                                        ? 'border-red-500/50 bg-red-500/10'
                                        : 'border-white/10 bg-black/20 focus-within:border-teal-400/50 focus-within:bg-black/30 shadow-inner'
                                }`}>
                                    <LockIcon className={`absolute left-4 h-[18px] w-[18px] transition-colors ${error ? 'text-red-400' : 'text-white/50'}`} />
                                    <input
                                        id="lock-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => { setPassword(e.target.value); setError(false); }}
                                        placeholder={t('passwordPlaceholder', "Maxfiy so'zni kiriting...")}
                                        autoComplete="current-password"
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                        spellCheck={false}
                                        autoFocus
                                        disabled={loading || locked}
                                        className="h-[56px] w-full bg-transparent border-none focus:ring-0 focus:outline-none rounded-2xl pl-[44px] pr-[3.5rem] text-[15px] font-medium tracking-[0.02em] text-white placeholder:text-white/40 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        disabled={loading || locked}
                                        aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                                        className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                                    >
                                        {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className={`group relative flex h-[56px] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl text-[15px] font-bold transition-all duration-300 ${
                                    canSubmit
                                        ? 'bg-teal-500 text-white shadow-[0_4px_20px_rgba(20,184,166,0.4)] hover:bg-teal-400 active:scale-[0.97]'
                                        : 'cursor-not-allowed bg-white/10 text-white/40'
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <svg className="h-5 w-5 animate-spin text-white/70" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        {t('checking', 'Tekshirilmoqda...')}
                                    </>
                                ) : locked ? (
                                    <span className="font-mono tracking-widest">{lockout}s</span>
                                ) : (
                                    <>
                                        {t('unlock', 'Ochish')}
                                        <ArrowRightIcon className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1" />
                                    </>
                                )}
                            </button>
                        </form>
                    </section>

                    <p className="mt-8 text-center text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 drop-shadow-sm">
                        {t('secureFleetManagement', 'XAVFSIZ AVTOPARK BOSHQARUVI V2.0')}
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
