import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CarDamage, DamageImage, DamageSeverity, CAR_PARTS } from '../../../core/types/car.types';

interface Props {
    isDark: boolean;
    carName: string;
    recordedBy: string;
    onSave: (record: CarDamage) => void;
    onClose: () => void;
}

const MAX_IMAGES = 6;
const MAX_FILE_MB = 5;

const SEVERITY_OPTIONS: { key: DamageSeverity; label: string; color: string; dot: string }[] = [
    { key: 'minor',    label: "Kichik",   color: 'border-yellow-400 bg-yellow-400/15 text-yellow-400',   dot: 'bg-yellow-400'  },
    { key: 'moderate', label: "O'rtacha", color: 'border-orange-400 bg-orange-400/15 text-orange-400',  dot: 'bg-orange-400'  },
    { key: 'severe',   label: "Jiddiy",   color: 'border-red-400    bg-red-400/15    text-red-400',      dot: 'bg-red-400'     },
];

export default function CarDamageModal({ isDark, carName, recordedBy, onSave, onClose }: Props) {
    const [partKey,      setPartKey]      = useState<string>('front_bumper');
    const [severity,     setSeverity]     = useState<DamageSeverity>('minor');
    const [description,  setDescription]  = useState('');
    const [images,       setImages]       = useState<DamageImage[]>([]);
    const [imgPreview,   setImgPreview]   = useState<string | null>(null); // full-screen preview
    const [saving,       setSaving]       = useState(false);
    const [partSearch,   setPartSearch]   = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredParts = CAR_PARTS.filter(p =>
        p.label.toLowerCase().includes(partSearch.toLowerCase())
    );
    const selectedPart = CAR_PARTS.find(p => p.key === partKey)!;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = '';
        const remaining = MAX_IMAGES - images.length;
        const toProcess = files.slice(0, remaining);

        toProcess.forEach(file => {
            if (file.size > MAX_FILE_MB * 1024 * 1024) return;
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages(prev => [
                    ...prev,
                    { name: file.name, type: file.type, data: reader.result as string },
                ]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (i: number) =>
        setImages(prev => prev.filter((_, idx) => idx !== i));

    const handleSave = () => {
        if (!partKey || !description.trim()) return;
        setSaving(true);
        const record: CarDamage = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            partKey,
            severity,
            description: description.trim(),
            images,
            recordedAt: Date.now(),
            recordedBy,
        };
        onSave(record);
    };

    const surface   = isDark ? 'bg-[#0f1a2a] border-white/[0.07]' : 'bg-white border-gray-200';
    const inputCls  = isDark
        ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-white/25 focus:border-teal-500/40'
        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-500/60';

    return createPortal(
        <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(6px)', animation: 'fadeIn 0.15s ease-out' }}>

            <div className={`w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[24px] border shadow-2xl flex flex-col overflow-hidden ${surface}`}
                style={{ maxHeight: '92dvh', animation: 'slideUp 0.2s ease-out' }}>

                {/* ── Header ── */}
                <div className={`flex items-center justify-between px-5 py-4 border-b flex-shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <div>
                        <h2 className={`font-bold text-[15px] leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            💥 Shikast qo'shish
                        </h2>
                        <p className={`text-[12px] mt-0.5 ${isDark ? 'text-white/35' : 'text-gray-400'}`}>{carName}</p>
                    </div>
                    <button onClick={onClose}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${isDark ? 'bg-white/[0.06] hover:bg-white/[0.12] text-white/50' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* ── Scrollable body ── */}
                <div className="overflow-y-auto flex-1 p-5 space-y-5">

                    {/* Part selector */}
                    <div>
                        <label className={`block text-[12px] font-bold mb-2 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            ZARARLANГАН QISM
                        </label>
                        {/* Search */}
                        <input
                            type="text"
                            placeholder="Qism qidirish…"
                            value={partSearch}
                            onChange={e => setPartSearch(e.target.value)}
                            className={`w-full px-3.5 py-2 rounded-[12px] border text-[13px] outline-none transition-all mb-2 ${inputCls}`}
                        />
                        {/* Grid */}
                        <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                            {filteredParts.map(p => (
                                <button
                                    key={p.key}
                                    onClick={() => { setPartKey(p.key); setPartSearch(''); }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-[10px] border text-[12px] font-medium text-left transition-all active:scale-95 ${
                                        partKey === p.key
                                            ? isDark
                                                ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
                                                : 'bg-teal-50 border-teal-400 text-teal-700'
                                            : isDark
                                                ? 'bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.07] hover:text-white/70'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                                    }`}
                                >
                                    <span className="text-base flex-shrink-0">{p.icon}</span>
                                    <span className="truncate">{p.label}</span>
                                </button>
                            ))}
                            {filteredParts.length === 0 && (
                                <p className={`col-span-2 text-center py-3 text-[12px] ${isDark ? 'text-white/25' : 'text-gray-400'}`}>
                                    Topilmadi
                                </p>
                            )}
                        </div>
                        {/* Selected chip */}
                        <div className={`mt-2 flex items-center gap-2 text-[12px] font-semibold ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                            <span>Tanlangan:</span>
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[12px] font-bold ${isDark ? 'bg-teal-500/15 text-teal-300' : 'bg-teal-50 text-teal-700'}`}>
                                {selectedPart.icon} {selectedPart.label}
                            </span>
                        </div>
                    </div>

                    {/* Severity */}
                    <div>
                        <label className={`block text-[12px] font-bold mb-2 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            SHIKAST DARAJASI
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {SEVERITY_OPTIONS.map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => setSeverity(opt.key)}
                                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-[12px] border text-[13px] font-bold transition-all active:scale-95 ${
                                        severity === opt.key
                                            ? opt.color
                                            : isDark
                                                ? 'border-white/[0.06] bg-white/[0.03] text-white/35 hover:text-white/60'
                                                : 'border-gray-200 bg-white text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${severity === opt.key ? opt.dot : isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className={`block text-[12px] font-bold mb-2 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            TAVSIF
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Shikast haqida qisqacha yozing…"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className={`w-full px-3.5 py-3 rounded-[12px] border text-[13px] outline-none transition-all resize-none leading-relaxed ${inputCls}`}
                        />
                    </div>

                    {/* Images */}
                    <div>
                        <label className={`block text-[12px] font-bold mb-2 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            RASMLAR ({images.length}/{MAX_IMAGES})
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {images.map((img, i) => (
                                <div key={i} className="relative w-16 h-16 rounded-[10px] overflow-hidden flex-shrink-0 group">
                                    <img
                                        src={img.data}
                                        alt={img.name}
                                        className="w-full h-full object-cover cursor-pointer"
                                        onClick={() => setImgPreview(img.data)}
                                    />
                                    <button
                                        onClick={() => removeImage(i)}
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-lg"
                                    >×</button>
                                </div>
                            ))}
                            {images.length < MAX_IMAGES && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`w-16 h-16 rounded-[10px] border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all active:scale-95 flex-shrink-0 ${
                                        isDark
                                            ? 'border-white/[0.10] text-white/25 hover:border-teal-500/40 hover:text-teal-400/60'
                                            : 'border-gray-200 text-gray-300 hover:border-teal-400 hover:text-teal-400'
                                    }`}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="text-[9px] font-bold">RASM</span>
                                </button>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                        <p className={`text-[11px] mt-1.5 ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                            Maksimal {MAX_FILE_MB} MB · har biri
                        </p>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className={`px-5 py-4 border-t flex gap-3 flex-shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <button
                        onClick={onClose}
                        className={`flex-1 py-2.5 rounded-[14px] text-[13px] font-bold border transition-all active:scale-95 ${isDark ? 'border-white/[0.08] text-white/40 hover:text-white/60' : 'border-gray-200 text-gray-500 hover:text-gray-700'}`}
                    >
                        Bekor
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !description.trim()}
                        className="flex-1 py-2.5 rounded-[14px] text-[13px] font-bold bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all active:scale-95"
                    >
                        {saving ? 'Saqlanmoqda…' : '💾 Saqlash'}
                    </button>
                </div>
            </div>

            {/* Full-screen image preview */}
            {imgPreview && (
                <div
                    className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90"
                    onClick={() => setImgPreview(null)}
                >
                    <img src={imgPreview} alt="preview" className="max-w-full max-h-full object-contain" />
                </div>
            )}

            <style>{`
                @keyframes fadeIn  { from { opacity:0 }              to { opacity:1 } }
                @keyframes slideUp { from { transform:translateY(20px); opacity:0 } to { transform:translateY(0); opacity:1 } }
            `}</style>
        </div>,
        document.body
    );
}
