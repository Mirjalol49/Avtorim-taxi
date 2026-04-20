import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { XIcon, UsersIcon } from './Icons';
import CustomSelect from './CustomSelect';
import DatePicker from './DatePicker';
import { Driver, Transaction, TransactionType } from '../src/core/types';
import { PaymentStatus } from '../src/core/types/transaction.types';

interface FinancialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Transaction, 'id'>) => void;
  drivers: Driver[];
  transactions?: Transaction[];
  theme: 'light' | 'dark';
}

const FinancialModal: React.FC<FinancialModalProps> = ({ isOpen, onClose, onSubmit, drivers, transactions = [], theme }) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.INCOME);
  const [description, setDescription] = useState('');
  const [driverId, setDriverId] = useState('');
  const [date, setDate] = useState<Date>(new Date());

  const selectedDriver = drivers.find(d => d.id === driverId) ?? null;

  const driverDebtInfo = useMemo(() => {
    if (!selectedDriver || transactions.length === 0) return null;
    const driverTxs = transactions.filter(tx =>
      tx.driverId === selectedDriver.id &&
      (tx as any).status !== 'DELETED' &&
      tx.status !== PaymentStatus.DELETED
    );
    const totalDebt = driverTxs
      .filter(tx => tx.type === TransactionType.DEBT)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    if (totalDebt === 0) return null;
    const totalIncome = driverTxs
      .filter(tx => tx.type === TransactionType.INCOME)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const remaining = Math.max(0, totalDebt - totalIncome);
    return { totalDebt, totalIncome, remaining };
  }, [selectedDriver, transactions]);

  const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

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

    if ((type === TransactionType.EXPENSE || type === TransactionType.DEBT) && !description.trim()) {
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
    ? 'bg-gray-800 border-gray-700 text-white focus:border-[#0f766e] placeholder-gray-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#0f766e] placeholder-gray-400'
    }`;

  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
    }`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200 border ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
        }`}>
        <div className={`px-6 py-5 border-b flex justify-between items-center ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'
          }`}>
          <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('newTransaction')}</h3>
          <button onClick={onClose} className={`transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
            }`}>
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Selection */}
          <div className={`grid grid-cols-3 p-1 rounded-full border ${theme === 'dark' ? 'bg-[#111827] border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
            <button
              type="button"
              onClick={() => setType(TransactionType.INCOME)}
              className={`py-2.5 rounded-full text-sm font-bold transition-all ${type === TransactionType.INCOME
                ? 'bg-[#0f766e] text-white shadow-lg'
                : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {t('income')}
            </button>
            <button
              type="button"
              onClick={() => setType(TransactionType.EXPENSE)}
              className={`py-2.5 rounded-full text-sm font-bold transition-all ${type === TransactionType.EXPENSE
                ? 'bg-red-500 text-white shadow-lg'
                : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {t('expense')}
            </button>
            <button
              type="button"
              onClick={() => setType(TransactionType.DEBT)}
              className={`py-2.5 rounded-full text-sm font-bold transition-all ${type === TransactionType.DEBT
                ? 'bg-orange-500 text-white shadow-lg'
                : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Qarz
            </button>
          </div>

          {/* Debt preview: show current debt balance when adding income */}
          {type === TransactionType.INCOME && driverDebtInfo && driverDebtInfo.remaining > 0 && (
            <div className={`rounded-xl p-3 border border-orange-500/30 bg-orange-500/5`}>
              <p className="text-xs font-bold text-orange-400 mb-1">⚠ Haydovchida qarz bor</p>
              <div className="flex justify-between text-xs">
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Qolgan qarz:</span>
                <span className="font-bold text-orange-400">−{fmt(driverDebtInfo.remaining)} UZS</span>
              </div>
              {amount && Number(amount) > 0 && (
                <div className="flex justify-between text-xs mt-1">
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Bu to'lovdan so'ng:</span>
                  <span className={`font-bold ${Math.max(0, driverDebtInfo.remaining - Number(amount)) > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                    {Math.max(0, driverDebtInfo.remaining - Number(amount)) > 0
                      ? `−${fmt(Math.max(0, driverDebtInfo.remaining - Number(amount)))} UZS`
                      : "Qarz to'landi ✓"}
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className={labelClass}>{t('amount')} (UZS)</label>
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
                label={t('time') || "Date"}
                value={date}
                onChange={setDate}
                theme={theme}
              />
            </div>
          </div>

          <div>
            <div className="w-full">
              <CustomSelect
                label={t('driver')}
                value={driverId}
                onChange={setDriverId}
                options={[
                  { id: '', name: t('selectDriver') || "Select Driver" },
                  ...drivers.map(d => ({ id: d.id, name: `${d.name} — ${d.carModel}` }))
                ]}
                theme={theme}
                icon={UsersIcon}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              {type === TransactionType.DEBT ? 'Qarz sababi' : t('comment')}
              {(type === TransactionType.EXPENSE || type === TransactionType.DEBT) && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              required={type === TransactionType.EXPENSE || type === TransactionType.DEBT}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} min-h-[80px] resize-none`}
              placeholder={
                type === TransactionType.DEBT
                  ? "Masalan: Mashina zarari, jarima..."
                  : type === TransactionType.EXPENSE
                  ? t('commentPlaceholder') || "Masalan: Benzin uchun"
                  : t('commentPlaceholder') || "Ixtiyoriy"
              }
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className={`px-6 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg transition-all transform active:scale-95 ${type === TransactionType.INCOME
                ? 'bg-[#0f766e] hover:bg-[#0a5c56] shadow-[#0f766e]/20'
                : type === TransactionType.DEBT
                ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
                : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                }`}
            >
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinancialModal;