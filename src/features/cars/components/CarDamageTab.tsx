import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Car, CarDamage, CAR_PARTS, DamageSeverity } from '../../../core/types/car.types';
import { updateCar } from '../../../../services/carsService';
import CarDamageModal from './CarDamageModal';
import { forceDownload } from '../../../../utils/downloadHelper';
import { useConfirm } from '../../../../components/ConfirmContext';
interface Props {
    car: Car;
    isDark: boolean;
    userRole: 'admin' | 'viewer';
    adminName: string;
    onUpdated: (updatedDamage: CarDamage[]) => void;
}

// ─── Severity helpers ─────────────────────────────────────────────────────────

const SEVERITY_META: Record<DamageSeverity, { label: string; classes: string; dot: string }> = {
    minor:    { label: "Kichik",   classes: "bg-yellow-400/15 text-yellow-400 border-yellow-400/30",  dot: "bg-yellow-400"  },
    moderate: { label: "O'rtacha", classes: "bg-orange-400/15 text-orange-400 border-orange-400/30", dot: "bg-orange-400"  },
    severe:   { label: "Jiddiy",   classes: "bg-red-400/15    text-red-400    border-red-400/30",     dot: "bg-red-400"     },
};

function SeverityBadge({ severity }: { severity: DamageSeverity }) {
    const m = SEVERITY_META[severity];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[7px] border text-[11px] font-bold ${m.classes}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.dot}`} />
            {m.label}
        </span>
    );
}

function getPartLabel(key: string) {
    return CAR_PARTS.find(p => p.key === key) ?? { label: key, icon: '🔩' };
}

function formatDate(ms: number) {
    return new Date(ms).toLocaleDateString('uz-UZ', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// ─── Image strip inside a damage record ───────────────────────────────────────

function resolveSrc(img: { url?: string; data?: string }) {
    return img.url ?? img.data ?? '';
}

function ImageStrip({
    images,
    onPreview,
    onRemovePhoto,
    isDark
}: {
    images: { name: string; type: string; url?: string; data?: string }[];
    onPreview: (src: string) => void;
    onRemovePhoto?: (idx: number) => void;
    isDark?: boolean;
}) {
    if (!images.length) return null;
    return (
        <div className="flex gap-2 mt-3 flex-wrap">
            {images.map((img, i) => {
                const src = resolveSrc(img);
                if (!src) return null;
                return (
                    <div key={i} className="relative group">
                        <button
                            onClick={() => onPreview(src)}
                            className={`w-16 h-16 rounded-[12px] overflow-hidden flex-shrink-0 border transition-all active:scale-90 shadow-sm ${isDark ? 'border-white/10 hover:border-teal-400/50' : 'border-gray-200 hover:border-teal-500'}`}
                        >
                            <img
                                src={src}
                                alt={img.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        </button>
                        {onRemovePhoto && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemovePhoto(i); }}
                                title="Rasmni o'chirish"
                                className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md scale-0 group-hover:scale-100 transition-transform z-10"
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                                </svg>
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CarDamageTab({ car, isDark, userRole, adminName, onUpdated }: Props) {
    const [records,      setRecords]      = useState<CarDamage[]>(car.damage ?? []);
    const [showAddModal, setShowAddModal] = useState(false);
    const [preview,      setPreview]      = useState<string | null>(null);
    const [deletingId,   setDeletingId]   = useState<string | null>(null);
    const [filterSev,    setFilterSev]    = useState<DamageSeverity | 'all'>('all');
    const confirm = useConfirm();

    // Sync if parent car prop changes (realtime update)
    useEffect(() => { setRecords(car.damage ?? []); }, [car.damage]);

    const handleAdd = useCallback(async (record: CarDamage) => {
        const next = [record, ...records];
        setRecords(next);
        setShowAddModal(false);
        try {
            await updateCar(car.id, { damage: next });
            onUpdated(next);
        } catch (err) {
            console.error('[CarDamageTab] save failed', err);
            setRecords(records); // rollback
        }
    }, [records, car.id, onUpdated]);

    const handleDelete = useCallback(async (id: string) => {
        if (!await confirm({ title: "O'chirish", message: "Haqiqatan ham bu yozuvni o'chirmoqchimisiz?", isDanger: true })) return;
        setDeletingId(id);
        const next = records.filter(r => r.id !== id);
        try {
            await updateCar(car.id, { damage: next });
            setRecords(next);
            onUpdated(next);
        } catch (e) {
            console.error('Failed to delete', e);
        } finally {
            setDeletingId(null);
        }
    }, [records, car.id, onUpdated, confirm]);

    const handleRemovePhoto = useCallback(async (recordId: string, photoIdx: number) => {
        if (!await confirm({ title: "O'chirish", message: "Haqiqatan ham bu rasmni o'chirmoqchimisiz?", isDanger: true })) return;
        const record = records.find(r => r.id === recordId);
        if (!record) return;
        
        const newImages = [...record.images];
        newImages.splice(photoIdx, 1);
        const nextRecords = records.map(r => r.id === recordId ? { ...r, images: newImages } : r);
        
        try {
            setRecords(nextRecords);
            await updateCar(car.id, { damage: nextRecords });
            onUpdated(nextRecords);
        } catch (e) {
            console.error('Failed to remove photo', e);
            setRecords(records); // revert
            alert("Xatolik yuz berdi");
        }
    }, [records, car.id, onUpdated]);

    const filtered = filterSev === 'all' ? records : records.filter(r => r.severity === filterSev);

    const severityCounts = {
        minor:    records.filter(r => r.severity === 'minor').length,
        moderate: records.filter(r => r.severity === 'moderate').length,
        severe:   records.filter(r => r.severity === 'severe').length,
    };

    const cardBg = isDark
        ? 'bg-[#0f1a2a] border-white/[0.07] hover:border-white/[0.12]'
        : 'bg-white border-gray-200 hover:border-gray-300';

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300">
            {/* ── Summary chips (Segmented Control) ── */}
            <div className={`px-5 py-3 border-b flex items-center gap-2 flex-wrap flex-shrink-0 ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                <div className={`flex items-center gap-1 p-1 rounded-[14px] border self-start ${isDark ? 'bg-surface border-white/[0.07]' : 'bg-gray-100/70 border-gray-200'}`}>
                    {([ 'all', 'minor', 'moderate', 'severe' ] as const).map(s => {
                        const count = s === 'all' ? records.length : severityCounts[s];
                        const active = filterSev === s;
                        const meta = s !== 'all' ? SEVERITY_META[s] : null;
                        return (
                            <button
                                key={s}
                                onClick={() => setFilterSev(s)}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] text-[12px] font-bold transition-all ${
                                    active
                                        ? isDark ? 'bg-teal-500 text-white shadow-sm' : 'bg-white text-teal-700 shadow-sm border border-teal-100'
                                        : isDark ? 'text-white/35 hover:text-white/60' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {s !== 'all' && <span className={`w-1.5 h-1.5 rounded-full ${active ? meta!.dot : isDark ? 'bg-white/20' : 'bg-gray-300'}`} />}
                                {s === 'all' ? 'Barchasi' : meta!.label}
                                <span className={`min-w-[18px] h-[18px] px-1 rounded-md text-[10px] font-black flex items-center justify-center ${
                                    active
                                        ? isDark ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700'
                                        : isDark ? 'bg-white/10 text-white/40' : 'bg-gray-200 text-gray-500'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {userRole === 'admin' && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-[9px] text-[11px] font-bold bg-red-500 hover:bg-red-400 text-white transition-all active:scale-95 shadow-sm"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Qo'shish
                    </button>
                )}
            </div>

            {/* ── Records list ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {filtered.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center py-16 rounded-[20px] border ${isDark ? 'border-white/[0.05] bg-white/[0.02]' : 'border-gray-100 bg-white'}`}>
                        <div className="text-4xl mb-3">🛡️</div>
                        <p className={`font-bold text-[14px] mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            {filterSev === 'all' ? 'Shikast yozuvlari yo\'q' : 'Bu darajada yozuv yo\'q'}
                        </p>
                        <p className={`text-[12px] text-center px-4 ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                            {userRole === 'admin' && filterSev === 'all' ? 'Yangi shikast qo\'shish uchun "Qo\'shish" tugmasini bosing' : ''}
                        </p>
                    </div>
                ) : (
                    filtered.map(record => {
                        const part = getPartLabel(record.partKey);
                        return (
                            <article
                                key={record.id}
                                className={`rounded-[16px] border p-4 transition-all ${cardBg} ${deletingId === record.id ? 'opacity-40' : ''}`}
                            >
                                {/* Record header */}
                                <div className="flex items-start gap-3">
                                    <div className={`w-9 h-9 rounded-[11px] flex items-center justify-center text-lg flex-shrink-0 ${isDark ? 'bg-white/[0.05]' : 'bg-gray-50'}`}>
                                        {part.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`font-bold text-[13px] ${isDark ? 'text-white/80' : 'text-gray-800'}`}>
                                                {part.label}
                                            </span>
                                            <SeverityBadge severity={record.severity} />
                                        </div>
                                        <p className={`text-[12px] mt-1 leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-600'}`}>
                                            {record.description}
                                        </p>
                                    </div>
                                    {userRole === 'admin' && (
                                        <button
                                            onClick={() => handleDelete(record.id)}
                                            disabled={deletingId === record.id}
                                            className={`w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${isDark ? 'text-white/20 hover:bg-red-500/15 hover:text-red-400' : 'text-gray-300 hover:bg-red-50 hover:text-red-400'}`}
                                            title="O'chirish"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                {/* Images */}
                                <ImageStrip 
                                    images={record.images} 
                                    onPreview={setPreview} 
                                    isDark={isDark}
                                    onRemovePhoto={userRole === 'admin' ? (idx) => handleRemovePhoto(record.id, idx) : undefined}
                                />

                                {/* Footer meta */}
                                <div className={`flex items-center gap-3 mt-3 pt-3 border-t text-[11px] ${isDark ? 'border-white/[0.05] text-white/25' : 'border-gray-100 text-gray-400'}`}>
                                    <span>🕐 {formatDate(record.recordedAt)}</span>
                                    {record.recordedBy && <span>👤 {record.recordedBy}</span>}
                                </div>
                            </article>
                        );
                    })
                )}
            </div>

            {/* Full-screen image preview */}
            {preview && createPortal(
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Shikast rasmi"
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10"
                    style={{
                        background: 'rgba(0,0,0,0.72)',
                        backdropFilter: 'blur(8px)',
                        animation: 'rcFadeIn 0.2s ease-out',
                    }}
                    onClick={() => setPreview(null)}
                    onKeyDown={e => { if (e.key === 'Escape') setPreview(null); }}
                >
                    {/* Card */}
                    <div
                        className={`relative flex flex-col rounded-3xl shadow-2xl overflow-hidden w-full ${
                            isDark ? 'bg-[#141c2e]' : 'bg-[#f5f5f7]'
                        }`}
                        style={{
                            maxWidth: 520,
                            maxHeight: 'calc(100vh - 80px)',
                            animation: 'rcPopUp 0.28s cubic-bezier(0.34,1.56,0.64,1)',
                            boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* ── Header ── */}
                        <div
                            className={`flex items-center justify-between px-5 py-4 flex-shrink-0 border-b ${
                                isDark ? 'border-white/[0.07] bg-[#1a2336]' : 'border-black/[0.07] bg-white'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                    isDark ? 'bg-red-500/15' : 'bg-red-50'
                                }`}>
                                    <svg className="w-4.5 h-4.5 text-red-500" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className={`text-[14px] font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        Shikast rasmi
                                    </p>
                                    <p className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        🚗 {car.licensePlate}
                                    </p>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); forceDownload(preview, `shikast_${car.licensePlate || 'avto'}.jpg`); }}
                                    title="Yuklab olish"
                                    className={`w-10 h-10 flex items-center justify-center rounded-2xl font-semibold transition-all active:scale-90 ${
                                        isDark
                                            ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20'
                                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                                    }`}
                                >
                                    <svg className="w-4.5 h-4.5" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                                <button
                                    autoFocus
                                    onClick={() => setPreview(null)}
                                    title="Yopish"
                                    className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${
                                        isDark
                                            ? 'bg-white/[0.08] text-gray-300 hover:bg-white/[0.14] hover:text-white border border-white/[0.10]'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 border border-gray-200'
                                    }`}
                                >
                                    <svg className="w-4.5 h-4.5" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* ── Image area ── */}
                        <div
                            className={`flex-1 overflow-y-auto flex items-center justify-center p-4 ${
                                isDark ? 'bg-[#0e1525]' : 'bg-gray-100'
                            }`}
                            style={{ minHeight: 200 }}
                        >
                            <img
                                src={preview}
                                alt="Shikast rasmi"
                                className="w-full rounded-2xl object-contain shadow-xl"
                                style={{ maxHeight: 'calc(100vh - 240px)' }}
                            />
                        </div>

                        {/* ── Footer ── */}
                        <div className={`px-5 py-3.5 flex items-center justify-between flex-shrink-0 border-t ${
                            isDark ? 'border-white/[0.07] bg-[#1a2336]' : 'border-black/[0.07] bg-white'
                        }`}>
                            <span className={`text-[11px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                Tashqariga bosing yoki{' '}
                                <kbd className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                                    isDark ? 'bg-white/[0.08] border border-white/[0.12] text-gray-400' : 'bg-gray-100 border border-gray-200 text-gray-500'
                                }`}>Esc</kbd>{' '}
                                yopish uchun
                            </span>
                            <button
                                onClick={() => setPreview(null)}
                                className={`text-[12px] font-semibold px-3.5 py-1.5 rounded-xl transition-all active:scale-95 ${
                                    isDark ? 'text-gray-400 hover:text-white hover:bg-white/[0.08]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                Yopish
                            </button>
                        </div>
                    </div>

                    <style>{`
                        @keyframes rcFadeIn { from { opacity:0 } to { opacity:1 } }
                        @keyframes rcPopUp  { from { opacity:0; transform:scale(0.92) translateY(12px) } to { opacity:1; transform:scale(1) translateY(0) } }
                    `}</style>
                </div>,
                document.body
            )}

            {/* Add damage modal */}
            {showAddModal && (
                <CarDamageModal
                    isDark={isDark}
                    carId={car.id}
                    carName={`${car.name} — ${car.licensePlate}`}
                    recordedBy={adminName}
                    onSave={handleAdd}
                    onClose={() => setShowAddModal(false)}
                />
            )}
        </div>
    );
}
