import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Car, CarDamage, CAR_PARTS, DamageSeverity } from '../../../core/types/car.types';
import { updateCar } from '../../../../services/carsService';
import CarDamageModal from './CarDamageModal';

interface Props {
    car: Car;
    isDark: boolean;
    userRole: 'admin' | 'viewer';
    adminName: string;
    onClose: () => void;
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

function ImageStrip({
    images,
    onPreview,
}: {
    images: { name: string; type: string; data: string }[];
    onPreview: (src: string) => void;
}) {
    if (!images.length) return null;
    return (
        <div className="flex gap-2 mt-3 flex-wrap">
            {images.map((img, i) => (
                <button
                    key={i}
                    onClick={() => onPreview(img.data)}
                    className="w-14 h-14 rounded-[10px] overflow-hidden flex-shrink-0 border border-white/10 hover:border-teal-400/50 transition-all active:scale-90"
                >
                    <img src={img.data} alt={img.name} className="w-full h-full object-cover" />
                </button>
            ))}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CarDamageSheet({ car, isDark, userRole, adminName, onClose, onUpdated }: Props) {
    const [records,      setRecords]      = useState<CarDamage[]>(car.damage ?? []);
    const [showAddModal, setShowAddModal] = useState(false);
    const [preview,      setPreview]      = useState<string | null>(null);
    const [deletingId,   setDeletingId]   = useState<string | null>(null);
    const [filterSev,    setFilterSev]    = useState<DamageSeverity | 'all'>('all');

    // ESC to close
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [onClose]);

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
            console.error('[CarDamageSheet] save failed', err);
            setRecords(records); // rollback
        }
    }, [records, car.id, onUpdated]);

    const handleDelete = useCallback(async (id: string) => {
        setDeletingId(id);
        const next = records.filter(r => r.id !== id);
        setRecords(next);
        try {
            await updateCar(car.id, { damage: next });
            onUpdated(next);
        } catch (err) {
            console.error('[CarDamageSheet] delete failed', err);
            setRecords(records); // rollback
        } finally {
            setDeletingId(null);
        }
    }, [records, car.id, onUpdated]);

    const filtered = filterSev === 'all' ? records : records.filter(r => r.severity === filterSev);

    const severityCounts = {
        minor:    records.filter(r => r.severity === 'minor').length,
        moderate: records.filter(r => r.severity === 'moderate').length,
        severe:   records.filter(r => r.severity === 'severe').length,
    };

    const surface = isDark
        ? 'bg-[#0b1524] border-white/[0.07]'
        : 'bg-gray-50 border-gray-200';

    const cardBg = isDark
        ? 'bg-[#0f1a2a] border-white/[0.07] hover:border-white/[0.12]'
        : 'bg-white border-gray-200 hover:border-gray-300';

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[250] bg-black/50"
                style={{ backdropFilter: 'blur(4px)', animation: 'fadeIn 0.15s ease-out' }}
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                className={`fixed top-0 right-0 bottom-0 z-[260] w-full max-w-md border-l shadow-2xl flex flex-col ${surface}`}
                style={{ animation: 'slideInRight 0.22s cubic-bezier(0.22,1,0.36,1)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div className={`flex items-center gap-3 px-5 py-4 border-b flex-shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-gray-200'}`}>
                    <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 text-xl ${isDark ? 'bg-red-500/15' : 'bg-red-50'}`}>
                        💥
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className={`font-extrabold text-[15px] leading-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Shikast yozuvlari
                        </h2>
                        <p className={`text-[12px] truncate mt-0.5 ${isDark ? 'text-white/35' : 'text-gray-500'}`}>
                            {car.name} · {car.licensePlate}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0 ${isDark ? 'bg-white/[0.06] hover:bg-white/[0.12] text-white/50' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* ── Summary chips ── */}
                <div className={`px-5 py-3 border-b flex items-center gap-2 flex-wrap ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                    {([ 'all', 'minor', 'moderate', 'severe' ] as const).map(s => {
                        const count = s === 'all' ? records.length : severityCounts[s];
                        const active = filterSev === s;
                        const meta = s !== 'all' ? SEVERITY_META[s] : null;
                        return (
                            <button
                                key={s}
                                onClick={() => setFilterSev(s)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[9px] text-[11px] font-bold border transition-all active:scale-95 ${
                                    active
                                        ? s === 'all'
                                            ? isDark
                                                ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                                                : 'bg-teal-50 border-teal-400 text-teal-700'
                                            : meta!.classes
                                        : isDark
                                            ? 'border-white/[0.06] bg-white/[0.02] text-white/30 hover:text-white/50'
                                            : 'border-gray-200 bg-white text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {s !== 'all' && <span className={`w-1.5 h-1.5 rounded-full ${active ? meta!.dot : isDark ? 'bg-white/20' : 'bg-gray-300'}`} />}
                                {s === 'all' ? 'Barchasi' : meta!.label}
                                <span className={`text-[10px] font-black px-1 py-px rounded-md ${active ? 'bg-black/15' : isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}

                    {userRole === 'admin' && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-[9px] text-[11px] font-bold bg-red-500 hover:bg-red-400 text-white transition-all active:scale-95"
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
                            <p className={`text-[12px] ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
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
                                    <ImageStrip images={record.images} onPreview={setPreview} />

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
            </div>

            {/* Full-screen image preview */}
            {preview && (
                <div
                    className="fixed inset-0 z-[350] flex items-center justify-center bg-black/92"
                    onClick={() => setPreview(null)}
                    style={{ backdropFilter: 'blur(8px)' }}
                >
                    <img src={preview} alt="shikast" className="max-w-full max-h-full object-contain" />
                    <button
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
                        onClick={() => setPreview(null)}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Add damage modal */}
            {showAddModal && (
                <CarDamageModal
                    isDark={isDark}
                    carName={`${car.name} — ${car.licensePlate}`}
                    recordedBy={adminName}
                    onSave={handleAdd}
                    onClose={() => setShowAddModal(false)}
                />
            )}

            <style>{`
                @keyframes fadeIn       { from { opacity:0 }             to { opacity:1 } }
                @keyframes slideInRight { from { transform:translateX(100%) } to { transform:translateX(0) } }
            `}</style>
        </>,
        document.body
    );
}
