import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { XIcon, UsersIcon } from './Icons';
import CustomSelect from './CustomSelect';
import DatePicker from './DatePicker';
import { Driver, Transaction, TransactionType } from '../src/core/types';
import { PaymentStatus } from '../src/core/types/transaction.types';
import {
  addDayOff,
  countUsedThisMonth,
  MONTHLY_ALLOWANCE,
  toDateKey,
  toMonthKey,
  DayOff,
} from '../services/daysOffService';

type PaymentMethod = 'cash' | 'card' | 'transfer';

const PAYMENT_METHODS: { id: PaymentMethod; emoji: string; label: string }[] = [
  { id: 'cash',     emoji: '💵', label: 'Naqd'      },
  { id: 'card',     emoji: '💳', label: 'Karta'     },
  { id: 'transfer', emoji: '🏦', label: "O'tkazma"  },
];

interface FinancialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Transaction, 'id'>) => void;
  drivers: Driver[];
  transactions?: Transaction[];
  theme: 'light' | 'dark';
  fleetId?: string;
  daysOff?: DayOff[];
}

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

const FinancialModal: React.FC<FinancialModalProps> = ({
  isOpen, onClose, onSubmit, drivers, transactions = [], theme, fleetId = '', daysOff = [],
}) => {
  const { t } = useTranslation();
  const D = theme === 'dark';

  const [amount, setAmount]           = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [type, setType]               = useState<TransactionType>(TransactionType.INCOME);
  const [description, setDescription] = useState('');
  const [driverId, setDriverId]       = useState('');
  const [date, setDate]               = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [chequeImage, setChequeImage] = useState<string | null>(null);
  const [chequeError, setChequeError] = useState<string | null>(null);
  const [isDayOff, setIsDayOff]       = useState(false);
  const [dayOffSaving, setDayOffSaving] = useState(false);
  const [dayOffError, setDayOffError] = useState<string | null>(null);
  const chequeRef = useRef<HTMLInputElement>(null);

  const selectedDriver = drivers.find(d => d.id === driverId) ?? null;
  const usedThisMonth  = selectedDriver ? countUsedThisMonth(daysOff, selectedDriver.id, toMonthKey(date)) : 0;
  const limitReached   = usedThisMonth >= MONTHLY_ALLOWANCE;
  const selectedDateKey = toDateKey(date);
  const alreadyDayOff  = daysOff.some(d => d.driverId === driverId && d.dateKey === selectedDateKey);

  const driverDebt = useMemo(() => {
    if (!selectedDriver) return null;
    const txs = transactions.filter(tx =>
      tx.driverId === selectedDriver.id &&
      tx.status !== PaymentStatus.DELETED && (tx as any).status !== 'DELETED');
    const debt = txs.filter(tx => tx.type === TransactionType.DEBT).reduce((s, tx) => s + Math.abs(tx.amount), 0);
    if (!debt) return null;
    const income = txs.filter(tx => tx.type === TransactionType.INCOME).reduce((s, tx) => s + Math.abs(tx.amount), 0);
    return { debt, remaining: Math.max(0, debt - income) };
  }, [selectedDriver, transactions]);

  const processImage = useCallback((file: File) => {
    setChequeError(null);
    if (!file.type.startsWith('image/')) { setChequeError('Faqat rasm fayl'); return; }
    if (file.size > 5 * 1024 * 1024)    { setChequeError('Maks 5MB'); return; }
    const r = new FileReader();
    r.onload = e => setChequeImage(e.target?.result as string);
    r.readAsDataURL(file);
  }, []);

  useEffect(() => {
    if (!isOpen || paymentMethod !== 'card') return;
    const onPaste = (e: ClipboardEvent) => {
      for (const item of Array.from(e.clipboardData?.items ?? [])) {
        if (item.type.startsWith('image/')) { const f = item.getAsFile(); if (f) processImage(f); break; }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isOpen, paymentMethod, processImage]);

  useEffect(() => {
    if (!isOpen) {
      setAmount(''); setDisplayAmount(''); setDescription('');
      setType(TransactionType.INCOME); setDate(new Date());
      setIsDayOff(false); setDayOffError(null);
      setPaymentMethod('cash'); setChequeImage(null); setChequeError(null);
    } else if (drivers.length > 0 && !driverId) {
      setDriverId(drivers[0].id);
    }
  }, [isOpen]);

  useEffect(() => { setDayOffError(null); setIsDayOff(false); }, [driverId, date]);

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setAmount(raw);
    setDisplayAmount(raw ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '');
  };

  const reset = () => {
    setAmount(''); setDisplayAmount(''); setDescription(''); setDriverId('');
    setDate(new Date()); setIsDayOff(false); setDayOffError(null);
    setPaymentMethod('cash'); setChequeImage(null); setChequeError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId) return;

    if (isDayOff) {
      if (!fleetId) { setDayOffError('Fleet ID not found'); return; }
      if (alreadyDayOff) { setDayOffError('Bu kun allaqachon dam olish kuni'); return; }
      if (limitReached)  { setDayOffError(`Limit (${MONTHLY_ALLOWANCE} kun) tugagan`); return; }
      setDayOffSaving(true);
      try {
        const [y, m, d] = selectedDateKey.split('-').map(Number);
        await addDayOff(driverId, fleetId, new Date(y, m - 1, d), description.trim() || 'Dam olish');
        reset();
      } catch (err: any) { setDayOffError(err.message); }
      finally { setDayOffSaving(false); }
      return;
    }

    if ((type === TransactionType.EXPENSE || type === TransactionType.DEBT) && !description.trim()) return;
    if (paymentMethod === 'card' && !chequeImage) { setChequeError("Karta cheki talab qilinadi"); return; }

    const ts = new Date(date);
    const now = new Date();
    ts.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    onSubmit({ amount: Number(amount), type, description, driverId, timestamp: ts.getTime(), ...({ paymentMethod, chequeImage: chequeImage ?? undefined } as any) } as any);
    reset();
  };

  // ─── Colours by type ──────────────────────────────────────────────────────
  const typeColor = isDayOff ? '#14b8a6'
    : type === TransactionType.INCOME  ? '#0f766e'
    : type === TransactionType.EXPENSE ? '#ef4444'
    : '#f97316';

  const inp = `w-full px-4 py-3 rounded-xl outline-none border text-sm transition-all ${D
    ? 'bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-[#0f766e]'
    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#0f766e]'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div
        className={`w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden transition-all ${
          D ? 'bg-[#141B2D] border-white/5' : 'bg-white border-gray-200'
        }`}
        style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* ── Top accent bar ─────────────────────────────────────────────── */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${typeColor}, ${typeColor}88)` }} />

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className={`flex items-center justify-between px-6 py-4 ${D ? 'border-b border-white/5' : 'border-b border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: `${typeColor}20` }}>
              {isDayOff ? '🏖️' : type === TransactionType.INCOME ? '💰' : type === TransactionType.EXPENSE ? '💸' : '📋'}
            </div>
            <div>
              <h3 className={`font-black text-base leading-tight ${D ? 'text-white' : 'text-gray-900'}`}>
                {isDayOff ? "Dam olish kuni" : t('newTransaction')}
              </h3>
              {selectedDriver && (
                <p className={`text-xs ${D ? 'text-gray-500' : 'text-gray-400'}`}>{selectedDriver.name}</p>
              )}
            </div>
          </div>
          <button onClick={reset} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${D ? 'text-gray-500 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">

            {/* Row 1: Driver + Date — horizontal */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${D ? 'text-gray-500' : 'text-gray-400'}`}>
                  Haydovchi
                </label>
                <CustomSelect
                  label=""
                  value={driverId}
                  onChange={setDriverId}
                  options={[
                    { id: '', name: 'Tanlang...' },
                    ...drivers.map(d => ({ id: d.id, name: d.name }))
                  ]}
                  theme={theme}
                  icon={UsersIcon}
                />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${D ? 'text-gray-500' : 'text-gray-400'}`}>
                  Sana
                </label>
                <DatePicker label="" value={date} onChange={setDate} theme={theme} />
              </div>
            </div>

            {/* Day off toggle — compact horizontal */}
            {driverId && (
              <div
                onClick={() => { if (!alreadyDayOff && !limitReached) setIsDayOff(p => !p); }}
                className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                  isDayOff
                    ? D ? 'bg-teal-500/10 border-teal-500/30' : 'bg-teal-50 border-teal-300'
                    : alreadyDayOff || limitReached
                    ? 'opacity-50 cursor-not-allowed ' + (D ? 'bg-gray-800/50 border-white/5' : 'bg-gray-50 border-gray-200')
                    : D ? 'bg-white/3 border-white/5 hover:border-teal-500/30' : 'bg-gray-50 border-gray-100 hover:border-teal-200'
                }`}
              >
                <span className="text-xl flex-shrink-0">🏖️</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${isDayOff ? 'text-teal-400' : D ? 'text-gray-300' : 'text-gray-700'}`}>
                    Dam olish kuni
                  </p>
                  <p className={`text-xs truncate ${D ? 'text-gray-600' : 'text-gray-400'}`}>
                    {alreadyDayOff ? '✓ Allaqachon belgilangan' : limitReached
                      ? `Limit tugagan (${usedThisMonth}/${MONTHLY_ALLOWANCE})`
                      : `${usedThisMonth}/${MONTHLY_ALLOWANCE} · Kunlik reja kerak emas`}
                  </p>
                </div>
                {/* Toggle pill */}
                <div className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${isDayOff ? 'bg-teal-500' : D ? 'bg-gray-700' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200 ${isDayOff ? 'left-4' : 'left-0.5'}`} />
                </div>
              </div>
            )}
            {dayOffError && <p className="text-xs text-red-400 -mt-2 pl-1">⚠ {dayOffError}</p>}

            {/* Normal transaction section */}
            {!isDayOff && (
              <>
                {/* Type selector — horizontal pill row */}
                <div className={`flex p-1 rounded-2xl gap-1 ${D ? 'bg-gray-900/60' : 'bg-gray-100'}`}>
                  {[
                    { val: TransactionType.INCOME,  label: t('income'),  color: '#0f766e', bg: '#0f766e15' },
                    { val: TransactionType.EXPENSE, label: t('expense'), color: '#ef4444', bg: '#ef444415' },
                    { val: TransactionType.DEBT,    label: 'Qarz',      color: '#f97316', bg: '#f9731615' },
                  ].map(item => (
                    <button key={item.val} type="button" onClick={() => setType(item.val)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-black transition-all"
                      style={type === item.val ? { background: item.bg, color: item.color, boxShadow: `0 0 0 1px ${item.color}30` } : {
                        color: D ? '#6b7280' : '#9ca3af',
                      }}>
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Debt warning — compact inline */}
                {type === TransactionType.INCOME && driverDebt && driverDebt.remaining > 0 && (
                  <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${D ? 'bg-orange-500/5 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">⚠️</span>
                      <span className="text-xs font-semibold text-orange-400">Qolgan qarz</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-orange-400 font-mono">−{fmt(driverDebt.remaining)}</span>
                      {amount && Number(amount) > 0 && (
                        <span className={`block text-[10px] font-bold ${Math.max(0, driverDebt.remaining - Number(amount)) > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                          → {Math.max(0, driverDebt.remaining - Number(amount)) > 0
                            ? `−${fmt(Math.max(0, driverDebt.remaining - Number(amount)))} qoladi`
                            : "To'ldi ✓"}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Amount — big focal input */}
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${D ? 'text-gray-500' : 'text-gray-400'}`}>Summa (UZS)</label>
                  <div className="relative">
                    <input
                      type="text" required inputMode="numeric"
                      value={displayAmount} onChange={handleAmountChange}
                      placeholder="0"
                      className={`w-full px-4 py-4 rounded-xl border outline-none font-black text-2xl font-mono tracking-tight transition-all ${D
                        ? 'bg-gray-800/80 border-gray-700 text-white placeholder-gray-700 focus:border-[#0f766e]'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-300 focus:border-[#0f766e]'}`}
                    />
                    {displayAmount && (
                      <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold ${D ? 'text-gray-500' : 'text-gray-400'}`}>UZS</span>
                    )}
                  </div>
                </div>

                {/* ── Payment method — horizontal compact ───────────── */}
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${D ? 'text-gray-500' : 'text-gray-400'}`}>To'lov usuli</label>
                  <div className="flex gap-2">
                    {PAYMENT_METHODS.map(pm => {
                      const active = paymentMethod === pm.id;
                      return (
                        <button key={pm.id} type="button"
                          onClick={() => { setPaymentMethod(pm.id); setChequeImage(null); setChequeError(null); }}
                          className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                            active
                              ? D ? 'bg-[#0f766e]/15 border-[#0f766e]/50 text-[#0f766e]' : 'bg-teal-50 border-teal-400 text-teal-700'
                              : D ? 'bg-gray-800/60 border-white/5 text-gray-400 hover:border-white/10' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-base">{pm.emoji}</span>
                          <span>{pm.label}</span>
                          {active && <span className="ml-auto text-[#0f766e]">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Cheque uploader — receipt style ───────────────── */}
                {paymentMethod === 'card' && (
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${D ? 'text-gray-500' : 'text-gray-400'}`}>
                      <span>Karta cheki</span>
                      <span className="text-red-400">*</span>
                    </label>

                    {chequeImage ? (
                      /* ── Receipt preview ── */
                      <div className={`rounded-2xl overflow-hidden border ${D ? 'border-[#0f766e]/30 bg-gray-900' : 'border-teal-200 bg-gray-50'}`}>
                        {/* Receipt header row */}
                        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${D ? 'border-white/5 bg-gray-800/50' : 'border-gray-100 bg-white'}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">💳</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${D ? 'text-teal-400' : 'text-teal-600'}`}>Karta cheki</span>
                          </div>
                          <button type="button" onClick={() => { setChequeImage(null); setChequeError(null); }}
                            className="text-[10px] font-bold text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors">
                            O'chirish
                          </button>
                        </div>
                        {/* Tear line */}
                        <div className="relative h-3 overflow-hidden">
                          <div className={`absolute inset-0 flex items-center justify-between px-2`}>
                            {Array.from({length: 18}).map((_, i) => (
                              <div key={i} className={`w-2 h-2 rounded-full ${D ? 'bg-[#1a2332]' : 'bg-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                        {/* Image */}
                        <div className="px-4 pb-4">
                          <img src={chequeImage} alt="Cheque" className="w-full rounded-xl object-contain max-h-48 shadow-md" />
                        </div>
                        {/* Bottom tear */}
                        <div className="relative h-3 overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-between px-2">
                            {Array.from({length: 18}).map((_, i) => (
                              <div key={i} className={`w-2 h-2 rounded-full ${D ? 'bg-[#1a2332]' : 'bg-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ── Drop / paste zone ── */
                      <div
                        onClick={() => chequeRef.current?.click()}
                        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) processImage(f); }}
                        onDragOver={e => e.preventDefault()}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all group ${D
                          ? 'border-gray-700 hover:border-teal-500/50 bg-gray-800/30 hover:bg-teal-500/5'
                          : 'border-gray-200 hover:border-teal-300 bg-gray-50 hover:bg-teal-50/50'}`}
                      >
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform group-hover:scale-110 ${D ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          📋
                        </div>
                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold ${D ? 'text-gray-300' : 'text-gray-700'}`}>Chekni joylashtiring</p>
                          <p className={`text-xs mt-0.5 ${D ? 'text-gray-600' : 'text-gray-400'}`}>Rasm nusxalash → Ctrl+V yoki bosing</p>
                        </div>
                        {/* Keyboard hint */}
                        <div className={`flex-shrink-0 flex items-center gap-0.5 ${D ? 'text-gray-600' : 'text-gray-300'}`}>
                          {['Ctrl', '+', 'V'].map(k => (
                            <span key={k} className={`text-[9px] font-mono font-black px-1 py-0.5 rounded ${k === '+' ? '' : D ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {chequeError && <p className="mt-1.5 text-xs text-red-400">⚠ {chequeError}</p>}
                    <input ref={chequeRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) processImage(f); }} />
                  </div>
                )}

                {/* Comment */}
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1 ${D ? 'text-gray-500' : 'text-gray-400'}`}>
                    Izoh
                    {(type === TransactionType.EXPENSE || type === TransactionType.DEBT) && <span className="text-red-400">*</span>}
                  </label>
                  <textarea
                    required={type === TransactionType.EXPENSE || type === TransactionType.DEBT}
                    value={description} onChange={e => setDescription(e.target.value)}
                    rows={2}
                    className={`${inp} resize-none`}
                    placeholder={type === TransactionType.DEBT ? 'Masalan: Mashina zarari...' : type === TransactionType.EXPENSE ? 'Masalan: Benzin uchun...' : 'Ixtiyoriy...'}
                  />
                </div>
              </>
            )}

            {/* Day off note */}
            {isDayOff && (
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${D ? 'text-gray-500' : 'text-gray-400'}`}>Izoh (ixtiyoriy)</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Masalan: Shaxsiy sabab" className={inp} />
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <div className={`px-6 py-4 flex items-center gap-3 border-t ${D ? 'border-white/5 bg-gray-900/40' : 'border-gray-100 bg-gray-50/80'}`}>
            <button type="button" onClick={reset}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${D ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Bekor
            </button>
            <button type="submit" disabled={dayOffSaving}
              className="flex-[2] py-3 rounded-xl text-sm font-black text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${typeColor}, ${typeColor}cc)`, boxShadow: `0 4px 20px ${typeColor}40` }}>
              {dayOffSaving ? '...' : isDayOff ? '🏖️ Saqlash' : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinancialModal;