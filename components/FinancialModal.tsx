import React, { useState, useEffect } from 'react';
import { XIcon, UsersIcon } from './Icons';
import CustomSelect from './CustomSelect';
import DatePicker from './DatePicker';
import { Driver, Transaction, TransactionType, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface FinancialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Transaction, 'id'>) => void;
  drivers: Driver[];
  lang: Language;
  theme: 'light' | 'dark';
}

const FinancialModal: React.FC<FinancialModalProps> = ({ isOpen, onClose, onSubmit, drivers, lang, theme }) => {
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.INCOME);
  const [description, setDescription] = useState('');
  const [driverId, setDriverId] = useState('');
  const [date, setDate] = useState<Date>(new Date());

  const t = TRANSLATIONS[lang];

  // Format number with spaces for readability (300 000, 20 000, etc.)
  const formatNumberDisplay = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    // Add spaces every 3 digits from the right
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, ''); // Store raw digits
    setAmount(rawValue);
    setDisplayAmount(formatNumberDisplay(rawValue));
  };

  // Reset form when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setAmount('');
      setDisplayAmount('');
      setDescription('');
      setType(TransactionType.INCOME);
      setDate(new Date());
    } else if (isOpen && drivers.length > 0) {
      // Set default driver if none selected or current one is invalid
      if (!driverId || !drivers.find(d => d.id === driverId)) {
        setDriverId(drivers[0].id);
      }
    }
  }, [isOpen, drivers, driverId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation for driverId
    if (!driverId || !drivers.find(d => d.id === driverId)) {
      console.error('No valid driver selected.');
      return;
    }

    // Validate comment: required for expense, optional for income
    if (type === TransactionType.EXPENSE && !description.trim()) {
      console.error('Comment is required for expenses.');
      return;
    }

    // Combine selected date with current time
    const timestamp = new Date(date);
    const now = new Date();
    timestamp.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    onSubmit({
      amount: Number(amount),
      type,
      description,
      driverId,
      timestamp: timestamp.getTime(),
    });
    setAmount('');
    setDisplayAmount('');
    setDescription('');
    setDriverId(''); // Reset driverId to empty string after submission
    setDate(new Date());
    onClose();
  };

  const inputClass = `w-full px-4 py-3 rounded-xl outline-none transition-all border ${theme === 'dark'
    ? 'bg-gray-800 border-gray-700 text-white focus:border-[#0d9488] placeholder-gray-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#0d9488] placeholder-gray-400'
    }`;

  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
    }`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200 border ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
        }`}>
        <div className={`px-6 py-5 border-b flex justify-between items-center ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'
          }`}>
          <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.newTransaction}</h3>
          <button onClick={onClose} className={`transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
            }`}>
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Selection */}
          <div className={`grid grid-cols-2 gap-2 p-1 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
            <button
              type="button"
              onClick={() => setType(TransactionType.INCOME)}
              className={`py-2.5 rounded-lg text-sm font-bold transition-all ${type === TransactionType.INCOME
                ? 'bg-[#0d9488] text-white shadow-lg'
                : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              {t.income}
            </button>
            <button
              type="button"
              onClick={() => setType(TransactionType.EXPENSE)}
              className={`py-2.5 rounded-lg text-sm font-bold transition-all ${type === TransactionType.EXPENSE
                ? 'bg-red-500 text-white shadow-lg'
                : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              {t.expense}
            </button>
          </div>

          <div>
            <label className={labelClass}>{t.amount} (UZS)</label>
            <input
              type="text"
              required
              inputMode="numeric"
              value={displayAmount}
              onChange={handleAmountChange}
              className={`${inputClass} font-mono text-lg tracking-wide`}
              placeholder="0"
            />
          </div>

          <div>
            <div className="w-full">
              <DatePicker
                label={t.time || "Date"}
                value={date}
                onChange={setDate}
                theme={theme}
              />
            </div>
          </div>

          <div>
            <div className="w-full">
              <CustomSelect
                label={t.driver}
                value={driverId}
                onChange={setDriverId}
                options={[
                  { id: '', name: t.selectDriver || "Select Driver" },
                  ...drivers.map(d => ({ id: d.id, name: `${d.name} — ${d.carModel}` }))
                ]}
                theme={theme}
                icon={UsersIcon}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              {t.comment}
              {type === TransactionType.EXPENSE && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              required={type === TransactionType.EXPENSE}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} min-h-[100px] resize-none`}
              placeholder={type === TransactionType.EXPENSE ? t.commentPlaceholder || "Masalan: Benzin uchun" : t.commentPlaceholder || "Masalan: Benzin uchun (ixtiyoriy)"}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
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
              className={`px-6 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg transition-all transform active:scale-95 ${type === TransactionType.INCOME
                ? 'bg-[#0d9488] hover:bg-[#0f766e] shadow-[#0d9488]/20'
                : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                }`}
            >
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinancialModal;