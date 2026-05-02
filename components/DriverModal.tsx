import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { XIcon, CameraIcon, CarIcon } from './Icons';
import { Driver, DriverStatus, DriverDocument } from '../types';
import { Car } from '../src/core/types';
import { decodeHtml } from '../utils/textUtils';

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  editingDriver?: Driver | null;
  cars: Car[];
  theme: 'light' | 'dark';
}

const MAX_DOC_SIZE_MB = 5;

const DriverModal: React.FC<DriverModalProps> = ({ isOpen, onClose, onSubmit, editingDriver, cars, theme }) => {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [extraPhone, setExtraPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [status, setStatus] = useState<DriverStatus>(DriverStatus.OFFLINE);
  const [notes, setNotes] = useState('');
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [docError, setDocError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [driverType, setDriverType] = useState<'deposit' | 'salary'>('deposit');
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositWarningThreshold, setDepositWarningThreshold] = useState(1_000_000);
  const [selectedCarId, setSelectedCarId] = useState<string>('');
  const [carPickerOpen, setCarPickerOpen] = useState(false);
  const [carSearch, setCarSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const carSearchRef = useRef<HTMLInputElement>(null);

  // Find the car currently assigned to this driver
  const currentAssignedCar = editingDriver
    ? cars.find(c => c.assignedDriverId === editingDriver.id)
    : null;

  // Available cars: unassigned, OR the one already assigned to this driver
  const availableCars = cars.filter(c =>
    !c.assignedDriverId || c.assignedDriverId === editingDriver?.id
  );

  const filteredCars = carSearch.trim()
    ? availableCars.filter(c =>
        c.name.toLowerCase().includes(carSearch.toLowerCase()) ||
        c.licensePlate.toLowerCase().includes(carSearch.toLowerCase())
      )
    : availableCars;

  const selectedCar = cars.find(c => c.id === selectedCarId) ?? null;

  useEffect(() => {
    if (isOpen && editingDriver) {
      setName(decodeHtml(editingDriver.name));
      setPhone(editingDriver.phone);
      setExtraPhone(editingDriver.extraPhone ?? '');
      setAvatar(editingDriver.avatar);
      setStatus(editingDriver.status);
      setNotes(editingDriver.notes ?? '');
      setDocuments(editingDriver.documents ?? []);
      setMonthlySalary(editingDriver.monthlySalary ?? 0);
      setDriverType((editingDriver as any).driverType ?? 'deposit');
      setDepositAmount((editingDriver as any).depositAmount ?? 0);
      setDepositWarningThreshold((editingDriver as any).depositWarningThreshold ?? 1_000_000);
      setSelectedCarId(currentAssignedCar?.id ?? '');
    } else if (isOpen) {
      setName('');
      setPhone('+998 ');
      setExtraPhone('');
      setAvatar('');
      setStatus(DriverStatus.OFFLINE);
      setNotes('');
      setDocuments([]);
      setMonthlySalary(0);
      setDriverType('deposit');
      setDepositAmount(0);
      setDepositWarningThreshold(1_000_000);
      setSelectedCarId('');
      setError(null);
      setDocError(null);
    }
  }, [isOpen, editingDriver]);

  // Close picker when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setCarPickerOpen(false);
        setCarSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-focus search when picker opens
  useEffect(() => {
    if (carPickerOpen) setTimeout(() => carSearchRef.current?.focus(), 50);
    else setCarSearch('');
  }, [carPickerOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!name.trim() || !phone.trim()) {
      setError(t('fillAllFields') || "Barcha maydonlarni to'ldiring");
      setIsSubmitting(false);
      return;
    }

    try {
      // carModel and licensePlate auto-filled from selected car for backward compat with display
      await onSubmit({
        id: editingDriver?.id,
        name,
        phone,
        extraPhone,
        avatar,
        status,
        notes,
        monthlySalary: driverType === 'salary' ? monthlySalary : 0,
        driverType,
        depositAmount: driverType === 'deposit' ? depositAmount : 0,
        depositWarningThreshold: driverType === 'deposit' ? depositWarningThreshold : 1_000_000,
        documents,
        carModel: selectedCar?.name ?? editingDriver?.carModel ?? '',
        licensePlate: selectedCar?.licensePlate ?? editingDriver?.licensePlate ?? '',
        assignedCarId: selectedCarId || null,
        previousCarId: currentAssignedCar?.id ?? null,
      });
      onClose();
    } catch (err: any) {
      setError((err?.message && err.message !== '[object Object]' ? err.message : null) || t('errorSaving') || "Xatolik yuz berdi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>, category: DriverDocument['category']) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const oversized = files.find(f => f.size > MAX_DOC_SIZE_MB * 1024 * 1024);
    if (oversized) {
      setDocError(`Fayl hajmi ${MAX_DOC_SIZE_MB}MB dan oshmasligi kerak`);
      e.target.value = '';
      return;
    }
    setDocError(null);
    const promises = files.map(file => new Promise<DriverDocument>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ name: file.name, type: file.type, data: reader.result as string, category });
      reader.readAsDataURL(file);
    }));
    Promise.all(promises).then(newDocs => setDocuments(prev => [...prev, ...newDocs]));
    e.target.value = '';
  };

  const removeDocument = (category: DriverDocument['category'], indexInCategory: number) => {
    setDocuments(prev => {
      const catItems = prev.filter(d => d.category === category);
      const others = prev.filter(d => d.category !== category);
      catItems.splice(indexInCategory, 1);
      return [...others, ...catItems];
    });
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '+998 ';
    let phoneDigits = digits;
    if (phoneDigits.startsWith('998')) phoneDigits = phoneDigits.slice(3);
    phoneDigits = phoneDigits.slice(0, 9);
    if (phoneDigits.length === 0) return '+998 ';
    else if (phoneDigits.length <= 2) return `+998 ${phoneDigits}`;
    else if (phoneDigits.length <= 5) return `+998 ${phoneDigits.slice(0, 2)} ${phoneDigits.slice(2)}`;
    else if (phoneDigits.length <= 7) return `+998 ${phoneDigits.slice(0, 2)} ${phoneDigits.slice(2, 5)} ${phoneDigits.slice(5)}`;
    else return `+998 ${phoneDigits.slice(0, 2)} ${phoneDigits.slice(2, 5)} ${phoneDigits.slice(5, 7)} ${phoneDigits.slice(7, 9)}`;
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setMonthlySalary(value ? parseInt(value, 10) : 0);
  };

  const inputClass = `w-full px-4 py-3 rounded-xl outline-none transition-all border ${theme === 'dark'
    ? 'bg-surface-2 border-white/[0.08] text-white focus:border-[#0f766e] placeholder-gray-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#0f766e] placeholder-gray-400'}`;

  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`;
  const sectionTitle = `text-sm font-bold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`;

  const DocUploadBox = ({ category, label }: { category: DriverDocument['category']; label: string }) => {
    const docs = documents.filter(d => d.category === category);
    const inputId = `doc-${category}`;
    return (
      <div className={`rounded-xl border p-3 ${theme === 'dark' ? 'bg-surface-2 border-white/[0.08]' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{label}</p>
            {docs.length > 0 && (
              <p className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{docs.length} ta fayl</p>
            )}
          </div>
          <label htmlFor={inputId} className="cursor-pointer px-2.5 py-1.5 bg-[#0f766e] text-white text-xs font-semibold rounded-lg hover:bg-[#0a5c56] transition-colors flex-shrink-0">
            + Qo'shish
          </label>
          <input id={inputId} type="file" accept="image/*,application/pdf" multiple className="hidden"
            onChange={(e) => handleDocumentUpload(e, category)} />
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
                <button type="button" onClick={() => removeDocument(category, idx)}
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

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
      <div
        className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border ${theme === 'dark' ? 'border-white/[0.08]' : 'bg-white border-gray-200'}`}
        style={theme === 'dark' ? { background: '#171f33' } : undefined}
      >
        <div
          className={`px-6 py-5 border-b flex justify-between items-center ${theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-100 bg-gray-50/50'}`}
          style={theme === 'dark' ? { background: '#222a3d' } : undefined}
        >
          <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {editingDriver ? t('editDriver') : t('addDriver')}
          </h3>
          <button onClick={onClose} className={`transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium">{error}</div>}

          {/* Avatar + Name */}
          <div className="flex items-center gap-5">
            <div className="flex-shrink-0">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Foto</label>
              <div className={`relative group w-20 h-20 rounded-2xl overflow-hidden border-2 cursor-pointer transition-colors ${theme === 'dark' ? 'bg-surface-2 border-white/[0.08] hover:border-[#0f766e]' : 'bg-gray-50 border-gray-200 hover:border-[#0f766e]'}`}>
                {avatar ? (
                  <img src={avatar} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${theme === 'dark' ? 'bg-surface-2/50' : 'bg-gray-100'}`}>
                    <CameraIcon className={`w-7 h-7 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                )}
                <label htmlFor="driver-avatar-upload" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <CameraIcon className="w-6 h-6 text-white" />
                </label>
                <input id="driver-avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>
            </div>
            <div className="flex-1">
              <label className={labelClass}>{t('name')} <span className="text-red-500">*</span></label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Ism Familiya" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('phone')} <span className="text-red-500">*</span></label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(formatPhoneNumber(e.target.value))} className={inputClass} placeholder="+998 90 123 45 67" />
            </div>
            <div>
              <label className={labelClass}>Qo'shimcha telefon</label>
              <input type="tel" value={extraPhone} onChange={(e) => setExtraPhone(formatPhoneNumber(e.target.value))} className={inputClass} placeholder="+998 " />
            </div>
          </div>

          <div>
            <label className={labelClass}>Eslatmalar (Ixtiyoriy)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} resize-none h-24`} placeholder="Haydovchi haqida qo'shimcha ma'lumot..."></textarea>
          </div>

          {/* Driver payment type */}
          <div>
            <label className={labelClass}>Haydovchi turi</label>
            {/* Toggle */}
            <div className={`flex rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'}`}>
              {(['deposit', 'salary'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDriverType(type)}
                  className={`flex-1 py-2.5 text-sm font-bold transition-all ${
                    driverType === type
                      ? 'bg-[#0f766e] text-white'
                      : theme === 'dark'
                        ? 'bg-surface-2 text-gray-400 hover:text-gray-200'
                        : 'bg-gray-50 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {type === 'deposit' ? '🏦 Depozitchi' : '💳 Maoshli'}
                </button>
              ))}
            </div>
            <p className={`text-[10px] mt-1.5 ml-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
              {driverType === 'deposit'
                ? "Haydovchi boshlang'ich depozit beradi, reja bajarilmasa depozitdan ayriladi"
                : 'Sizdan haydovchiga oylik maosh to\'lanadi, reja bajarilmasa maoshdan ayriladi'}
            </p>
          </div>

          {/* Conditional amount field */}
          {driverType === 'deposit' ? (
            <>
            <div>
              <label className={labelClass}>Depozit miqdori</label>
              <div className="relative">
                <input
                  type="text"
                  value={depositAmount > 0 ? depositAmount.toLocaleString('uz-UZ') : ''}
                  onChange={e => {
                    const raw = parseInt(e.target.value.replace(/\D/g, ''), 10);
                    setDepositAmount(isNaN(raw) ? 0 : raw);
                  }}
                  className={inputClass}
                  placeholder="0"
                />
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>UZS</span>
              </div>
              <p className={`text-[10px] mt-1 ml-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                Haydovchi bergan boshlang'ich depozit summasi
              </p>
            </div>

            {/* Deposit warning threshold */}
            <div>
              <label className={labelClass}>⚠ Ogohlantirish limiti</label>
              <div className="relative">
                <input
                  type="text"
                  value={depositWarningThreshold > 0 ? depositWarningThreshold.toLocaleString('uz-UZ') : ''}
                  onChange={e => {
                    const raw = parseInt(e.target.value.replace(/\D/g, ''), 10);
                    setDepositWarningThreshold(isNaN(raw) ? 0 : raw);
                  }}
                  className={inputClass}
                  placeholder="1 000 000"
                />
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>UZS</span>
              </div>
              <p className={`text-[10px] mt-1 ml-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                Depozit bu miqdorga tushsa ogohlantirish yuboriladi
              </p>
            </div>
            </>
          ) : (
            <div>
              <label className={labelClass}>Oylik maosh</label>
              <div className="relative">
                <input
                  type="text"
                  value={monthlySalary > 0 ? monthlySalary.toLocaleString('uz-UZ') : ''}
                  onChange={e => {
                    const raw = parseInt(e.target.value.replace(/\D/g, ''), 10);
                    setMonthlySalary(isNaN(raw) ? 0 : raw);
                  }}
                  className={inputClass}
                  placeholder="0"
                />
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>UZS</span>
              </div>
              <p className={`text-[10px] mt-1 ml-1 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                Har oyda haydovchiga to'lanadigan maosh. Reja bajarilmasa ayiriladi.
              </p>
            </div>
          )}

          {/* Car assignment picker */}
          <div className={`border-t pt-4 ${theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'}`}>
            <p className={sectionTitle}>
              <CarIcon className="w-4 h-4" /> Biriktirilgan avtomobil
            </p>

            {/* Selected car preview or picker trigger */}
            <div ref={pickerRef} className="relative">
              <button
                type="button"
                onClick={() => setCarPickerOpen(o => !o)}
                className={`w-full rounded-xl border p-3 flex items-center gap-3 transition-colors text-left ${theme === 'dark'
                  ? 'bg-surface-2 border-white/[0.08] hover:border-[#0f766e]'
                  : 'bg-gray-50 border-gray-200 hover:border-[#0f766e]'}`}
              >
                {selectedCar ? (
                  <>
                    {selectedCar.avatar ? (
                      <img src={selectedCar.avatar} alt={selectedCar.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${theme === 'dark' ? 'bg-surface-2' : 'bg-gray-200'}`}>
                        <CarIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedCar.name}</p>
                      <p className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{selectedCar.licensePlate}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedCarId(''); }}
                      className={`p-1 rounded-lg flex-shrink-0 ${theme === 'dark' ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${theme === 'dark' ? 'bg-surface-2' : 'bg-gray-200'}`}>
                      <CarIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {availableCars.length === 0 ? "Bo'sh avtomobil yo'q" : "Avtomobil tanlang..."}
                    </span>
                  </>
                )}
              </button>

              {/* Dropdown list */}
              {carPickerOpen && (
                <div
                  className={`absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-10 overflow-hidden ${theme === 'dark' ? 'border-white/[0.08]' : 'bg-white border-gray-200'}`}
                  style={theme === 'dark' ? { background: '#171f33' } : undefined}
                >
                  {/* Search input */}
                  <div className={`p-2 border-b ${theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-100'}`}>
                    <input
                      ref={carSearchRef}
                      type="text"
                      value={carSearch}
                      onChange={e => setCarSearch(e.target.value)}
                      placeholder="Nomi yoki raqami bo'yicha qidiring..."
                      className={`w-full px-3 py-2 rounded-lg text-sm outline-none border ${theme === 'dark'
                        ? 'bg-surface-2 border-white/[0.08] text-white placeholder-gray-500 focus:border-[#0f766e]'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#0f766e]'}`}
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto custom-scrollbar">
                    {/* No car option */}
                    {!carSearch && (
                      <button
                        type="button"
                        onClick={() => { setSelectedCarId(''); setCarPickerOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${!selectedCarId
                          ? 'bg-[#0f766e] text-white'
                          : theme === 'dark' ? 'text-gray-400 hover:bg-white/[0.04]' : 'text-gray-500 hover:bg-black/[0.03]'}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${!selectedCarId ? 'bg-white/20' : theme === 'dark' ? 'bg-surface-2' : 'bg-gray-100'}`}>
                          <XIcon className="w-4 h-4" />
                        </div>
                        <span>Avtomobil biriktirmaslik</span>
                      </button>
                    )}
                    {filteredCars.length === 0 ? (
                      <p className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Hech narsa topilmadi</p>
                    ) : (
                      filteredCars.map(car => (
                        <button
                          key={car.id}
                          type="button"
                          onClick={() => { setSelectedCarId(car.id); setCarPickerOpen(false); setCarSearch(''); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors ${selectedCarId === car.id
                            ? 'bg-[#0f766e] text-white'
                            : theme === 'dark' ? 'text-gray-200 hover:bg-white/[0.04]' : 'text-gray-800 hover:bg-black/[0.03]'}`}
                        >
                          {car.avatar ? (
                            <img src={car.avatar} alt={car.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedCarId === car.id ? 'bg-white/20' : theme === 'dark' ? 'bg-surface-2' : 'bg-gray-100'}`}>
                              <CarIcon className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-semibold truncate">{car.name}</p>
                            <p className={`text-xs font-mono ${selectedCarId === car.id ? 'text-white/70' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{car.licensePlate}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Driver documents */}
          <div className={`border-t pt-4 ${theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'}`}>
            <p className={sectionTitle}>
              <span>👤</span> Haydovchi hujjatlari
            </p>
            <div className="space-y-2">
              <DocUploadBox category="driver_license" label="Haydovchilik guvohnomasi" />
              <DocUploadBox category="passport" label="Pasport" />
            </div>
            {docError && <p className="text-xs text-red-500 mt-2">{docError}</p>}
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${theme === 'dark' ? 'text-gray-300 hover:bg-white/[0.04]' : 'text-gray-600 hover:bg-gray-100'}`}>
              {t('cancel')}
            </button>
            <button type="submit" disabled={isSubmitting}
              className={`px-6 py-2.5 bg-[#0f766e] text-white hover:bg-[#0a5c56] rounded-xl text-sm font-bold transition-all active:scale-95 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
              {isSubmitting ? t('saving') : (editingDriver ? t('save') : t('add'))}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default DriverModal;
