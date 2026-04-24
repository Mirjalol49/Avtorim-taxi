import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    getAllAccounts, createAccount, toggleAccountStatus,
    resetAccountPassword, deleteAccount, generatePassword,
    formatPhone, normalizePhone, AccountRecord,
} from '../services/superAdminService';
import { supabase } from '../supabase';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentUserId: string;
}

// ── tiny helpers ─────────────────────────────────────────────────────────────

const Spinner = () => (
    <svg className="animate-spin w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
);

const CopyBtn: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };
    return (
        <button onClick={copy} className="text-xs px-2 py-1 rounded bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors font-mono">
            {copied ? '✓ Copied' : text}
        </button>
    );
};

// ── Create Account modal ──────────────────────────────────────────────────────

const CreateModal: React.FC<{ onCreated: () => void; onClose: () => void; currentUserId: string }> = ({ onCreated, onClose, currentUserId }) => {
    const [username, setUsername] = useState('');
    const [phoneDigits, setPhoneDigits] = useState('');
    const [password, setPassword] = useState(generatePassword());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [created, setCreated] = useState<{ id: string; phone: string; password: string } | null>(null);

    const handleCreate = async () => {
        const digits = phoneDigits.replace(/\D/g, '');
        if (!username.trim()) { setError("Biznes nomi kiritilmadi"); return; }
        if (digits.length !== 9) { setError("+998 dan keyin 9 ta raqam kiriting"); return; }
        if (password.length < 6) { setError("Parol kamida 6 ta belgi bo'lishi kerak"); return; }
        setError('');
        setLoading(true);
        try {
            const phone = `+998${digits}`;
            await createAccount(phone, username.trim(), password, currentUserId);
            setCreated({ id: '', phone, password });
            onCreated();
        } catch (e: any) {
            setError(e.message?.includes('unique') ? 'Bu telefon raqam allaqachon ro\'yxatda mavjud' : (e.message || 'Xatolik yuz berdi'));
        } finally {
            setLoading(false);
        }
    };

    if (created) {
        return (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-[#0B0C13] border border-teal-500/30 rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
                    <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-white text-xl font-bold mb-1">Hisob yaratildi!</h3>
                    <p className="text-gray-400 text-sm mb-6">Quyidagi ma'lumotlarni saqlang</p>
                    <div className="space-y-3 text-left bg-[#0B0C13] rounded-xl p-4 mb-6">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-xs">Biznes nomi</span>
                            <span className="text-white text-sm font-medium">{username}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-xs">Telefon</span>
                            <CopyBtn text={created.phone} />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-xs">Parol</span>
                            <CopyBtn text={created.password} />
                        </div>
                    </div>
                    <button onClick={onClose} className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold transition-colors">
                        Yopish
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#0B0C13] border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white text-lg font-bold">Yangi hisob</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Business Name */}
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Biznes nomi</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="Taksa Andijan"
                            className="w-full bg-[#0B0C13] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-teal-500 transition-colors text-sm"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Telefon raqam</label>
                        <div className="flex rounded-xl border border-white/[0.08] overflow-hidden focus-within:border-teal-500 transition-colors">
                            <span className="bg-[#181A24] px-3 flex items-center text-gray-400 text-sm font-mono border-r border-white/[0.08] select-none">+998</span>
                            <input
                                type="tel"
                                value={phoneDigits}
                                onChange={e => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 9))}
                                placeholder="93 748 91 41"
                                className="flex-1 bg-[#0B0C13] px-3 py-3 text-white placeholder-gray-600 focus:outline-none text-sm font-mono"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Parol</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={password}
                                onChange={e => setPassword(e.target.value.slice(0, 10))}
                                className="flex-1 bg-[#0B0C13] border border-white/[0.08] rounded-xl px-4 py-3 text-white font-mono tracking-widest focus:outline-none focus:border-teal-500 transition-colors text-sm"
                            />
                            <button
                                onClick={() => setPassword(generatePassword())}
                                className="px-3 py-3 rounded-xl bg-[#181A24] border border-white/[0.08] text-gray-400 hover:text-teal-400 hover:border-teal-500/50 transition-colors text-xs"
                                title="Yangi parol"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">6 ta belgi: harf + raqam</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleCreate}
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Spinner /> : 'Hisob yaratish'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Account card ──────────────────────────────────────────────────────────────

const AccountCard: React.FC<{
    account: AccountRecord;
    isSelf: boolean;
    onRefresh: () => void;
}> = ({ account, isSelf, onRefresh }) => {
    const [toggling, setToggling]     = useState(false);
    const [resetting, setResetting]   = useState(false);
    const [deleting, setDeleting]     = useState(false);
    const [newPass, setNewPass]       = useState('');
    const [showReset, setShowReset]   = useState(false);
    const [resetDone, setResetDone]   = useState('');
    const [confirmDel, setConfirmDel] = useState(false);

    const initials = account.username.slice(0, 2).toUpperCase();

    const handleToggle = async () => {
        if (isSelf) return;
        setToggling(true);
        try { await toggleAccountStatus(account.id, !account.active); onRefresh(); }
        catch { /* ignore */ }
        finally { setToggling(false); }
    };

    const handleReset = async () => {
        const p = newPass.trim() || generatePassword();
        setResetting(true);
        try {
            await resetAccountPassword(account.id, p);
            setResetDone(p);
            setShowReset(false);
            setNewPass('');
        } catch { /* ignore */ }
        finally { setResetting(false); }
    };

    const handleDelete = async () => {
        if (!confirmDel) { setConfirmDel(true); return; }
        setDeleting(true);
        try { await deleteAccount(account.id); onRefresh(); }
        catch { /* ignore */ }
        finally { setDeleting(false); }
    };

    return (
        <div className={`bg-[#0B0C13] border rounded-2xl p-5 flex flex-col gap-4 transition-all ${account.active ? 'border-white/[0.08] hover:border-white/[0.12]' : 'border-white/[0.05] opacity-60'}`}>
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    account.role === 'super_admin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-teal-500/20 text-teal-400 border border-teal-500/20'
                }`}>
                    {account.avatar
                        ? <img src={account.avatar} alt="" className="w-full h-full object-cover rounded-xl" />
                        : initials
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-bold truncate">{account.username}</p>
                        {isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/20">Siz</span>}
                        {account.role === 'super_admin' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/20">Super</span>}
                    </div>
                    {account.phone
                        ? <p className="text-gray-500 text-xs font-mono mt-0.5">{formatPhone(account.phone)}</p>
                        : <p className="text-gray-700 text-xs italic mt-0.5">Telefon yo'q</p>
                    }
                </div>
                {/* Active toggle */}
                <button
                    onClick={handleToggle}
                    disabled={toggling || isSelf}
                    title={isSelf ? 'O\'z hisobingizni o\'chirib bo\'lmaydi' : (account.active ? 'Bloklash' : 'Faollashtirish')}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${account.active ? 'bg-teal-500' : 'bg-[#181A24]'} ${isSelf ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${account.active ? 'left-5' : 'left-0.5'}`} />
                </button>
            </div>

            {/* Stats */}
            <div className="flex gap-3">
                <div className="flex-1 bg-[#181A24] rounded-xl px-3 py-2 text-center">
                    <p className="text-teal-400 font-bold text-lg leading-none">{account.driverCount}</p>
                    <p className="text-gray-500 text-[10px] mt-0.5">Haydovchi</p>
                </div>
                <div className="flex-1 bg-[#181A24] rounded-xl px-3 py-2 text-center">
                    <p className="text-blue-400 font-bold text-lg leading-none">{account.transactionCount}</p>
                    <p className="text-gray-500 text-[10px] mt-0.5">Tranzaksiya</p>
                </div>
                <div className="flex-1 bg-[#181A24] rounded-xl px-3 py-2 text-center">
                    <p className="text-gray-400 text-[10px] leading-none mt-1">
                        {new Date(account.created_ms).toLocaleDateString('uz-UZ', { day:'2-digit', month:'2-digit', year:'2-digit' })}
                    </p>
                    <p className="text-gray-600 text-[10px] mt-0.5">Sana</p>
                </div>
            </div>

            {/* Reset password */}
            {resetDone && (
                <div className="flex items-center justify-between bg-teal-500/10 border border-teal-500/20 rounded-xl px-3 py-2">
                    <span className="text-teal-400 text-xs">Yangi parol:</span>
                    <CopyBtn text={resetDone} />
                </div>
            )}
            {showReset && (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newPass}
                        onChange={e => setNewPass(e.target.value)}
                        placeholder={generatePassword()}
                        className="flex-1 bg-[#181A24] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-teal-500"
                    />
                    <button onClick={handleReset} disabled={resetting} className="px-3 py-2 rounded-lg bg-teal-500 text-white text-xs font-bold hover:bg-teal-600 transition-colors">
                        {resetting ? '...' : 'OK'}
                    </button>
                    <button onClick={() => setShowReset(false)} className="px-3 py-2 rounded-lg bg-[#181A24] text-gray-400 text-xs hover:bg-white/[0.06] transition-colors">✕</button>
                </div>
            )}

            {/* Actions */}
            {!isSelf && (
                <div className="flex gap-2 pt-1 border-t border-white/[0.05]">
                    <button
                        onClick={() => { setShowReset(v => !v); setResetDone(''); setConfirmDel(false); }}
                        className="flex-1 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 border border-white/[0.05] hover:border-blue-500/30 transition-colors"
                    >
                        🔑 Parol
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                            confirmDel
                                ? 'text-white bg-red-500 border-red-500 hover:bg-red-600'
                                : 'text-gray-400 hover:text-red-400 hover:bg-red-400/10 border-white/[0.05] hover:border-red-500/30'
                        }`}
                    >
                        {deleting ? '...' : confirmDel ? '⚠️ Tasdiqlash' : '🗑 O\'chirish'}
                    </button>
                </div>
            )}
        </div>
    );
};

// ── Password gate ─────────────────────────────────────────────────────────────

const PasswordGate: React.FC<{ onSuccess: () => void; onClose: () => void; currentUserId: string }> = ({ onSuccess, onClose, currentUserId }) => {
    const [val, setVal]     = useState('');
    const [shake, setShake] = useState(false);
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!val) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('admin_users')
                .select('id')
                .eq('id', currentUserId)
                .eq('password', val)
                .maybeSingle();
            if (!error && data) {
                onSuccess();
            } else {
                setShake(true);
                setVal('');
                setTimeout(() => setShake(false), 500);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={`bg-[#0B0C13] border border-white/[0.08] rounded-2xl p-8 w-full max-w-sm shadow-2xl transition-transform ${shake ? 'animate-bounce' : ''}`}
                style={shake ? { animation: 'shake 0.4s ease' } : {}}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-white font-bold">Super Admin</h3>
                            <p className="text-gray-500 text-xs">Parolni kiriting</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <input
                        type="password"
                        value={val}
                        onChange={e => setVal(e.target.value)}
                        placeholder="••••••••"
                        autoFocus
                        className="w-full bg-[#0B0C13] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-gray-600 font-mono tracking-widest focus:outline-none focus:border-amber-500 transition-colors text-center text-lg"
                    />
                    <button
                        type="submit"
                        disabled={!val || loading}
                        className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Spinner /> : 'Kirish'}
                    </button>
                </form>
            </div>
            <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
        </div>
    );
};

