import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CarDamage, DamageImage, DamageSeverity, CAR_PARTS } from '../../../core/types/car.types';
import { supabase } from '../../../../supabase';

interface Props {
    isDark: boolean;
    carId: string;
    carName: string;
    recordedBy: string;
    onSave: (record: CarDamage) => void;
    onClose: () => void;
}

const MAX_IMAGES   = 8;
const MAX_FILE_MB  = 10;
const BUCKET       = 'car-damages';

const SEVERITY_OPTIONS: { key: DamageSeverity; label: string; color: string; dot: string }[] = [
    { key: 'minor',    label: "Kichik",   color: 'border-yellow-400 bg-yellow-400/15 text-yellow-400',  dot: 'bg-yellow-400' },
    { key: 'moderate', label: "O'rtacha", color: 'border-orange-400 bg-orange-400/15 text-orange-400', dot: 'bg-orange-400' },
    { key: 'severe',   label: "Jiddiy",   color: 'border-red-400 bg-red-400/15 text-red-400',           dot: 'bg-red-400'    },
];

/** Convert a base64 dataURL to a Blob */
function dataURLtoBlob(dataUrl: string): Blob {
    const [header, b64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const binary = atob(b64);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

/** Compress an image file client-side before upload */
async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
                if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
                else                { width  = Math.round((width  * maxDim) / height); height = maxDim; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', quality);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
    });
}

