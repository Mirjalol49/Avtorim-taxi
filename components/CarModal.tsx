import React, { useState, useEffect } from 'react';
import { XIcon, CameraIcon } from './Icons';
import { Car, CarDocument } from '../src/core/types';

interface CarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Car>) => Promise<void>;
  editingCar?: Car | null;
  theme: 'light' | 'dark';
}

const MAX_DOC_MB = 5;

const DOC_SLOTS: { category: CarDocument['category']; label: string }[] = [
  { category: 'id_card', label: "Avtomobil texpassporti (ID karta)" },
  { category: 'technical_passport', label: "Texnik ko'rik" },
  { category: 'insurance', label: "Sug'urta polisi" },
  { category: 'other', label: "Boshqa hujjat" },
];

const CarModal: React.FC<CarModalProps> = ({ isOpen, onClose, onSubmit, editingCar, theme }) => {
  const [name, setName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [avatar, setAvatar] = useState('');
  const [dailyPlan, setDailyPlan] = useState('');
  const [documents, setDocuments] = useState<CarDocument[]>([]);
  const [docError, setDocError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && editingCar) {
      setName(editingCar.name);
      setLicensePlate(editingCar.licensePlate);
      setAvatar(editingCar.avatar ?? '');
      setDailyPlan(editingCar.dailyPlan ? editingCar.dailyPlan.toLocaleString() : '');
      setDocuments(editingCar.documents ?? []);
    } else if (isOpen) {
      setName('');
      setLicensePlate('');
      setAvatar('');
      setDailyPlan('');
      setDocuments([]);
      setError(null);
      setDocError(null);
    }
  }, [isOpen, editingCar]);

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
      const planValue = dailyPlan ? parseInt(dailyPlan.replace(/\s/g, '').replace(/,/g, ''), 10) : 0;
      await onSubmit({ id: editingCar?.id, name, licensePlate, avatar, dailyPlan: planValue, documents });
      onClose();
    } catch (err: any) {
      console.error('Car save error:', err);
      setError(err?.message || "Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>, category: CarDocument['category']) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const oversized = files.find(f => f.size > MAX_DOC_MB * 1024 * 1024);
    if (oversized) {
      setDocError(`Fayl hajmi ${MAX_DOC_MB}MB dan oshmasligi kerak`);
      e.target.value = '';
      return;
    }
    setDocError(null);
    const promises = files.map(file => new Promise<CarDocument>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ name: file.name, type: file.type, data: reader.result as string, category });
      reader.readAsDataURL(file);
    }));
    Promise.all(promises).then(newDocs => setDocuments(prev => [...prev, ...newDocs]));
    e.target.value = '';
  };

  const removeDoc = (category: CarDocument['category'], indexInCategory: number) => {
    setDocuments(prev => {
      const catItems = prev.filter(d => d.category === category);
      const others = prev.filter(d => d.category !== category);
      catItems.splice(indexInCategory, 1);
      return [...others, ...catItems];
    });
  };

  const inputClass = `w-full px-4 py-3 rounded-xl outline-none transition-all border ${theme === 'dark'
    ? 'bg-surface-2 border-white/[0.08] text-white focus:border-[#0f766e] placeholder-gray-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#0f766e] placeholder-gray-400'}`;

  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`;

  const DocBox = ({ category, label }: { category: CarDocument['category']; label: string }) => {
    const docs = documents.filter(d => d.category === category);
    return (
      <div className={`rounded-xl border p-3 ${theme === 'dark' ? 'bg-surface-2 border-white/[0.08]' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{label}</p>
            {docs.length > 0 && (
              <p className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{docs.length} ta fayl</p>
            )}
          </div>
          <label htmlFor={`car-doc-${category}`}
            className="cursor-pointer px-2.5 py-1.5 bg-[#0f766e] text-white text-xs font-semibold rounded-lg hover:bg-[#0a5c56] transition-colors flex-shrink-0">
            + Qo'shish
          </label>
          <input id={`car-doc-${category}`} type="file" accept="image/*,application/pdf" multiple
            className="hidden" onChange={(e) => handleDocUpload(e, category)} />
        </div>
        {docs.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {docs.map((doc, idx) => (
              <div key={idx} className="relative group">
                {doc.type.startsWith('image/') ? (
                  <a href={doc.data} target="_blank" rel="noreferrer">
                    <img src={doc.data} alt={doc.name}
                      className={`w-14 h-14 rounded-lg object-cover cursor-pointer border ${theme === 'dark' ? 'border-white/[0.10]' : 'border-gray-200'}`} />
                  </a>
                ) : (
                  <a href={doc.data} download={doc.name} target="_blank" rel="noreferrer">
                    <div className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${theme === 'dark' ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                      <span className="text-lg">📄</span>
                      <span className="text-[9px] font-bold text-red-400">PDF</span>
                    </div>
                  </a>
                )}
                <button type="button" onClick={() => removeDoc(category, idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                  <XIcon className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            Oldi-orqa tomonlarni yoki bir nechta sahifalarni yuklash mumkin
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border ${theme === 'dark' ? 'border-white/[0.08]' : 'bg-white border-gray-200'}`}
        style={theme === 'dark' ? { background: '#171f33' } : undefined}
      >
        {/* Header */}
        <div
          className={`px-6 py-5 border-b flex justify-between items-center ${theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-100 bg-gray-50/50'}`}
          style={theme === 'dark' ? { background: '#222a3d' } : undefined}
        >
          <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {editingCar ? "Avtomobilni tahrirlash" : "Avtomobil qo'shish"}
          </h3>
          <button onClick={onClose} className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

          {/* Photo + Fields */}
          <div className="flex items-start gap-5">
            <div className="flex-shrink-0">
              <label className={labelClass}>Rasm</label>
              <div className={`relative group w-20 h-20 rounded-2xl overflow-hidden border-2 cursor-pointer transition-colors ${theme === 'dark' ? 'bg-surface-2 border-white/[0.08] hover:border-[#0f766e]' : 'bg-gray-50 border-gray-200 hover:border-[#0f766e]'}`}>
                {avatar ? (
                  <img src={avatar} alt="Car" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${theme === 'dark' ? 'bg-surface-2/50' : 'bg-gray-100'}`}>
                    <CameraIcon className={`w-7 h-7 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                )}
                <label htmlFor="car-avatar-upload" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <CameraIcon className="w-6 h-6 text-white" />
                </label>
                <input id="car-avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <label className={labelClass}>Avtomobil nomi <span className="text-red-500">*</span></label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)}
                  className={inputClass} placeholder="Chevrolet Cobalt 2023" />
              </div>
              <div>
                <label className={labelClass}>Davlat raqami <span className="text-red-500">*</span></label>
                <input type="text" required value={licensePlate} onChange={e => setLicensePlate(e.target.value.toUpperCase())}
                  className={inputClass} placeholder="01 A 777 AA" />
              </div>
            </div>
          </div>

          {/* Daily plan */}
          <div>
            <label className={labelClass}>Kunlik reja (UZS) <span className={`normal-case font-normal ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>— haydovchi topishi kerak bo'lgan miqdor</span></label>
            <input type="text" value={dailyPlan} onChange={handleDailyPlanChange}
              className={inputClass} placeholder="750,000" />
          </div>

          {/* Documents */}
          <div className={`border-t pt-4 ${theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'}`}>
            <p className={`text-sm font-bold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              🗂️ Hujjatlar
            </p>
            <div className="space-y-2">
              {DOC_SLOTS.map(s => <DocBox key={s.category} {...s} />)}
            </div>
            {docError && <p className="text-xs text-red-500 mt-2">{docError}</p>}
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium ${theme === 'dark' ? 'text-gray-300 hover:bg-white/[0.04]' : 'text-gray-600 hover:bg-gray-100'}`}>
              Bekor qilish
            </button>
            <button type="submit" disabled={isSubmitting}
              className={`px-6 py-2.5 bg-[#0f766e] text-white hover:bg-[#0a5c56] rounded-xl text-sm font-bold transition-all active:scale-95 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
              {isSubmitting ? "Saqlanmoqda..." : (editingCar ? "Saqlash" : "Qo'shish")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CarModal;
