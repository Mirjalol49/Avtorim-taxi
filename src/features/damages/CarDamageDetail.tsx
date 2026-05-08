import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Car, CarDamage, DamageImage, DamageSeverity, CAR_PARTS } from '../../core/types/car.types';
import { updateCar } from '../../../services/carsService';
import { supabase } from '../../../supabase';
import { useConfirm } from '../../../components/ConfirmContext';

interface Props {
    car: Car;
    allCars: Car[];
    userRole: 'admin' | 'viewer';
    adminName: string;
    theme: 'light' | 'dark';
    onBack: () => void;
    onCarChange: (id: string) => void;
}

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

function fmt(ms: number) {
    return new Date(ms).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function imgSrc(img: DamageImage) { return img.url ?? img.data ?? ''; }

/** Returns part label — "Boshqa" → crash emoji only */
function partDisplay(partKey: string): { icon: string; label: string } {
    if (partKey === 'other') return { icon: '💥', label: '' };
    const p = CAR_PARTS.find(x => x.key === partKey);
    return p ? { icon: p.icon, label: p.label } : { icon: '💥', label: '' };
}

export default function CarDamageDetail({ car, allCars, userRole, adminName, theme, onBack, onCarChange }: Props) {
    const { t } = useTranslation();
    const isDark = theme === 'dark';
    const damages = car.damage ?? [];
    const confirm = useConfirm();

    const [desc, setDesc]       = useState('');
    const [files, setFiles]     = useState<{ file: File; prev: string }[]>([]);
    const [saving, setSaving]   = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setDesc('');
        files.forEach(f => URL.revokeObjectURL(f.prev));
        setFiles([]);
    };

    const save = useCallback(async () => {
        if (!desc.trim() && files.length === 0) return;
        setSaving(true);
        try {
            const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            const images: DamageImage[] = files.length
                ? await Promise.all(files.map((f, i) => uploadImg(f.file, car.id, id, i).then(url => ({ name: f.file.name, type: 'image/jpeg', url }))))
                : [];
            const record: CarDamage = { id, partKey: 'other', severity: 'minor', description: desc.trim(), images, recordedAt: Date.now(), recordedBy: adminName };
            await updateCar(car.id, { damage: [record, ...damages] });
            reset(); setShowForm(false);
        } catch (e: any) { alert('Xatolik: ' + e?.message); }
        finally { setSaving(false); }
    }, [car.id, damages, desc, files, adminName]);

    const del = useCallback(async (dmgId: string) => {
        if (!await confirm({ title: t('delete', "O'chirish"), message: t('deleteConfirmDamage', "Haqiqatan ham bu shikast yozuvini o'chirmoqchimisiz?"), isDanger: true })) return;
        await updateCar(car.id, { damage: damages.filter(d => d.id !== dmgId) });
    }, [car.id, damages, confirm, t]);

    const totalDmg = damages.length;
    const hasSevere = damages.some(d => d.severity === 'severe');

    /* ─── classes ─── */
    const card    = isDark ? 'bg-white/[0.04] border border-white/[0.07]' : 'bg-white border border-gray-200/80';
    const muted   = isDark ? 'text-white/35' : 'text-gray-400';
    const label   = isDark ? 'text-white/50' : 'text-gray-500';
    const bold    = isDark ? 'text-white'    : 'text-gray-900';
    const inpCls  = isDark
        ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-white/20 focus:border-white/20'
        : 'bg-gray-50/80 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-300';

    return (
        <div className="flex flex-col gap-5 pb-8">

            {/* ── HERO ── */}
            <div className="relative w-full overflow-hidden rounded-3xl shadow-2xl" style={{ height: 260 }}>
                {car.avatar
                    ? <img src={car.avatar} alt={car.name} className="w-full h-full object-cover" />
                    : <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-[#0a1020]' : 'bg-gray-200'}`}><span className="text-8xl opacity-10">🚗</span></div>
                }
                {/* gradient layers */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

                {/* back button */}
                <button onClick={onBack}
                    className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md text-white text-[13px] font-semibold transition-all active:scale-95 border border-white/10">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                    {t('back', 'Orqaga')}
                </button>

                {/* damage counter badge */}
                {totalDmg > 0 && (
                    <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md text-[13px] font-bold border ${hasSevere ? 'bg-red-500/30 border-red-400/40 text-red-200' : 'bg-black/30 border-white/10 text-white/70'}`}>
                        {hasSevere && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />}
                        {totalDmg} {t('damageCountPlural', 'ta shikast')}
                    </div>
                )}

                {/* car info */}
                <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
                    <p className="text-white/50 text-[11px] font-semibold uppercase tracking-[0.2em] mb-0.5">{t('carLabel', 'Avtomobil')}</p>
                    <h1 className="text-white font-bold text-[28px] leading-tight tracking-tight">{car.name}</h1>
                    <p className="text-white/70 font-mono font-semibold text-[18px] tracking-[0.3em] mt-0.5">{car.licensePlate}</p>

                    {/* status pill */}
                    <div className="mt-3">
                        {totalDmg === 0
                            ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[12px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />🛡️ {t('noDamage', "Shikast yo'q")}
                              </span>
                            : <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold border ${hasSevere ? 'bg-red-500/20 border-red-400/30 text-red-300' : 'bg-orange-500/20 border-orange-400/30 text-orange-300'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${hasSevere ? 'bg-red-400 animate-pulse' : 'bg-orange-400'}`} />
                                {totalDmg} {t('damageCountPlural', 'ta shikast')}
                              </span>
                        }
                    </div>
                </div>
            </div>

            {/* ── BODY ── */}
            <div className="flex flex-col lg:flex-row gap-4 items-start">

                {/* ── LEFT: FORM PANEL ── */}
                {userRole === 'admin' && (
                    <div className="w-full lg:w-72 xl:w-80 flex-shrink-0">
                        {!showForm ? (
                            <button onClick={() => setShowForm(true)}
                                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.98] ${isDark ? 'bg-white/[0.05] hover:bg-white/[0.09] text-white/60 hover:text-white/90 border border-white/[0.07]' : 'bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-800 border border-gray-200 shadow-sm'}`}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                                {t('addNewDamageBtn', "Yangi shikast qo'shish")}
                            </button>
                        ) : (
                            <div className={`rounded-2xl overflow-hidden shadow-sm ${card}`}>
                                {/* form header */}
                                <div className={`px-4 py-3 flex items-center justify-between border-b ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                                    <p className={`text-[13px] font-semibold ${bold}`}>💥 {t('newDamageTitle', 'Yangi shikast')}</p>
                                    <button onClick={() => { reset(); setShowForm(false); }}
                                        className={`w-7 h-7 flex items-center justify-center rounded-full transition-all active:scale-90 ${isDark ? 'text-white/30 hover:text-white/70 hover:bg-white/[0.08]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                    </button>
                                </div>

                                <div className="p-4 space-y-4">
                                    {/* Photo upload — first & prominent */}
                                    <div>
                                        <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${label}`}>{t('damagePhotos', 'Rasmlar')} · {files.length}/8</p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {files.map((f, i) => (
                                                <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                                                    <img src={f.prev} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setPreview(f.prev)} />
                                                    <button type="button"
                                                        onClick={() => setFiles(p => { URL.revokeObjectURL(p[i].prev); return p.filter((_, j) => j !== i); })}
                                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-lg transition-opacity">
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                            {files.length < 8 && (
                                                <button type="button" onClick={() => fileRef.current?.click()}
                                                    className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${isDark ? 'border-white/10 text-white/20 hover:border-white/25 hover:text-white/50' : 'border-gray-200 text-gray-300 hover:border-gray-400 hover:text-gray-400'}`}>
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                                                </button>
                                            )}
                                        </div>
                                        <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" className="hidden"
                                            onChange={e => {
                                                const f = Array.from(e.target.files ?? []).slice(0, 8 - files.length);
                                                e.target.value = '';
                                                setFiles(p => [...p, ...f.map(x => ({ file: x, prev: URL.createObjectURL(x) }))]);
                                            }} />
                                    </div>

                                    {/* Comment */}
                                    <div>
                                        <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${label}`}>{t('damageDesc', 'Izoh')} <span className={muted}>({t('optional', 'ixtiyoriy')})</span></p>
                                        <textarea rows={3}
                                            placeholder={t('damageShortDesc', 'Shikast haqida yozing…')}
                                            value={desc}
                                            onChange={e => setDesc(e.target.value)}
                                            className={`w-full px-3.5 py-2.5 rounded-xl border text-[13px] outline-none resize-none transition-colors ${inpCls}`} />
                                    </div>

                                    {/* Save */}
                                    <button type="button" onClick={save}
                                        disabled={saving || (!desc.trim() && files.length === 0)}
                                        className="w-full py-3 rounded-xl text-[14px] font-semibold bg-gray-900 hover:bg-black disabled:opacity-30 text-white transition-all active:scale-[0.98] dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
                                        {saving
                                            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('savingProgress', 'Saqlanmoqda…')}</span>
                                            : t('saveBtnWithIcon', 'Saqlash')
                                        }
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── RIGHT: DAMAGE LIST ── */}
                <div className="flex-1 min-w-0">
                    {damages.length === 0 ? (
                        <div className={`rounded-2xl border flex flex-col items-center justify-center py-24 text-center ${card}`}>
                            <span className="text-5xl mb-3 opacity-30">🛡️</span>
                            <p className={`text-[15px] font-semibold ${muted}`}>{t('noDamageRecords', "Shikast yozuvlari yo'q")}</p>
                            {userRole === 'admin' && !showForm && (
                                <button onClick={() => setShowForm(true)}
                                    className={`mt-4 text-[13px] font-medium transition-colors ${isDark ? 'text-white/30 hover:text-white/60' : 'text-gray-400 hover:text-gray-700'}`}>
                                    {t('addFirstDamage', "+ Birinchi shikastni qo'shing")}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                            {damages.map((d) => {
                                const { icon } = partDisplay(d.partKey);
                                const showSevTag = d.severity !== 'minor';

                                return (
                                    <div key={d.id} className={`rounded-2xl overflow-hidden transition-all flex flex-col ${card}`}>
                                        {/* ── image gallery top ── */}
                                        {d.images.length > 0 && (
                                            <div className={`grid gap-0.5 w-full bg-black/5 ${d.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                                {d.images.map((img, i) => {
                                                    const s = imgSrc(img);
                                                    if (!s) return null;
                                                    const showOverlay = i === 3 && d.images.length > 4;
                                                    if (i > 3) return null;
                                                    return (
                                                        <button key={i} onClick={() => setPreview(s)}
                                                            className="relative aspect-square w-full overflow-hidden group">
                                                            <img
                                                                src={s} alt=""
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                                loading="lazy"
                                                            />
                                                            {showOverlay && (
                                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                                                                    <span className="text-white font-bold text-[20px]">+{d.images.length - 4}</span>
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}


                                        {/* card body */}
                                        <div className="px-4 py-4 flex-1 flex flex-col">
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                    <span className="text-xl leading-none">{icon}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {showSevTag && (
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                                    d.severity === 'severe'
                                                                        ? isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600'
                                                                        : isDark ? 'bg-orange-500/15 text-orange-400' : 'bg-orange-50 text-orange-600'
                                                                }`}>
                                                                    <span className={`w-1 h-1 rounded-full ${d.severity === 'severe' ? 'bg-red-400' : 'bg-orange-400'}`} />
                                                                    {d.severity === 'severe' ? 'Jiddiy' : "O'rtacha"}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {userRole === 'admin' && (
                                                    <button onClick={() => del(d.id)}
                                                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${isDark ? 'text-white/15 hover:bg-red-500/15 hover:text-red-400' : 'text-gray-300 hover:bg-red-50 hover:text-red-500'}`}>
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>

                                            {d.description && (
                                                <p className={`text-[14px] leading-relaxed mb-3 flex-1 ${bold}`}>{d.description}</p>
                                            )}

                                            {/* meta row */}
                                            <div className={`flex items-center gap-2 mt-auto text-[11px] font-medium pt-3 border-t ${isDark ? 'border-white/5 text-white/30' : 'border-gray-100 text-gray-400'}`}>
                                                <span>{fmt(d.recordedAt)}</span>
                                                {d.recordedBy && <>
                                                    <span className={`w-1 h-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                                                    <span>{d.recordedBy}</span>
                                                </>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── FULLSCREEN PREVIEW ── */}
            {preview && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md" onClick={() => setPreview(null)}>
                    
                    {/* Top Actions */}
                    <div className="absolute top-4 right-4 flex items-center gap-3 z-[100000]" onClick={e => e.stopPropagation()}>
                        <button onClick={async () => {
                            try {
                                const res = await fetch(preview);
                                const blob = await res.blob();
                                const a = document.createElement('a');
                                a.href = URL.createObjectURL(blob);
                                a.download = `shikast_rasmi_${Date.now()}.jpg`;
                                a.click();
                            } catch(e) { window.open(preview, '_blank'); }
                        }}
                            className="flex items-center gap-2 px-4 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-[13px] backdrop-blur-md border border-white/10 transition-all active:scale-90">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            {t('download', 'Yuklab olish')}
                        </button>

                        <button onClick={() => setPreview(null)}
                            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-90 backdrop-blur-md border border-white/10">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>

                    {/* Image Container - maximized */}
                    <div className="w-full h-full p-0 md:p-4 flex items-center justify-center">
                        <img 
                            src={preview} 
                            alt="" 
                            className="w-full h-full object-contain rounded-xl shadow-2xl" 
                            onClick={e => e.stopPropagation()} 
                        />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
