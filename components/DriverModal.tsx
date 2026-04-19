import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { XIcon, CameraIcon } from './Icons';
import { Driver, DriverStatus, DriverDocument } from '../types';
import { sanitizeInput } from '../utils/security';
import { decodeHtml } from '../utils/textUtils';

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  editingDriver?: Driver | null;
  theme: 'light' | 'dark';
}

const DOC_CATEGORIES: { value: DriverDocument['category']; label: string }[] = [
  { value: 'driver_license', label: "Haydovchilik guvohnomasi" },
  { value: 'passport', label: "Pasport" },
  { value: 'car_registration', label: "Avtomobil texpassporti" },
  { value: 'car_insurance', label: "Sug'urta polisi" },
  { value: 'other', label: "Boshqa" },
];

const MAX_DOC_SIZE_MB = 5;

const DriverModal: React.FC<DriverModalProps> = ({ isOpen, onClose, onSubmit, editingDriver, theme }) => {
  const { t, i18n } = useTranslation();

  const [name, setName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [carModel, setCarModel] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [status, setStatus] = useState<DriverStatus>(DriverStatus.OFFLINE);
  const [monthlySalary, setMonthlySalary] = useState('');
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [docError, setDocError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && editingDriver) {
      setName(decodeHtml(editingDriver.name));
      setLicensePlate(decodeHtml(editingDriver.licensePlate));
      setCarModel(decodeHtml(editingDriver.carModel));
      setPhone(editingDriver.phone);
      setAvatar(editingDriver.avatar);
      setStatus(editingDriver.status);
      setMonthlySalary(editingDriver.monthlySalary ? editingDriver.monthlySalary.toString() : '');
      setDocuments(editingDriver.documents ?? []);
    } else if (isOpen) {
      setName('');
      setLicensePlate('');
      setCarModel('');
      setPhone('+998 ');
      setAvatar('');
      setStatus(DriverStatus.OFFLINE);
      setMonthlySalary('');
      setDocuments([]);
      setError(null);
      setDocError(null);
    }
  }, [isOpen, editingDriver]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!name.trim() || !phone.trim() || !carModel.trim() || !licensePlate.trim()) {
      setError(t('fillAllFields') || "Barcha maydonlarni to'ldiring");
      setIsSubmitting(false);
      return;
    }

    try {
      const salaryValue = monthlySalary ? parseFloat(monthlySalary.replace(/\s/g, '').replace(/,/g, '')) : 0;
      await onSubmit({
        id: editingDriver?.id,
        name,
        licensePlate,
        carModel,
        phone,
        avatar,
        status,
        monthlySalary: salaryValue,
        documents,
      });
      onClose();
    } catch (err) {
      console.error("Error saving driver:", err);
      setError(t('errorSaving') || "Xatolik yuz berdi. Qaytadan urinib ko'ring.");
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
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_DOC_SIZE_MB * 1024 * 1024) {
      setDocError(`Fayl hajmi ${MAX_DOC_SIZE_MB}MB dan oshmasligi kerak`);
      e.target.value = '';
      return;
    }

    setDocError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocuments(prev => {
        const filtered = prev.filter(d => d.category !== category);
        return [...filtered, {
          name: file.name,
          type: file.type,
          data: reader.result as string,
          category,
        }];
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeDocument = (category: DriverDocument['category']) => {
    setDocuments(prev => prev.filter(d => d.category !== category));
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
    if (value) setMonthlySalary(parseInt(value, 10).toLocaleString());
    else setMonthlySalary('');
  };

  const inputClass = `w-full px-4 py-3 rounded-xl outline-none transition-all border ${theme === 'dark'
    ? 'bg-gray-800 border-gray-700 text-white focus:border-[#0f766e] placeholder-gray-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#0f766e] placeholder-gray-400'}`;

  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`;

  const sectionTitle = `text-sm font-bold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`;

  const getDoc = (cat: DriverDocument['category']) => documents.find(d => d.category === cat);

  const DocUploadBox = ({ category, label }: { category: DriverDocument['category']; label: string }) => {
    const doc = getDoc(category);
    const inputId = `doc-${category}`;
    return (
      <div className={`rounded-xl border p-3 flex items-center gap-3 transition-colors ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold mb-0.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{label}</p>
          {doc ? (
            <p className="text-xs text-[#0f766e] truncate">{doc.name}</p>
          ) : (
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>PDF yoki rasm tanlang</p>
          )}
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
              <button type="button" onClick={() => removeDocument(category)}
                className={`p-1 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}>
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <label htmlFor={inputId} className="cursor-pointer px-2.5 py-1.5 bg-[#0f766e] text-white text-xs font-semibold rounded-lg hover:bg-[#0a5c56] transition-colors">
            {doc ? 'Almashtir' : 'Yuklash'}
          </label>
          <input id={inputId} type="file" accept="image/*,application/pdf" className="hidden"
            onChange={(e) => handleDocumentUpload(e, category)} />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`px-6 py-5 border-b flex justify-between items-center ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
          <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {editingDriver ? t('editDriver') : t('addDriver')}
          </h3>
          <button onClick={onClose} className={`transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium">{error}</div>
          )}

          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="flex-shrink-0">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Foto</label>
              <div className={`relative group w-20 h-20 rounded-2xl overflow-hidden border-2 cursor-pointer transition-colors ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:border-[#0f766e]' : 'bg-gray-50 border-gray-200 hover:border-[#0f766e]'}`}>
                {avatar ? (
                  <img src={avatar} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                    <CameraIcon className={`w-7 h-7 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                )}
                <label htmlFor="driver-avatar-upload" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <CameraIcon className="w-6 h-6 text-white" />
                </label>
                <input id="driver-avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <label className={labelClass}>{t('name')} <span className="text-red-500">*</span></label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Ism Familiya" />
              </div>
              <div>
                <label className={labelClass}>{t('monthlySalary') || 'Oylik maosh (UZS)'}</label>
                <input type="text" value={monthlySalary} onChange={handleSalaryChange} className={inputClass} placeholder="0" />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>{t('phone')} <span className="text-red-500">*</span></label>
            <input type="tel" required value={phone} onChange={(e) => setPhone(formatPhoneNumber(e.target.value))} className={inputClass} placeholder="+998 90 123 45 67" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('model')} <span className="text-red-500">*</span></label>
              <input type="text" required value={carModel} onChange={(e) => setCarModel(e.target.value)} className={inputClass} placeholder="Chevrolet Cobalt" />
            </div>
            <div>
              <label className={labelClass}>{t('plate')} <span className="text-red-500">*</span></label>
              <input type="text" required value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} className={inputClass} placeholder="01 A 777 AA" />
            </div>
          </div>

          {/* Divider */}
          <div className={`border-t pt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={sectionTitle}>
              <span>👤</span> Haydovchi hujjatlari
            </p>
            <div className="space-y-2">
              <DocUploadBox category="driver_license" label="Haydovchilik guvohnomasi" />
              <DocUploadBox category="passport" label="Pasport" />
            </div>
          </div>

          <div className={`border-t pt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={sectionTitle}>
              <span>🚗</span> Avtomobil hujjatlari
            </p>
            <div className="space-y-2">
              <DocUploadBox category="car_registration" label="Texpassport" />
              <DocUploadBox category="car_insurance" label="Sug'urta polisi" />
              <DocUploadBox category="other" label="Boshqa hujjat" />
            </div>
          </div>

          {docError && (
            <p className="text-xs text-red-500">{docError}</p>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}>
              {t('cancel')}
            </button>
            <button type="submit" disabled={isSubmitting}
              className={`px-6 py-2.5 bg-[#0f766e] text-white hover:bg-[#0a5c56] rounded-xl text-sm font-bold transition-all active:scale-95 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
              {isSubmitting ? t('saving') : (editingDriver ? t('save') : t('add'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverModal;