// ── Main panel ────────────────────────────────────────────────────────────────

const MainPanel: React.FC<{ onClose: () => void; currentUserId: string }> = ({ onClose, currentUserId }) => {
    const [accounts, setAccounts] = useState<AccountRecord[]>([]);
    const [loading, setLoading]   = useState(true);
    const [search, setSearch]     = useState('');
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try { setAccounts(await getAllAccounts()); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = accounts.filter(a =>
        a.username.toLowerCase().includes(search.toLowerCase()) ||
        (a.phone ?? '').includes(search)
    );

    const totalDrivers = accounts.reduce((s, a) => s + a.driverCount, 0);
    const totalTx      = accounts.reduce((s, a) => s + a.transactionCount, 0);
    const activeCount  = accounts.filter(a => a.active).length;

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[#0d1117] overflow-hidden" style={{ animation: 'modalPop 0.2s ease-out' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-[#0B0C13] flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-lg leading-none">Super Admin</h1>
                        <p className="text-gray-500 text-xs mt-0.5">Barcha hisoblarni boshqarish</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/[0.04]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Stats bar */}
            <div className="flex gap-4 px-6 py-4 border-b border-white/[0.05] bg-[#0B0C13] flex-shrink-0 overflow-x-auto">
                {[
                    { label: 'Jami hisoblar', value: accounts.length, color: 'text-white' },
                    { label: 'Faol', value: activeCount, color: 'text-teal-400' },
                    { label: 'Jami haydovchilar', value: totalDrivers, color: 'text-blue-400' },
                    { label: 'Tranzaksiyalar', value: totalTx, color: 'text-purple-400' },
                ].map(s => (
                    <div key={s.label} className="bg-[#0B0C13] border border-white/[0.05] rounded-xl px-4 py-2.5 flex-shrink-0 min-w-[110px]">
                        <p className={`text-xl font-bold leading-none ${s.color}`}>{s.value}</p>
                        <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0">
                <div className="relative flex-1 max-w-xs">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 12a7.5 7.5 0 0012.15 4.65z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Qidirish..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-[#0B0C13] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-teal-500 transition-colors"
                    />
                </div>
                <button
                    onClick={() => setCreating(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm transition-colors shadow-sm"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Yangi hisob
                </button>
                <button onClick={load} className="p-2.5 rounded-xl bg-[#181A24] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors">
                    <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* Accounts grid */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Spinner />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 text-gray-600">
                        <p className="text-lg">Hisob topilmadi</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map(account => (
                            <AccountCard
                                key={account.id}
                                account={account}
                                isSelf={account.id === currentUserId}
                                onRefresh={load}
                            />
                        ))}
                    </div>
                )}
            </div>

            {creating && (
                <CreateModal
                    onCreated={load}
                    onClose={() => setCreating(false)}
                    currentUserId={currentUserId}
                />
            )}
        </div>
    );
};

// ── Root export ───────────────────────────────────────────────────────────────

const SuperAdminPanel: React.FC<Props> = ({ isOpen, onClose, currentUserId }) => {
    const [authed, setAuthed] = useState(false);

    useEffect(() => {
        if (!isOpen) setAuthed(false);
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        authed
            ? <MainPanel onClose={onClose} currentUserId={currentUserId} />
            : <PasswordGate onSuccess={() => setAuthed(true)} onClose={onClose} currentUserId={currentUserId} />,
        document.body
    );
};

export default SuperAdminPanel;
