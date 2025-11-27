import React, { useState } from 'react';
import { Driver, FineStatus, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { XIcon, SirenIcon, UsersIcon } from './Icons';
import CustomSelect from './CustomSelect';

interface FineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  drivers: Driver[];
  lang: Language;
}

const FineModal: React.FC<FineModalProps> = ({ isOpen, onClose, onSubmit, drivers, lang }) => {
  const [driverId, setDriverId] = useState(drivers[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [location, setLocation] = useState('');
  const t = TRANSLATIONS[lang];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      driverId: driverId || drivers[0]?.id, // Fallback if select hasn't changed
      amount: parseFloat(amount),
      reason,
      location,
      status: FineStatus.UNPAID,
      timestamp: Date.now()
    });
    // Reset
    setAmount('');
    setReason('');
    setLocation('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 ring-1 ring-white/10">
        <div className="bg-red-900/20 px-6 py-5 border-b border-red-900/30 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <SirenIcon className="text-red-500 w-5 h-5" />
            {t.issueFine}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Driver */}
          <div>
            <div className="w-full">
              <CustomSelect
                label={t.driver}
                value={driverId}
                onChange={setDriverId}
                options={drivers.map(d => ({ id: d.id, name: `${d.name} — ${d.carModel}` }))}
                theme="dark"
                icon={UsersIcon}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.amount} (UZS)</label>
              <input
                type="number"
                required
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-white placeholder-slate-600 font-mono text-lg"
                placeholder="0.00"
              />
            </div>
            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.location}</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-white placeholder-slate-600"
                placeholder="Toshkent, ..."
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.reason}</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-white placeholder-slate-600"
              placeholder="Radar 80km/h"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-300 hover:bg-slate-800 rounded-xl text-sm font-medium transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-red-600 text-white hover:bg-red-500 rounded-xl text-sm font-bold shadow-lg shadow-red-600/20 transition-all transform active:scale-95 flex items-center gap-2"
            >
              <SirenIcon className="w-4 h-4" />
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FineModal;