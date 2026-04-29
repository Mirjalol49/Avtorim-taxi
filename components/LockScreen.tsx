import React, { useState, useEffect } from 'react';
import useSound from 'use-sound';
import correctSound from '../Sounds/correct.mp3';
import incorrectSound from '../Sounds/incorrect.mp3';


interface LockScreenProps {
    adminName: string;
    adminPhone: string;
    onUnlock: (password: string) => Promise<boolean>;
}

const BG = 'hsl(176deg, 79%, 26%)';

const LockScreen: React.FC<LockScreenProps> = ({ adminName, adminPhone, onUnlock }) => {
    const [password, setPassword] = useState('');
    const [error, setError]       = useState(false);
    const [loading, setLoading]   = useState(false);
    const [shake, setShake]       = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [lockout, setLockout]   = useState(0);

    const [playCorrect]   = useSound(correctSound, { volume: 0.5 });
    const [playIncorrect] = useSound(incorrectSound, { volume: 0.5 });

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

            <div className={`relative z-10 w-full max-w-xs px-6 flex flex-col items-center ${shake ? 'animate-shake' : ''}`}>

                {/* Padlock */}
                <div className="mb-6 drop-shadow-2xl select-none">
                    <img
                        src="/images/lock.png"
                        alt="lock"
                        width={108}
                        height={108}
                        className="object-contain"
                    />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-black text-white mb-1 text-center tracking-tight">
                    Xavfsizlik Tekshiruvi
                </h1>
                <p className="text-sm font-medium text-center mb-8" style={{ color: 'rgba(255,255,255,0.60)' }}>
                    {locked
                        ? `Juda ko'p urinish. ${lockout}s kuting`
                        : error
                            ? 'Parol noto\'g\'ri. Qayta urinib ko\'ring'
                            : `${adminName}, parolni kiriting`}
                </p>

                <form onSubmit={handleSubmit} className="w-full space-y-4">
                    {/* Password input */}
                    <div
                        className={`rounded-2xl border-2 overflow-hidden transition-all ${
                            error   ? 'border-red-300/50'
                            : locked ? 'border-white/10'
                            : 'border-white/25 focus-within:border-white/60'
                        }`}
                        style={{ background: 'rgba(255,255,255,0.13)' }}
                    >
                        <input
                            type="password"
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(false); }}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            autoFocus
                            disabled={loading || locked}
                            className="w-full px-5 py-4 text-xl tracking-[0.6em] font-mono focus:outline-none bg-transparent text-white placeholder-white/30 text-center disabled:opacity-50"
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2"
                        style={{
                            background: canSubmit
                                ? 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.10) 100%)'
                                : 'rgba(255,255,255,0.07)',
                            color: canSubmit ? '#ffffff' : 'rgba(255,255,255,0.30)',
                            border: `2px solid ${canSubmit ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.08)'}`,
                            boxShadow: canSubmit ? '0 4px 24px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.18)' : 'none',
                        }}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Tekshirilmoqda...
                            </>
                        ) : locked ? (
                            <span className="font-mono">{lockout}s</span>
                        ) : (
                            <>
                                Ochish
                                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Branding */}
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

export default LockScreen;