/** Upload a single file to Supabase Storage, return public URL */
async function uploadDamageImage(carId: string, damageId: string, file: File, index: number): Promise<string> {
    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${carId}/${damageId}/${index}_${Date.now()}.${ext}`;

    const compressed = await compressImage(file);

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
}

export default function CarDamageModal({ isDark, carId, carName, recordedBy, onSave, onClose }: Props) {
    const [partKey,     setPartKey]     = useState<string>('front_bumper');
    const [severity,    setSeverity]    = useState<DamageSeverity>('minor');
    const [description, setDescription] = useState('');

    // Local previews before upload — {file, previewUrl}
    const [pendingFiles, setPendingFiles] = useState<{ file: File; preview: string }[]>([]);
    const [imgPreview,   setImgPreview]   = useState<string | null>(null);
    const [saving,       setSaving]       = useState(false);
    const [uploadMsg,    setUploadMsg]    = useState('');
    const [partSearch,   setPartSearch]   = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredParts  = CAR_PARTS.filter(p => p.label.toLowerCase().includes(partSearch.toLowerCase()));
    const selectedPart   = CAR_PARTS.find(p => p.key === partKey)!;

    const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = '';
        const remaining = MAX_IMAGES - pendingFiles.length;
        const toAdd     = files.slice(0, remaining);
        const tooLarge  = toAdd.filter(f => f.size > MAX_FILE_MB * 1024 * 1024);
        if (tooLarge.length) { alert(`${tooLarge.length} ta fayl ${MAX_FILE_MB}MB dan katta`); return; }

        const previews = toAdd.map(file => ({ file, preview: URL.createObjectURL(file) }));
        setPendingFiles(prev => [...prev, ...previews]);
    };

    const removeFile = (i: number) => {
        setPendingFiles(prev => {
            URL.revokeObjectURL(prev[i].preview);
            return prev.filter((_, idx) => idx !== i);
        });
    };

    const handleSave = async () => {
        if (!partKey || !description.trim()) return;
        setSaving(true);
        try {
            const damageId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

            // Upload all images in parallel
            let images: DamageImage[] = [];
            if (pendingFiles.length > 0) {
                setUploadMsg(`Rasmlar yuklanmoqda… 0 / ${pendingFiles.length}`);
                const urls = await Promise.all(
                    pendingFiles.map((pf, i) => {
                        return uploadDamageImage(carId, damageId, pf.file, i).then(url => {
                            setUploadMsg(`Rasmlar yuklanmoqda… ${i + 1} / ${pendingFiles.length}`);
                            return url;
                        });
                    }),
                );
                images = urls.map((url, i) => ({
                    name: pendingFiles[i].file.name,
                    type: 'image/jpeg',
                    url,
                }));
            }

            const record: CarDamage = {
                id: damageId,
                partKey,
                severity,
                description: description.trim(),
                images,
                recordedAt: Date.now(),
                recordedBy,
            };
            onSave(record);
        } catch (err: any) {
            console.error('[DamageModal] upload error:', err);
            alert(`Xatolik: ${err?.message ?? 'Yuklashda muammo'}`);
            setSaving(false);
            setUploadMsg('');
        }
    };

    const surface  = isDark ? 'bg-[#0f1a2a] border-white/[0.07]' : 'bg-white border-gray-200';
    const inputCls = isDark
        ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-white/25 focus:border-teal-500/40'
        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-500/60';

    return createPortal(
        <div
            className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', animation: 'fadeIn 0.15s ease-out' }}
        >
            <div
                className={`w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[24px] border shadow-2xl flex flex-col overflow-hidden ${surface}`}
                style={{ maxHeight: '94dvh', animation: 'slideUp 0.2s ease-out' }}
            >
                {/* ── Header ── */}
                <div className={`flex items-center justify-between px-5 py-4 border-b flex-shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <div>
                        <h2 className={`font-bold text-[15px] leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            💥 Shikast qo'shish
                        </h2>
                        <p className={`text-[12px] mt-0.5 ${isDark ? 'text-white/35' : 'text-gray-400'}`}>{carName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${isDark ? 'bg-white/[0.06] hover:bg-white/[0.12] text-white/50' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
                    >
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
                        <input
                            type="text"
                            placeholder="Qism qidirish…"
                            value={partSearch}
                            onChange={e => setPartSearch(e.target.value)}
                            className={`w-full px-3.5 py-2 rounded-[12px] border text-[13px] outline-none transition-all mb-2 ${inputCls}`}
                        />
                        <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                            {filteredParts.map(p => (
                                <button
                                    key={p.key}
                                    type="button"
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
                                    type="button"
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
                            TAVSIF <span className="text-red-400">*</span>
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
                            RASMLAR ({pendingFiles.length}/{MAX_IMAGES})
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {pendingFiles.map((pf, i) => (
                                <div key={i} className="relative w-20 h-20 rounded-[12px] overflow-hidden flex-shrink-0 group shadow-sm">
                                    <img
                                        src={pf.preview}
                                        alt={pf.file.name}
                                        className="w-full h-full object-cover cursor-pointer"
                                        onClick={() => setImgPreview(pf.preview)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeFile(i)}
                                        className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xl font-light"
                                    >×</button>
                                </div>
                            ))}

                            {pendingFiles.length < MAX_IMAGES && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`w-20 h-20 rounded-[12px] border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all active:scale-95 flex-shrink-0 ${
                                        isDark
                                            ? 'border-white/[0.10] text-white/25 hover:border-teal-500/40 hover:text-teal-400/60'
                                            : 'border-gray-200 text-gray-300 hover:border-teal-400 hover:text-teal-400'
                                    }`}
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                    </svg>
                                    <span className="text-[9px] font-bold">RASM</span>
                                </button>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.heic,.HEIC,.jpg,.jpeg,.png,.webp"
                            multiple
                            capture="environment"
                            className="hidden"
                            onChange={handleFileAdd}
                        />
                        <p className={`text-[11px] mt-1.5 ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                            Maks. {MAX_FILE_MB} MB · kamera yoki galereya · {MAX_IMAGES} ta
                        </p>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className={`px-5 py-4 border-t flex flex-col gap-2 flex-shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    {uploadMsg && (
                        <p className={`text-[11px] text-center font-medium ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                            ⬆️ {uploadMsg}
                        </p>
                    )}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className={`flex-1 py-2.5 rounded-[14px] text-[13px] font-bold border transition-all active:scale-95 ${isDark ? 'border-white/[0.08] text-white/40 hover:text-white/60' : 'border-gray-200 text-gray-500 hover:text-gray-700'}`}
                        >
                            Bekor
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || !description.trim()}
                            className="flex-1 py-2.5 rounded-[14px] text-[13px] font-bold bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all active:scale-95"
                        >
                            {saving ? (uploadMsg || 'Saqlanmoqda…') : '💾 Saqlash'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Full-screen image preview */}
            {imgPreview && (
                <div
                    className="fixed inset-0 z-[500] flex items-center justify-center bg-black/92"
                    onClick={() => setImgPreview(null)}
                    style={{ backdropFilter: 'blur(8px)' }}
                >
                    <img src={imgPreview} alt="preview" className="max-w-full max-h-full object-contain" />
                </div>
            )}

            <style>{`
                @keyframes fadeIn  { from { opacity:0 }                            to { opacity:1 } }
                @keyframes slideUp { from { transform:translateY(20px); opacity:0 } to { transform:translateY(0); opacity:1 } }
            `}</style>
        </div>,
        document.body,
    );
}
