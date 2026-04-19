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
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_DOC_MB * 1024 * 1024) {
      setDocError(`Fayl hajmi ${MAX_DOC_MB}MB dan oshmasligi kerak`);
      e.target.value = '';
      return;
    }
    setDocError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocuments(prev => [
        ...prev.filter(d => d.category !== category),
        { name: file.name, type: file.type, data: reader.result as string, category },
      ]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeDoc = (category: CarDocument['category']) =>
    setDocuments(prev => prev.filter(d => d.category !== category));

  const getDoc = (cat: CarDocument['category']) => documents.find(d => d.category === cat);

  const inputClass = `w-full px-4 py-3 rounded-xl outline-none transition-all border ${theme === 'dark'
    ? 'bg-gray-800 border-gray-700 text-white focus:border-[#0f766e] placeholder-gray-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#0f766e] placeholder-gray-400'}`;

  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`;

  const DocBox = ({ category, label }: { category: CarDocument['category']; label: string }) => {
    const doc = getDoc(category);
    return (
      <div className={`rounded-xl border p-3 flex items-center gap-3 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold mb-0.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{label}</p>
          {doc
            ? <p className="text-xs text-[#0f766e] truncate">{doc.name}</p>
            : <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>PDF yoki rasm tanlang (max {MAX_DOC_MB}MB)</p>
          }
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {doc && (
            <>
              {doc.type.startsWith('image/') ? (
                <a href={doc.data} target="_blank" rel="noreferrer">
                  <img src={doc.data} alt={doc.name} className="w-8 h-8 rounded object-cover border border-gray-600" />
                </a>
              ) : (
                <a href={doc.data} download={doc.name} className="text-[#0f766e] text-xs font-medium hover:underline">PDF</a>
              )}
              <button type="button" onClick={() => removeDoc(category)}
                className={`p-1 rounded-lg ${theme === 'dark' ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}>
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <label htmlFor={`car-doc-${category}`}
            className="cursor-pointer px-2.5 py-1.5 bg-[#0f766e] text-white text-xs font-semibold rounded-lg hover:bg-[#0a5c56] transition-colors">
            {doc ? 'Almashtir' : 'Yuklash'}
          </label>
          <input id={`car-doc-${category}`} type="file" accept="image/*,application/pdf"
            className="hidden" onChange={(e) => handleDocUpload(e, category)} />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
        {/* Header */}
        <div className={`px-6 py-5 border-b flex justify-between items-center ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
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
              <div className={`relative group w-20 h-20 rounded-2xl overflow-hidden border-2 cursor-pointer transition-colors ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:border-[#0f766e]' : 'bg-gray-50 border-gray-200 hover:border-[#0f766e]'}`}>
                {avatar ? (
                  <img src={avatar} alt="Car" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
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
          <div className={`border-t pt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
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
              className={`px-5 py-2.5 rounded-xl text-sm font-medium ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}>
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
