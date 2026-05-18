import React, { useState, useEffect, useRef } from 'react';
import { XIcon, CameraIcon, InfoIcon } from './Icons';
import { Car, CarDocument } from '../src/core/types';
import { supabase } from '../supabase';
import { uploadAvatarToStorage } from '../services/storageService';
import DatePicker from './DatePicker';

interface CarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Car>) => Promise<void>;
  editingCar?: Car | null;
  adminName?: string;
  theme: 'light' | 'dark';
  isLockedByVikup?: boolean;
}

const MAX_DOC_MB = 5;

const DOC_SLOTS: { category: CarDocument['category']; label: string }[] = [
  { category: 'id_card',            label: "Avtomobil texpassporti (ID karta)" },
  { category: 'technical_passport', label: "Texnik ko'rik"                     },
  { category: 'insurance',          label: "Sug'urta polisi"                   },
  { category: 'other',              label: "Boshqa hujjat"                     },
];

const CarModal: React.FC<CarModalProps> = ({ isOpen, onClose, onSubmit, editingCar, theme, isLockedByVikup }) => {
  const [name,         setName]         = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [avatar,       setAvatar]       = useState('');   // CDN URL or preview URL
  const [dailyPlan,    setDailyPlan]    = useState('');
  const [documents,    setDocuments]    = useState<CarDocument[]>([]);
  const [docError,     setDocError]     = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [inRepair,     setInRepair]     = useState(false);
  
  // Document Expirations
  const [insuranceExpiry, setInsuranceExpiry] = useState<Date | null>(null);
  const [techInspectionExpiry, setTechInspectionExpiry] = useState<Date | null>(null);
  const [tintingExpiry, setTintingExpiry] = useState<Date | null>(null);

  const avatarFileRef = useRef<File | null>(null); // raw File — uploaded to Storage on submit

  const isDark = theme === 'dark';

  useEffect(() => {
    if (!isOpen) return;
    avatarFileRef.current = null; // reset pending upload on open

    if (editingCar) {
      setName(editingCar.name);
      setLicensePlate(editingCar.licensePlate);
      setDailyPlan(editingCar.dailyPlan ? editingCar.dailyPlan.toLocaleString() : '');
      setAvatar(editingCar.avatar ?? '');
      setError(null);
      setDocError(null);
      setInRepair(editingCar.inRepair ?? false);

      setInsuranceExpiry(editingCar.insuranceExpiryMs ? new Date(editingCar.insuranceExpiryMs) : null);
      setTechInspectionExpiry(editingCar.techInspectionExpiryMs ? new Date(editingCar.techInspectionExpiryMs) : null);
      setTintingExpiry(editingCar.tintingExpiryMs ? new Date(editingCar.tintingExpiryMs) : null);

      // Load documents on-demand (not included in realtime subscription to save egress)
      if (editingCar.id) {
        supabase
          .from('cars')
          .select('documents')
          .eq('id', editingCar.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setDocuments(data.documents ?? []);
            }
          });
      }
    } else {
      setName('');
      setLicensePlate('');
      setAvatar('');
      setDailyPlan('');
      setDocuments([]);
      setError(null);
      setDocError(null);
      setInRepair(false);
      setInsuranceExpiry(null);
      setTechInspectionExpiry(null);
      setTintingExpiry(null);
    }
  }, [isOpen, editingCar?.id]);

  const handleDailyPlanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9]/g, '');
    setDailyPlan(v ? parseInt(v, 10).toLocaleString() : '');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !licensePlate.trim()) {
      setError("Avtomobil nomi va davlat raqamini kiriting");
      return;
    }
    setIsSubmitting(true);
    try {
      const planValue = dailyPlan
        ? parseInt(dailyPlan.replace(/\s/g, '').replace(/,/g, ''), 10)
        : 0;

      // If user selected a new avatar file, upload it to Storage first
      let finalAvatar = avatar;
      const pendingFile = avatarFileRef.current;
      if (pendingFile) {
        const entityId = editingCar?.id ?? `car_${Date.now()}`;
        finalAvatar = await uploadAvatarToStorage(pendingFile, 'cars', entityId);
        avatarFileRef.current = null;
      }

      await onSubmit({ 
        id: editingCar?.id, 
        name, 
        licensePlate, 
        avatar: finalAvatar, 
        dailyPlan: planValue, 
        documents, 
        inRepair,
        insuranceExpiryMs: insuranceExpiry?.getTime(),
        techInspectionExpiryMs: techInspectionExpiry?.getTime(),
        tintingExpiryMs: tintingExpiry?.getTime()
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Store the raw File in a ref and show a local object URL as preview.
  // Actual upload to Supabase Storage happens on form submit.
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    avatarFileRef.current = file;
    const previewUrl = URL.createObjectURL(file);
    setAvatar(previewUrl); // shows instantly in the UI
    e.target.value = '';   // reset so same file can be re-selected
  };

  const handleDocUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    category: CarDocument['category'],
  ) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const oversized = files.find(f => f.size > MAX_DOC_MB * 1024 * 1024);
    if (oversized) {
      setDocError(`Fayl hajmi ${MAX_DOC_MB}MB dan oshmasligi kerak`);
      e.target.value = '';
      return;
    }
    setDocError(null);
    const promises = files.map(
      file => new Promise<CarDocument>(resolve => {
        const reader = new FileReader();
        reader.onloadend = () =>
          resolve({ name: file.name, type: file.type, data: reader.result as string, category });
        reader.readAsDataURL(file);
      }),
    );
    Promise.all(promises).then(newDocs => setDocuments(prev => [...prev, ...newDocs]));
    e.target.value = '';
  };

  const removeDoc = (category: CarDocument['category'], indexInCategory: number) => {
    setDocuments(prev => {
      const catItems = prev.filter(d => d.category === category);
      const others   = prev.filter(d => d.category !== category);
      catItems.splice(indexInCategory, 1);
      return [...others, ...catItems];
    });
  };

  const inputClass = `w-full px-4 py-3 rounded-xl outline-none transition-all duration-200 shadow-sm border ${
    isDark
      ? 'bg-surface-2 border-white/[0.08] text-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 placeholder-gray-500'
      : 'bg-white border-slate-200 text-gray-900 focus:border-slate-300 focus:ring-4 focus:ring-slate-100 placeholder-slate-400'
  }`;

  const labelClass = `block text-[11px] font-semibold tracking-wider uppercase mb-1.5 ${
    isDark ? 'text-gray-400' : 'text-slate-500'
  }`;

  const ModernDatePicker = ({ label, value, onChange, theme }: any) => {
    return (
      <div className="flex flex-col relative group">
        <label className={labelClass}>{label}</label>
        <div className="relative">
          <DatePicker
            label={label}
            hideLabel
            value={value}
            onChange={onChange}
            theme={theme}
            placeholder="Kun/Oy/Yil"
          />
          {value && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-colors cursor-pointer z-10"
              title="Tozalash"
            >
              <XIcon className="w-[14px] h-[14px]" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const DocBox = ({ category, label }: { category: CarDocument['category']; label: string }) => {
    const docs = documents.filter(d => d.category === category);
    return (
      <div className={`rounded-xl border p-4 transition-all ${isDark ? 'bg-surface-2/50 border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className={`text-[13px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</p>
            {docs.length > 0 && (
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{docs.length} ta fayl</p>
            )}
          </div>
          <label
            htmlFor={`car-doc-${category}`}
            className={`cursor-pointer px-4 py-2 text-[13px] font-medium rounded-xl transition-colors flex-shrink-0 ${
              isDark ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
            }`}
          >
            + Qo'shish
          </label>
          <input
            id={`car-doc-${category}`}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={e => handleDocUpload(e, category)}
          />
        </div>
        {docs.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-3">
            {docs.map((doc, idx) => (
              <div key={idx} className="relative group">
                {doc.type.startsWith('image/') ? (
                  <a href={doc.data} target="_blank" rel="noreferrer">
                    <img
                      src={doc.data}
                      alt={doc.name}
                      className={`w-14 h-14 rounded-xl object-cover cursor-pointer border transition-transform group-hover:scale-105 ${isDark ? 'border-white/[0.10]' : 'border-slate-200 shadow-sm'}`}
                    />
                  </a>
                ) : (
                  <a href={doc.data} download={doc.name} target="_blank" rel="noreferrer">
                    <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer border transition-transform group-hover:scale-105 ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                      <span className="text-lg">📄</span>
                      <span className="text-[9px] font-bold text-red-400">PDF</span>
                    </div>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => removeDoc(category, idx)}
                  className="absolute -top-2 -right-2 w-[22px] h-[22px] bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md hover:scale-110 hover:bg-red-600"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-[12px] mt-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
            Oldi-orqa tomonlarni yoki bir nechta sahifalarni yuklash mumkin
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border ${isDark ? 'border-white/[0.08]' : 'bg-white border-gray-200'}`}
        style={isDark ? { background: '#171f33' } : undefined}
      >
        {/* ── Header ── */}
        <div
          className={`px-6 py-5 border-b flex justify-between items-center ${isDark ? 'border-white/[0.08]' : 'border-gray-100 bg-gray-50/50'}`}
          style={isDark ? { background: '#222a3d' } : undefined}
        >
          <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {editingCar ? "Avtomobilni tahrirlash" : "Avtomobil qo'shish"}
          </h3>
          <button
            onClick={onClose}
            className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* ── Photo + Fields ── */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="flex-shrink-0 sm:mt-6">
              <div className={`relative group w-24 h-24 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 cursor-pointer transition-all shadow-sm ${isDark ? 'bg-surface-2 border-white/[0.08] hover:border-emerald-500/50' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                {avatar ? (
                  <img src={avatar} alt="Car" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-surface-2/50' : 'bg-slate-100'}`}>
                    <CameraIcon className={`w-7 h-7 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
                  </div>
                )}
                <label
                  htmlFor="car-avatar-upload"
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
                >
                  <CameraIcon className="w-6 h-6 text-white" />
                </label>
                <input
                  id="car-avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
            </div>
            <div className="flex-1 w-full space-y-5">
              <div>
                <label className={labelClass}>Avtomobil nomi <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Chevrolet Cobalt 2023"
                />
              </div>
              <div>
                <label className={labelClass}>Davlat raqami <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={licensePlate}
                  onChange={e => setLicensePlate(e.target.value.toUpperCase())}
                  className={inputClass}
                  placeholder="01 A 777 AA"
                />
              </div>
            </div>
          </div>

          {/* ── Daily plan ── */}
          <div>
            <label className={labelClass}>
              Kunlik reja (UZS){' '}
              <span className={`normal-case font-medium tracking-normal ml-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                — haydovchi topishi kerak bo'lgan miqdor
              </span>
            </label>
            {isLockedByVikup ? (
              <div>
                <div className="relative">
                  <input
                    type="text"
                    value={dailyPlan}
                    disabled
                    className={`${inputClass} opacity-70 cursor-not-allowed`}
                  />
                  <div className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-amber-500' : 'text-amber-600'}`} title="Vikup shartnomasi orqali bloklangan">
                    🔒
                  </div>
                </div>
                <p className={`text-[10px] mt-1.5 ml-1 leading-tight ${isDark ? 'text-amber-500/80' : 'text-amber-600'}`}>
                  Ushbu avtomobil Vikup (Arenda) ga berilgan. Kunlik reja shartnoma asosida avtomatik belgilangan va qulflangan.
                </p>
              </div>
            ) : (
              <input
                type="text"
                value={dailyPlan}
                onChange={handleDailyPlanChange}
                className={inputClass}
                placeholder="750,000"
              />
            )}
          </div>

          {/* ── Status ── */}
          <div className={`p-6 rounded-2xl flex items-center justify-between transition-all ${isDark ? 'bg-surface-2 border border-white/[0.05]' : 'bg-slate-50/70 border border-slate-100 shadow-sm'}`}>
            <div>
              <p className={`text-[15px] font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Ta'mirda (In Repair)</p>
              <p className={`text-[13px] mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Avtomobil ta'mirlanayotganligini belgilash</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer group">
              <input type="checkbox" className="sr-only peer" checked={inRepair} onChange={e => setInRepair(e.target.checked)} />
              <div className={`w-[50px] h-[30px] rounded-[15px] peer transition-all duration-300 shadow-inner ${
                isDark ? 'bg-black/40 peer-checked:bg-[#34C759]' : 'bg-slate-200 peer-checked:bg-[#34C759]'
              }`}></div>
              <div className={`absolute left-[2px] top-[2px] w-[26px] h-[26px] rounded-full transition-all duration-300 shadow-sm peer-checked:translate-x-[20px] ${
                isDark ? 'bg-white/90 peer-checked:bg-white' : 'bg-white'
              }`}></div>
            </label>
          </div>

          {/* ── Document Expiration Reminders ── */}
          <div className={`p-6 rounded-2xl transition-all ${isDark ? 'bg-surface-2 border border-white/[0.05]' : 'bg-slate-50/70 border border-slate-100 shadow-sm'}`}>
            <p className={`text-[15px] font-semibold mb-5 flex items-center gap-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              ⏳ Hujjatlar muddati (Ixtiyoriy)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ModernDatePicker label="Sug'urta (OSAGO)" value={insuranceExpiry} onChange={setInsuranceExpiry} theme={theme} />
              <ModernDatePicker label="Texnik ko'rik" value={techInspectionExpiry} onChange={setTechInspectionExpiry} theme={theme} />
              <div className="sm:col-span-2">
                <ModernDatePicker label="Tanirovka" value={tintingExpiry} onChange={setTintingExpiry} theme={theme} />
              </div>
            </div>
            <p className={`text-[13px] flex items-center gap-2 mt-5 font-medium ${isDark ? 'text-gray-400' : 'text-slate-400'}`}>
              <InfoIcon className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
              Kiritilgan muddat tugashiga 3 kun qolganda tizim sizni ogohlantiradi.
            </p>
          </div>

          {/* ── Documents ── */}
          <div className={`p-6 rounded-2xl transition-all ${isDark ? 'bg-surface-2 border border-white/[0.05]' : 'bg-slate-50/70 border border-slate-100 shadow-sm'}`}>
            <p className={`text-[15px] font-semibold mb-5 flex items-center gap-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              🗂️ Hujjatlar
            </p>
            <div className="space-y-3">
              {DOC_SLOTS.map(s => <DocBox key={s.category} {...s} />)}
            </div>
            {docError && <p className="text-[13px] font-semibold text-red-500 mt-3">{docError}</p>}
          </div>

          {/* ── Actions ── */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'text-gray-300 hover:bg-white/[0.04]' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 bg-[#0f766e] text-white hover:bg-[#0a5c56] rounded-xl text-sm font-bold transition-all active:scale-95 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? "Saqlanmoqda..." : editingCar ? "Saqlash" : "Qo'shish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CarModal;
