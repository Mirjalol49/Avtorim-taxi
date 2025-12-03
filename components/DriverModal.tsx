import React, { useState, useEffect } from 'react';
import { XIcon, CameraIcon } from './Icons';
import { Driver, DriverStatus, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { formatNumberSmart } from '../utils/formatNumber';
import { sanitizeInput } from '../utils/security';

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  editingDriver?: Driver | null;
  lang: Language;
  theme: 'light' | 'dark';
}

const DriverModal: React.FC<DriverModalProps> = ({ isOpen, onClose, onSubmit, editingDriver, lang, theme }) => {
  const [name, setName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [carModel, setCarModel] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [status, setStatus] = useState<DriverStatus>(DriverStatus.OFFLINE);
  const [monthlySalary, setMonthlySalary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    if (isOpen && editingDriver) {
      setName(editingDriver.name);
      setLicensePlate(editingDriver.licensePlate);
      setCarModel(editingDriver.carModel);
      setPhone(editingDriver.phone);
      setAvatar(editingDriver.avatar);
      setStatus(editingDriver.status);
      setMonthlySalary(editingDriver.monthlySalary ? editingDriver.monthlySalary.toString() : '');
    } else if (isOpen) {
      // Reset for new driver - keep avatar empty (optional)
      setName('');
      setLicensePlate('');
      setCarModel('');
      setPhone('+998 ');
      setAvatar('');
      setStatus(DriverStatus.OFFLINE);
      setMonthlySalary('');
      setError(null);
    }
  }, [isOpen, editingDriver]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validation
    const missing: string[] = [];
    if (!avatar) missing.push(t.image);
    if (!name.trim()) missing.push(t.name);
    if (!monthlySalary) missing.push(t.monthlySalary || 'Salary');
    if (!phone.trim() || phone.trim().length <= 5) missing.push(t.phone);
    if (!carModel.trim()) missing.push(t.model);
    if (!licensePlate.trim()) missing.push(t.plate);

    if (missing.length > 0) {
      const prefix = lang === 'uz' ? 'Majburiy maydonlar to\'ldirilmagan: ' : (lang === 'ru' ? 'Обязательные поля не заполнены: ' : 'Required fields missing: ');
      setError(`${prefix}${missing.join(', ')}`);
      setIsSubmitting(false);
      return;
    }

    // Remove formatting (commas) before saving
    const salaryValue = monthlySalary ? parseFloat(monthlySalary.replace(/,/g, '')) : 0;

    try {
      await onSubmit({
        id: editingDriver?.id, // Pass ID if editing
        name,
        licensePlate,
        carModel,
        phone,
        avatar,
        status,
        monthlySalary: salaryValue
      });
      onClose();
    } catch (err) {
      console.error("Error saving driver:", err);
      setError("Failed to save driver. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');

    // Always start with +998 (Uzbekistan country code)
    // Uzbek phone format: +998 XX XXX XX XX (9 digits after country code)

    if (digits.length === 0) {
      return '+998 ';
    }

    // Remove leading 998 if user typed it
    let phoneDigits = digits;
    if (phoneDigits.startsWith('998')) {
      phoneDigits = phoneDigits.slice(3);
    }

    // Ensure we only have max 9 digits
    phoneDigits = phoneDigits.slice(0, 9);

    // Format based on length: +998 XX XXX XX XX
    if (phoneDigits.length === 0) {
      return '+998 ';
    } else if (phoneDigits.length <= 2) {
      return `+998 ${phoneDigits}`;
    } else if (phoneDigits.length <= 5) {
      return `+998 ${phoneDigits.slice(0, 2)} ${phoneDigits.slice(2)}`;
    } else if (phoneDigits.length <= 7) {
      return `+998 ${phoneDigits.slice(0, 2)} ${phoneDigits.slice(2, 5)} ${phoneDigits.slice(5)}`;
    } else {
      return `+998 ${phoneDigits.slice(0, 2)} ${phoneDigits.slice(2, 5)} ${phoneDigits.slice(5, 7)} ${phoneDigits.slice(7, 9)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatPhoneNumber(value);
    setPhone(formatted);
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value) {
      const numberValue = parseInt(value, 10);
      setMonthlySalary(numberValue.toLocaleString());
    } else {
      setMonthlySalary('');
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl outline-none transition-all border ${theme === 'dark'
    ? 'bg-gray-800 border-gray-700 text-white focus:border-[#0d9488] placeholder-gray-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#0d9488] placeholder-gray-400'
    }`;

  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
    }`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200 border ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
        }`}>
        <div className={`px-6 py-5 border-b flex justify-between items-center ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'
          }`}>
          <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {editingDriver ? t.editDriver : t.addDriver}
          </h3>
          <button onClick={onClose} className={`transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
            }`}>
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>{t.image} <span className="text-red-500">*</span></label>
              <div className={`relative group w-24 h-24 rounded-2xl overflow-hidden border-2 cursor-pointer transition-colors shadow-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:border-[#0d9488]' : 'bg-gray-50 border-gray-200 hover:border-[#0d9488]'
                }`}>
                {avatar ? (
                  <img src={avatar} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                    <CameraIcon className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                )}

                {/* Image Upload Overlay */}
                <label htmlFor="driver-avatar-upload" className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]">
                  <CameraIcon className="w-8 h-8 text-white mb-1" />
                  <span className="text-[10px] text-white font-bold uppercase tracking-wider">Upload</span>
                </label>
                <input
                  id="driver-avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
            <div className="flex-1 space-y-4">
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t.name} <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(sanitizeInput(e.target.value))}
                className={inputClass}
                placeholder="Ism Familiya"
              />
            </div>
            <div>
              <label className={labelClass}>{t.monthlySalary || 'Salary (UZS)'} <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={monthlySalary}
                onChange={handleSalaryChange}
                className={inputClass}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t.phone} <span className="text-red-500">*</span></label>
            <input
              type="tel"
              required
              value={phone}
              onChange={handlePhoneChange}
              className={inputClass}
              placeholder="+998 90 123 45 67"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t.model} <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={carModel}
                onChange={(e) => setCarModel(sanitizeInput(e.target.value))}
                className={inputClass}
                placeholder="Chevrolet Cobalt"
              />
            </div>
            <div>
              <label className={labelClass}>{t.plate} <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={licensePlate}
                onChange={(e) => setLicensePlate(sanitizeInput(e.target.value))}
                className={inputClass}
                placeholder="01 A 777 AA"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 bg-[#0d9488] text-white hover:bg-[#0f766e] rounded-xl text-sm font-bold shadow-lg shadow-[#0d9488]/20 transition-all transform active:scale-95 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Saving...' : (editingDriver ? t.save : t.add)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverModal;