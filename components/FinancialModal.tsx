import React, { useState, useEffect } from 'react';
import { Driver, TransactionType, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface FinancialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  drivers: Driver[];
  lang: Language;
}

const FinancialModal: React.FC<FinancialModalProps> = ({ isOpen, onClose, onSubmit, drivers, lang }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [driverId, setDriverId] = useState(drivers[0]?.id || '');
  const [type, setType] = useState<TransactionType>(TransactionType.INCOME);
  const t = TRANSLATIONS[lang];

  // Reset form when modal opens or drivers change
  useEffect(() => {
    if (isOpen && drivers.length > 0) {
      // Only reset driverId if it's empty or invalid
      if (!driverId || !drivers.find(d => d.id === driverId)) {
        setDriverId(drivers[0].id);
      }
    }
  }, [isOpen, drivers]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedDriverId = driverId || drivers[0]?.id;

    // Validate that we have a valid driver
    if (!selectedDriverId || !drivers.find(d => d.id === selectedDriverId)) {
      console.error('Invalid driver ID');
      return;
    }

    onSubmit({
      amount: parseFloat(amount),
      description,
      driverId: selectedDriverId,
      type,
      timestamp: Date.now()
    });
    setAmount('');
    setDescription('');
    setDriverId(drivers[0]?.id || '');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
        <div className="bg-slate-900/50 px-6 py-5 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">{t.newTransaction}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Transaction Type */}
          <div className="grid grid-cols-2 gap-4 p-1 bg-slate-900 rounded-xl">
            <button
              type="button"
              onClick={() => setType(TransactionType.INCOME)}
              className={`py-2 px-4 rounded-lg font-medium text-sm transition-all ${type === TransactionType.INCOME
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              {t.incomeType}
            </button>
            <button
              type="button"
              onClick={() => setType(TransactionType.EXPENSE)}
              className={`py-2 px-4 rounded-lg font-medium text-sm transition-all ${type === TransactionType.EXPENSE
                  ? 'bg-rose-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              {t.expenseType}
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.amount} (UZS)</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white placeholder-slate-600 transition-all font-mono text-lg"
              placeholder="0.00"
            />
          </div>

          {/* Driver */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.driver}</label>
            <div className="relative">
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white appearance-none cursor-pointer"
              >
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name} — {d.carModel}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.comment}</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white placeholder-slate-600 transition-all"
              placeholder="Masalan: Benzin uchun"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-300 hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-500 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all transform active:scale-95"
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