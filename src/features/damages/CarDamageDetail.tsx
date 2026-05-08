import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Car, CarDamage, DamageImage, DamageSeverity, CAR_PARTS } from '../../core/types/car.types';
import { updateCar } from '../../../services/carsService';
import { supabase } from '../../../supabase';

interface Props {
    car: Car;
    allCars: Car[];
    userRole: 'admin' | 'viewer';
    adminName: string;
    theme: 'light' | 'dark';
    onBack: () => void;
    onCarChange: (id: string) => void;
}

const SEV_DEF: Record<DamageSeverity, { labelKey: string; fallback: string; bg: string; text: string; dot: string; border: string; pill: string }> = {
    minor:    { labelKey: 'minorLabel', fallback: 'Kichik', bg: 'bg-yellow-400/15', text: 'text-yellow-500', dot: 'bg-yellow-400', border: 'border-yellow-400/40', pill: 'bg-yellow-400/20 text-yellow-400' },
    moderate: { labelKey: 'moderateLabel', fallback: "O'rtacha", bg: 'bg-orange-400/15', text: 'text-orange-500', dot: 'bg-orange-400', border: 'border-orange-400/40', pill: 'bg-orange-400/20 text-orange-400' },
    severe:   { labelKey: 'severeLabel', fallback: 'Jiddiy', bg: 'bg-red-400/15', text: 'text-red-500', dot: 'bg-red-400', border: 'border-red-400/40', pill: 'bg-red-500/20 text-red-400' },
};


async function uploadImg(file: File, carId: string, dmgId: string, idx: number): Promise<string> {
    const blob: Blob = await new Promise(r => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width: w, height: h } = img;
            if (w > 1600 || h > 1600) { if (w > h) { h = Math.round(h * 1600 / w); w = 1600; } else { w = Math.round(w * 1600 / h); h = 1600; } }
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            c.getContext('2d')!.drawImage(img, 0, 0, w, h);
            c.toBlob(b => r(b ?? file), 'image/jpeg', 0.82);
        };
        img.onerror = () => { URL.revokeObjectURL(url); r(file); };
        img.src = url;
    });
    const path = `${carId}/${dmgId}/${idx}_${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('car-damages').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (error) throw error;
    return supabase.storage.from('car-damages').getPublicUrl(path).data.publicUrl;
}

function fmt(ms: number) { return new Date(ms).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function imgSrc(img: DamageImage) { return img.url ?? img.data ?? ''; }

export default function CarDamageDetail({ car, allCars, userRole, adminName, theme, onBack, onCarChange }: Props) {
    const { t } = useTranslation();
    const isDark = theme === 'dark';
    const damages = car.damage ?? [];


    const [showForm, setShowForm] = useState(false);
    const [partKey, setPartKey]   = useState('front_bumper');
    const [sev, setSev]           = useState<DamageSeverity>('minor');
    const [desc, setDesc]         = useState('');
    const [files, setFiles]       = useState<{ file: File; prev: string }[]>([]);
    const [saving, setSaving]     = useState(false);
    const [preview, setPreview]   = useState<string | null>(null);
    const [partQ, setPartQ]       = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setPartKey('front_bumper'); setSev('minor'); setDesc(''); setPartQ('');
        files.forEach(f => URL.revokeObjectURL(f.prev)); setFiles([]);
    };

    const save = useCallback(async () => {
        if (!desc.trim()) return;
        setSaving(true);
        try {
            const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            const images: DamageImage[] = files.length
                ? await Promise.all(files.map((f, i) => uploadImg(f.file, car.id, id, i).then(url => ({ name: f.file.name, type: 'image/jpeg', url }))))
                : [];
            const record: CarDamage = { id, partKey, severity: sev, description: desc.trim(), images, recordedAt: Date.now(), recordedBy: adminName };
            await updateCar(car.id, { damage: [record, ...damages] });
            reset(); setShowForm(false);
        } catch (e: any) { alert('Xatolik: ' + e?.message); }
        finally { setSaving(false); }
    }, [car.id, damages, desc, partKey, sev, files, adminName]);

    const del = useCallback(async (dmgId: string) => {
        await updateCar(car.id, { damage: damages.filter(d => d.id !== dmgId) });
    }, [car.id, damages]);

    const inp = isDark
        ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-white/25 focus:border-teal-500/40'
        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-400';

    const parts = CAR_PARTS.filter(p => p.label.toLowerCase().includes(partQ.toLowerCase()));

    const sevCounts = {
        severe:   damages.filter(d => d.severity === 'severe').length,
        moderate: damages.filter(d => d.severity === 'moderate').length,
        minor:    damages.filter(d => d.severity === 'minor').length,
    };

    return (
        <div className="h-full flex flex-col gap-0">
            {/* ── Full-width hero ── */}
            <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: 280 }}>
                {car.avatar
                    ? <img src={car.avatar} alt={car.name} className="w-full h-full object-cover" />
                    : <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-[#0a1020]' : 'bg-gray-200'}`}><span className="text-8xl opacity-10">🚗</span></div>
                }
                {/* gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* Back */}
                <button onClick={onBack}
                    className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white text-[13px] font-bold transition-all active:scale-90">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                    {t('back', 'Orqaga')}
                </button>

                {/* Car info over hero */}
                <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
                    <p className="text-white/60 text-[13px] font-semibold uppercase tracking-widest mb-1">{t('carLabel', 'Avtomobil')}</p>
                    <h1 className="text-white font-extrabold text-3xl drop-shadow-lg">{car.name}</h1>
                    <p className="text-white font-mono font-black text-2xl tracking-[0.25em] drop-shadow-lg mt-1">{car.licensePlate}</p>

                    {/* Severity chips */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {damages.length === 0
                            ? <span className="px-3 py-1 rounded-xl bg-white/15 border border-white/20 text-white/60 text-[12px] font-bold">🛡️ {t('noDamage', "Shikast yo'q")}</span>
                            : (Object.entries(sevCounts) as [DamageSeverity, number][]).filter(([, n]) => n > 0).map(([s, n]) => {
                                const m = SEV_DEF[s];
                                return (
                                <span key={s} className={`px-3 py-1 rounded-xl text-[12px] font-bold border border-white/20 ${m.pill}`}>
                                    {n} {t(m.labelKey, m.fallback).toLowerCase()}
                                </span>
                            )})
                        }
                    </div>
                </div>
            </div>



            {/* ── Main content: two columns on desktop ── */}
            <div className="flex flex-col lg:flex-row gap-4 flex-1 mt-2">

                {/* LEFT: Add form */}
                <div className="lg:w-80 xl:w-96 flex-shrink-0">
                    {userRole === 'admin' && !showForm && (
                        <button onClick={() => setShowForm(true)}
                            className={`w-full py-4 rounded-2xl border-2 border-dashed text-[14px] font-bold transition-all active:scale-[0.98] mb-4 ${isDark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50' : 'border-red-300 text-red-500 hover:bg-red-50'}`}>
                            {t('addNewDamageBtn', "+ Yangi shikast qo'shish")}
                        </button>
                    )}

                    {showForm && userRole === 'admin' && (
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#161c26] border-white/[0.07]' : 'bg-white border-gray-200'}`}>
                            <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-100 bg-gray-50'}`}>
                                <p className={`text-[12px] font-black uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{t('newDamageTitle', 'Yangi shikast')}</p>
                                <button onClick={() => { reset(); setShowForm(false); }} className={`w-6 h-6 flex items-center justify-center rounded-lg transition-all ${isDark ? 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* Part */}
                                <div>
                                    <p className={`text-[11px] font-bold mb-1.5 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{t('damagePart', 'QISM')}</p>
                                    <input type="text" placeholder={t('searchPart', 'Qidirish…')} value={partQ} onChange={e => setPartQ(e.target.value)}
                                        className={`w-full px-3 py-1.5 rounded-xl border text-[12px] outline-none mb-2 ${inp}`} />
                                    <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                                        {parts.map(p => (
                                            <button key={p.key} type="button" onClick={() => { setPartKey(p.key); setPartQ(''); }}
                                                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-[11px] font-medium text-left transition-all active:scale-95 ${
                                                    partKey === p.key
                                                        ? isDark ? 'bg-teal-500/20 border-teal-500/50 text-teal-300' : 'bg-teal-50 border-teal-500 text-teal-700'
                                                        : isDark ? 'bg-white/[0.03] border-white/[0.07] text-white/50 hover:text-white/80' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-white'
                                                }`}>
                                                <span>{p.icon}</span><span className="truncate">{p.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Severity */}
                                <div>
                                    <p className={`text-[11px] font-bold mb-1.5 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{t('damageSeverity', 'DARAJA')}</p>
                                    <div className="flex gap-2">
                                        {(Object.entries(SEV_DEF) as [DamageSeverity, typeof SEV_DEF[DamageSeverity]][]).map(([k, m]) => (
                                            <button key={k} type="button" onClick={() => setSev(k)}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-[12px] font-bold transition-all active:scale-95 ${
                                                    sev === k ? `${m.bg} ${m.text} ${m.border}` : isDark ? 'border-white/[0.07] text-white/30 hover:text-white/60' : 'border-gray-200 text-gray-400 hover:text-gray-600'
                                                }`}>
                                                <span className={`w-2 h-2 rounded-full ${sev === k ? m.dot : isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
                                                {t(m.labelKey, m.fallback)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Desc */}
                                <div>
                                    <p className={`text-[11px] font-bold mb-1.5 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{t('damageDesc', 'TAVSIF')} <span className="text-red-400">*</span></p>
                                    <textarea rows={3} placeholder={t('damageShortDesc', 'Shikast haqida qisqacha yozing…')} value={desc} onChange={e => setDesc(e.target.value)}
                                        className={`w-full px-3 py-2.5 rounded-xl border text-[13px] outline-none resize-none ${inp}`} />
                                </div>

                                {/* Photos */}
                                <div>
                                    <p className={`text-[11px] font-bold mb-1.5 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{t('damagePhotos', 'RASMLAR')} ({files.length}/8)</p>
                                    <div className="flex flex-wrap gap-2">
                                        {files.map((f, i) => (
                                            <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden group">
                                                <img src={f.prev} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setPreview(f.prev)} />
                                                <button type="button" onClick={() => setFiles(p => { URL.revokeObjectURL(p[i].prev); return p.filter((_, j) => j !== i); })}
                                                    className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xl transition-opacity">×</button>
                                            </div>
                                        ))}
                                        {files.length < 8 && (
                                            <button type="button" onClick={() => fileRef.current?.click()}
                                                className={`w-16 h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${isDark ? 'border-white/10 text-white/20 hover:border-teal-500/40 hover:text-teal-400' : 'border-gray-200 text-gray-300 hover:border-teal-400 hover:text-teal-400'}`}>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                                                <span className="text-[9px] font-bold">{t('photo', 'RASM')}</span>
                                            </button>
                                        )}
                                    </div>
                                    <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" className="hidden"
                                        onChange={e => { const f = Array.from(e.target.files ?? []).slice(0, 8 - files.length); e.target.value = ''; setFiles(p => [...p, ...f.map(x => ({ file: x, prev: URL.createObjectURL(x) }))]); }} />
                                </div>

                                {/* Save */}
                                <button type="button" onClick={save} disabled={saving || !desc.trim()}
                                    className="w-full py-3 rounded-xl text-[14px] font-extrabold bg-red-500 hover:bg-red-400 disabled:opacity-40 text-white transition-all active:scale-[0.98]">
                                    {saving ? t('savingProgress', 'Yuklanmoqda…') : t('saveBtnWithIcon', '💾 Saqlash')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: Damage list */}
                <div className="flex-1 min-w-0">
                    {damages.length === 0 ? (
                        <div className={`rounded-2xl border flex flex-col items-center justify-center py-20 ${isDark ? 'bg-[#161c26] border-white/[0.07]' : 'bg-white border-gray-200'}`}>
                            <span className="text-5xl mb-4">🛡️</span>
                            <p className={`text-base font-bold ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{t('noDamageRecords', "Shikast yozuvlari yo'q")}</p>
                            {userRole === 'admin' && !showForm && (
                                <button onClick={() => setShowForm(true)} className="mt-4 text-[13px] text-teal-500 hover:underline font-bold">{t('addFirstDamage', "+ Birinchi shikastni qo'shing")}</button>
                            )}
                        </div>
                    ) : (
                        <div className={`rounded-2xl border overflow-hidden divide-y ${isDark ? 'bg-[#161c26] border-white/[0.07] divide-white/[0.05]' : 'bg-white border-gray-200 divide-gray-100'}`}>
                            {/* List header */}
                            <div className={`px-5 py-3 flex items-center justify-between ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                                <p className={`text-[12px] font-black uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                    {damages.length} {t('damageRecords', 'ta shikast yozuvi')}
                                </p>
                            </div>

                            {damages.map(d => {
                                const part = CAR_PARTS.find(p => p.key === d.partKey) ?? { label: d.partKey, icon: '🔩' };
                                const m = SEV_DEF[d.severity];
                                return (
                                    <div key={d.id} className={`px-5 py-4 transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/60'}`}>
                                        <div className="flex items-start gap-4">
                                            <span className={`text-2xl w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}>{part.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2.5 flex-wrap">
                                                    <span className={`font-bold text-[15px] ${isDark ? 'text-white/90' : 'text-gray-900'}`}>{part.label}</span>
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[11px] font-bold ${m.bg} ${m.text} ${m.border}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{t(m.labelKey, m.fallback)}
                                                    </span>
                                                </div>
                                                <p className={`text-[13px] mt-1.5 leading-relaxed ${isDark ? 'text-white/55' : 'text-gray-600'}`}>{d.description}</p>

                                                {d.images.length > 0 && (
                                                    <div className="flex gap-2 mt-3 flex-wrap">
                                                        {d.images.map((img, i) => {
                                                            const s = imgSrc(img);
                                                            if (!s) return null;
                                                            return (
                                                                <button key={i} onClick={() => setPreview(s)}
                                                                    className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 hover:border-teal-400/50 transition-all active:scale-90 shadow-sm">
                                                                    <img src={s} alt="" className="w-full h-full object-cover" loading="lazy" />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                <div className={`flex items-center gap-4 mt-3 text-[11px] ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                                                    <span>🕐 {fmt(d.recordedAt)}</span>
                                                    {d.recordedBy && <span>👤 {d.recordedBy}</span>}
                                                </div>
                                            </div>

                                            {userRole === 'admin' && (
                                                <button onClick={() => del(d.id)}
                                                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${isDark ? 'text-white/15 hover:bg-red-500/15 hover:text-red-400' : 'text-gray-300 hover:bg-red-50 hover:text-red-500'}`}>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* fullscreen preview */}
            {preview && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-sm" onClick={() => setPreview(null)}>
                    <img src={preview} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
                    <button onClick={() => setPreview(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            )}
        </div>
    );
}
