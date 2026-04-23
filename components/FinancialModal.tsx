import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { XIcon, UsersIcon, SearchIcon, CheckIcon, ChevronDownIcon } from './Icons';
import DatePicker from './DatePicker';
import { Driver, Transaction, TransactionType, Car } from '../src/core/types';
import { PaymentStatus } from '../src/core/types/transaction.types';
import { toDateKey } from '../services/daysOffService';

type PaymentMethod = 'cash' | 'card';
type ExpenseTarget = 'driver' | 'car' | 'other';

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'cash', label: 'Naqd',  icon: '💵' },
  { id: 'card', label: 'Karta', icon: '💳' },
];

const OTHER_CATEGORIES = [
  { icon: '⛽', label: 'Benzin'       },
  { icon: '🔧', label: 'Ehtiyot qism' },
  { icon: '🔩', label: 'Ta\'mirlash'  },
  { icon: '🚨', label: 'Jarima'       },
  { icon: '💡', label: 'Kommunal'     },
  { icon: '🏢', label: 'Ijara'        },
  { icon: '🛒', label: 'Xarid'        },
  { icon: '📝', label: 'Boshqa'       },
];

interface FinancialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Transaction, 'id'>, id?: string) => void;
  drivers: Driver[];
  cars?: Car[];
  transactions?: Transaction[];
  theme: 'light' | 'dark';
  fleetId?: string;
  initialType?: TransactionType;
  initialDriverId?: string;
  initialDate?: Date;
  initialTransaction?: Transaction;
}

const FinancialModal: React.FC<FinancialModalProps> = ({
  isOpen, onClose, onSubmit,
  drivers, cars = [], transactions = [],
  theme, fleetId = '',
  initialType, initialDriverId, initialDate, initialTransaction,
}) => {
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  const [type,          setType]          = useState<TransactionType>(initialType || TransactionType.INCOME);
  const [expenseTarget, setExpenseTarget] = useState<ExpenseTarget>('driver');
  const [driverId,      setDriverId]      = useState(initialDriverId || '');
  const [carId,         setCarId]         = useState('');
  const [driverSearch,  setDriverSearch]  = useState('');
  const [carSearch,     setCarSearch]     = useState('');
  const [isDriverOpen,  setIsDriverOpen]  = useState(false);
  const [isCarOpen,     setIsCarOpen]     = useState(false);
  const [amount,        setAmount]        = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [description,   setDescription]   = useState('');
  const [date,          setDate]          = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [chequeImage,   setChequeImage]   = useState<string | null>(null);
  const [chequeError,   setChequeError]   = useState<string | null>(null);
  const chequeRef = useRef<HTMLInputElement>(null);

  // ── Init / reset ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      if (initialTransaction) {
        setType(initialTransaction.type);
        const tgt: ExpenseTarget = initialTransaction.driverId ? 'driver' : initialTransaction.carId ? 'car' : 'other';
        setExpenseTarget(tgt);
        setDriverId(initialTransaction.driverId || '');
        setCarId(initialTransaction.carId || '');
        setAmount(initialTransaction.amount.toString());
        setDisplayAmount(fmtDisplay(initialTransaction.amount.toString()));
        setDescription(initialTransaction.description || '');
        setDate(new Date(initialTransaction.timestamp));
        setPaymentMethod((initialTransaction as any).paymentMethod || 'cash');
        setChequeImage((initialTransaction as any).chequeImage || null);
        setIsDriverOpen(false);
        setIsCarOpen(false);
      } else {
        setType(initialType || TransactionType.INCOME);
        if (initialDriverId) setDriverId(initialDriverId);
        if (initialDate)     setDate(initialDate);
        setIsDriverOpen(!initialDriverId);
        setDriverSearch('');
      }
    }
  }, [isOpen, initialType, initialDriverId, initialDate, initialTransaction]);

  useEffect(() => {
    if (!isOpen) {
      setAmount(''); setDisplayAmount(''); setDescription('');
      setType(TransactionType.INCOME); setDate(new Date());
      setPaymentMethod('cash'); setChequeImage(null); setChequeError(null);
      setExpenseTarget('driver');
    } else if (isOpen && drivers.length > 0) {
      if (!driverId || !drivers.find(d => d.id === driverId)) setDriverId(drivers[0].id);
    }
  }, [isOpen, drivers, driverId]);

  // ── Cheque paste ─────────────────────────────────────────────────────────────
  const processImageFile = useCallback((file: File) => {
    setChequeError(null);
    if (!file.type.startsWith('image/')) { setChequeError('Faqat rasm fayl'); return; }
    if (file.size > 5 * 1024 * 1024)     { setChequeError('Fayl hajmi 5MB dan oshmasligi kerak'); return; }
    const reader = new FileReader();
    reader.onload = e => setChequeImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    if (!isOpen || paymentMethod !== 'card') return;
    const onPaste = (e: ClipboardEvent) => {
      for (const item of Array.from(e.clipboardData?.items ?? [])) {
        if (item.type.startsWith('image/')) { const f = item.getAsFile(); if (f) processImageFile(f); break; }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isOpen, paymentMethod, processImageFile]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const fmtDisplay = (v: string) => v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setAmount(raw);
    setDisplayAmount(fmtDisplay(raw));
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const selectedDriver  = drivers.find(d => d.id === driverId) ?? null;
  const selectedCar     = cars.find(c => c.id === carId) ?? null;
  const filteredDrivers = drivers.filter(d =>
    d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
    (d.carModel ?? '').toLowerCase().includes(driverSearch.toLowerCase()) ||
    (d.licensePlate ?? '').toLowerCase().includes(driverSearch.toLowerCase())
  );
  const filteredCars = cars.filter(c =>
    c.name.toLowerCase().includes(carSearch.toLowerCase()) ||
    c.licensePlate.toLowerCase().includes(carSearch.toLowerCase())
  );

  const driverDebtInfo = useMemo(() => {
    if (!selectedDriver || transactions.length === 0) return null;
    const txs = transactions.filter(tx => tx.driverId === selectedDriver.id && tx.status !== PaymentStatus.DELETED);
    const debt = txs.filter(tx => tx.type === TransactionType.DEBT).reduce((s, tx) => s + Math.abs(tx.amount), 0);
    if (!debt) return null;
    const income = txs.filter(tx => tx.type === TransactionType.INCOME).reduce((s, tx) => s + Math.abs(tx.amount), 0);
    return { totalDebt: debt, remaining: Math.max(0, debt - income) };
  }, [selectedDriver, transactions]);

  if (!isOpen) return null;

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (type === TransactionType.EXPENSE) {
      if (expenseTarget === 'driver' && (!driverId || !drivers.find(d => d.id === driverId))) return;
      if (expenseTarget === 'car'    && (!carId    || !cars.find(c => c.id === carId)))       return;
      if (!description.trim()) return;
    } else {
      if (!driverId || !drivers.find(d => d.id === driverId)) return;
    }

    let finalAmount = Number(amount);
    if (type === TransactionType.DAY_OFF) finalAmount = 0;
    if (type !== TransactionType.DAY_OFF && (isNaN(finalAmount) || finalAmount <= 0)) return;
    if (paymentMethod === 'card' && !chequeImage) {
      setChequeError("Karta orqali to'lovda chek rasmi talab qilinadi");
      return;
    }

    const timestamp = new Date(date);
    const now = new Date();
    timestamp.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    const entityFields = type === TransactionType.EXPENSE
      ? expenseTarget === 'driver' ? { driverId }
        : expenseTarget === 'car'  ? { carId }
        : {}
      : { driverId };

    onSubmit({
      amount: finalAmount, type, description,
      ...entityFields,
      timestamp: timestamp.getTime(),
      ...({ paymentMethod, chequeImage: chequeImage ?? undefined } as any),
    } as any, initialTransaction?.id);

    resetAndClose();
  };

  const resetAndClose = () => {
    setAmount(''); setDisplayAmount(''); setDescription('');
    setDriverId(''); setCarId('');
    setIsDriverOpen(false); setIsCarOpen(false);
    setDriverSearch(''); setCarSearch('');
    setDate(new Date());
    setPaymentMethod('cash'); setChequeImage(null); setChequeError(null);
    setExpenseTarget('driver');
    onClose();
  };

  // ── Styles ───────────────────────────────────────────────────────────────────
  const inputClass = `w-full px-4 py-3 rounded-xl outline-none transition-all border ${isDark
    ? 'bg-gray-800 border-gray-700 text-white focus:border-teal-500 placeholder-gray-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-teal-500 placeholder-gray-400'}`;
  const labelClass = `block text-[11px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`;

  const typeConfig = {
    [TransactionType.INCOME]:  { label: 'Kirim',     color: 'bg-teal-500',  shadow: 'shadow-sm'  },
    [TransactionType.EXPENSE]: { label: 'Chiqim',    color: 'bg-red-500',   shadow: 'shadow-sm'   },
    [TransactionType.DAY_OFF]: { label: 'Dam olish', color: 'bg-blue-500',  shadow: 'shadow-sm'  },
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className={`flex flex-col md:flex-row w-full max-w-[1000px] max-h-[92vh] rounded-[2rem] shadow-2xl overflow-hidden border ${
          isDark ? 'bg-[#1F2937] border-gray-700/60' : 'bg-white border-gray-200'
        }`}
        style={{ animation: 'modalPop 0.2s ease-out' }}
      >

        {/* ══ LEFT PANEL ══════════════════════════════════════════════════════ */}
        <div className={`flex flex-col w-full md:w-[480px] flex-shrink-0 overflow-y-auto border-b md:border-b-0 md:border-r ${isDark ? 'border-gray-700/60 bg-[#1F2937]' : 'border-gray-100 bg-white'}`}>

          {/* Header */}
          <div className={`sticky top-0 z-10 px-7 py-5 border-b flex items-center justify-between ${isDark ? 'border-gray-700/60 bg-[#1F2937]/95 backdrop-blur-md' : 'border-gray-100 bg-white/95 backdrop-blur-md'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                {type === TransactionType.INCOME ? '💰' : type === TransactionType.DAY_OFF ? '🏖' : '💸'}
              </div>
              <div>
                <h3 className={`font-bold text-base leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {initialTransaction ? 'Tahrirlash' : t('newTransaction')}
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {typeConfig[type]?.label}
                </p>
              </div>
            </div>
            <button type="button" onClick={resetAndClose} className={`md:hidden p-2 rounded-xl transition-colors ${isDark ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-7 space-y-6">

            {/* Type toggle */}
            <div className={`flex gap-1.5 p-1.5 rounded-2xl border ${isDark ? 'bg-gray-900 border-gray-700/80' : 'bg-gray-100 border-gray-200'}`}>
              {[
                { v: TransactionType.INCOME,  label: 'Kirim',     emoji: '💰' },
                { v: TransactionType.EXPENSE, label: 'Chiqim',    emoji: '💸' },
                { v: TransactionType.DAY_OFF, label: 'Dam olish', emoji: '🏖' },
              ].map(item => (
                <button key={item.v} type="button"
                  onClick={() => { setType(item.v); if (item.v !== TransactionType.EXPENSE) setExpenseTarget('driver'); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    type === item.v
                      ? item.v === TransactionType.INCOME  ? 'bg-teal-500 text-white shadow-sm'
                      : item.v === TransactionType.EXPENSE ? 'bg-red-500 text-white shadow-sm'
                      : 'bg-blue-500 text-white shadow-sm'
                      : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  <span className="text-sm">{item.emoji}</span>
                  {item.label}
                </button>
              ))}
            </div>

            {/* Expense target tabs — driver | car | other */}
            {type === TransactionType.EXPENSE && (
              <div className={`flex gap-1 p-1 rounded-xl border ${isDark ? 'bg-gray-900 border-gray-700/60' : 'bg-gray-100 border-gray-200'}`}>
                {([
                  { v: 'driver', label: 'Haydovchi', icon: '👤' },
                  { v: 'car',    label: 'Mashina',   icon: '🚗' },
                  { v: 'other',  label: 'Boshqa',    icon: '📦' },
                ] as { v: ExpenseTarget; label: string; icon: string }[]).map(tab => (
                  <button key={tab.v} type="button"
                    onClick={() => {
                      setExpenseTarget(tab.v);
                      if (tab.v !== 'driver') { setDriverId(''); setIsDriverOpen(false); }
                      if (tab.v !== 'car')    { setCarId('');    setIsCarOpen(false); }
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                      expenseTarget === tab.v
                        ? isDark ? 'bg-gray-700 text-white shadow' : 'bg-white text-gray-900 shadow'
                        : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <span>{tab.icon}</span> {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Entity selector */}
            {(type !== TransactionType.EXPENSE || expenseTarget === 'driver') && (
              <div className="relative">
                <label className={labelClass}>
                  <UsersIcon className="inline w-3 h-3 mr-1 mb-0.5" />
                  Haydovchi
                </label>

                {!isDriverOpen && selectedDriver ? (
                  <div onClick={() => setIsDriverOpen(true)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all group active:scale-[0.99] ${isDark ? 'bg-gray-800/60 border-gray-700 hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300 shadow-sm'}`}>
                    <div className="flex items-center gap-4">
                      {selectedDriver.avatar
                        ? <img src={selectedDriver.avatar} alt={selectedDriver.name} className={`w-11 h-11 rounded-xl object-cover border-2 ${isDark ? 'border-gray-600' : 'border-white shadow'}`} />
                        : <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{selectedDriver.name.charAt(0)}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedDriver.name}</p>
                        <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {selectedDriver.carModel || '—'} · <span className="font-mono">{selectedDriver.licensePlate || ''}</span>
                        </p>
                      </div>
                      <ChevronDownIcon className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700 shadow-xl' : 'bg-white border-gray-200 shadow-lg'}`}>
                    <div className={`p-3 border-b ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="relative">
                        <SearchIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <input type="text" value={driverSearch} onChange={e => setDriverSearch(e.target.value)}
                          placeholder="Qidirish..." autoFocus
                          className={`w-full pl-9 pr-4 py-2.5 rounded-xl outline-none text-sm ${isDark ? 'bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500/40' : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-200 focus:border-teal-500'}`} />
                      </div>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto divide-y divide-gray-700/30">
                      {filteredDrivers.map(d => (
                        <div key={d.id} onClick={() => { setDriverId(d.id); setIsDriverOpen(false); setDriverSearch(''); }}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${driverId === d.id ? isDark ? 'bg-teal-500/15' : 'bg-teal-50' : isDark ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}>
                          {d.avatar
                            ? <img src={d.avatar} alt={d.name} className="w-9 h-9 rounded-lg object-cover" />
                            : <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{d.name.charAt(0)}</div>
                          }
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{d.name}</p>
                            <p className={`text-[11px] truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{d.carModel} · {d.licensePlate}</p>
                          </div>
                          {driverId === d.id && <CheckIcon className="w-4 h-4 text-teal-500 flex-shrink-0" />}
                        </div>
                      ))}
                      {filteredDrivers.length === 0 && <p className="p-5 text-center text-sm text-gray-500">Topilmadi</p>}
                    </div>
                    {selectedDriver && (
                      <div onClick={() => setIsDriverOpen(false)}
                        className={`p-3 text-center border-t cursor-pointer text-xs font-medium transition-colors ${isDark ? 'border-gray-700 text-gray-500 hover:text-gray-300 hover:bg-gray-700/40' : 'border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
                        Yopish
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {type === TransactionType.EXPENSE && expenseTarget === 'car' && (
              <div className="relative">
                <label className={labelClass}>🚗 Mashina</label>
                {!isCarOpen && selectedCar ? (
                  <div onClick={() => setIsCarOpen(true)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all group ${isDark ? 'bg-gray-800/60 border-gray-700 hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300 shadow-sm'}`}>
                    <div className="flex items-center gap-4">
                      {selectedCar.avatar
                        ? <img src={selectedCar.avatar} alt={selectedCar.name} className="w-11 h-11 rounded-xl object-cover" />
                        : <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>🚗</div>
                      }
                      <div className="flex-1">
                        <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedCar.name}</p>
                        <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{selectedCar.licensePlate}</p>
                      </div>
                      <ChevronDownIcon className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700 shadow-xl' : 'bg-white border-gray-200 shadow-lg'}`}>
                    <div className={`p-3 border-b ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="relative">
                        <SearchIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <input type="text" value={carSearch} onChange={e => setCarSearch(e.target.value)}
                          placeholder="Mashinani qidirish..." autoFocus
                          className={`w-full pl-9 pr-4 py-2.5 rounded-xl outline-none text-sm ${isDark ? 'bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500/40' : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-200 focus:border-teal-500'}`} />
                      </div>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto divide-y divide-gray-700/30">
                      {filteredCars.map(c => (
                        <div key={c.id} onClick={() => { setCarId(c.id); setIsCarOpen(false); setCarSearch(''); }}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${carId === c.id ? isDark ? 'bg-teal-500/15' : 'bg-teal-50' : isDark ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}>
                          {c.avatar ? <img src={c.avatar} alt={c.name} className="w-9 h-9 rounded-lg object-cover" /> : <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>🚗</div>}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{c.name}</p>
                            <p className={`text-[11px] font-mono truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{c.licensePlate}</p>
                          </div>
                          {carId === c.id && <CheckIcon className="w-4 h-4 text-teal-500 flex-shrink-0" />}
                        </div>
                      ))}
                      {filteredCars.length === 0 && <p className="p-5 text-center text-sm text-gray-500">Topilmadi</p>}
                    </div>
                    {selectedCar && (
                      <div onClick={() => setIsCarOpen(false)}
                        className={`p-3 text-center border-t cursor-pointer text-xs font-medium transition-colors ${isDark ? 'border-gray-700 text-gray-500 hover:text-gray-300 hover:bg-gray-700/40' : 'border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
                        Yopish
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Other: category chips */}
            {type === TransactionType.EXPENSE && expenseTarget === 'other' && (
              <div>
                <label className={labelClass}>📦 Kategoriya</label>
                <div className="grid grid-cols-4 gap-2">
                  {OTHER_CATEGORIES.map(cat => (
                    <button key={cat.label} type="button"
                      onClick={() => setDescription(cat.label)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                        description === cat.label
                          ? isDark ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-red-50 border-red-300 text-red-600'
                          : isDark ? 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="leading-tight text-center">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date */}
            <DatePicker label={t('time') || 'Vaqt'} value={date} onChange={setDate} theme={theme} />

            {/* Debt warning */}
            {type === TransactionType.INCOME && driverDebtInfo && driverDebtInfo.remaining > 0 && (
              <div className="rounded-xl p-4 border border-orange-500/30 bg-orange-500/5">
                <p className="text-xs font-bold text-orange-400 mb-2">⚠ Haydovchida qarz bor</p>
                <div className="flex justify-between text-sm">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Qolgan qarz:</span>
                  <span className="font-bold text-orange-400">−{fmt(driverDebtInfo.remaining)} UZS</span>
                </div>
                {amount && Number(amount) > 0 && (
                  <div className={`flex justify-between text-sm pt-2 mt-2 border-t ${isDark ? 'border-orange-500/20' : 'border-orange-200'}`}>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Bu to'lovdan so'ng:</span>
                    <span className={`font-bold ${Math.max(0, driverDebtInfo.remaining - Number(amount)) > 0 ? 'text-orange-400' : 'text-teal-400'}`}>
                      {Math.max(0, driverDebtInfo.remaining - Number(amount)) > 0
                        ? `−${fmt(Math.max(0, driverDebtInfo.remaining - Number(amount)))} UZS`
                        : "Qarz to'landi ✓"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Amount */}
            {type !== TransactionType.DAY_OFF && (
              <div>
                <label className={labelClass}>Summa (UZS)</label>
                <div className="relative">
                  <input type="text" required inputMode="numeric"
                    value={displayAmount} onChange={handleAmountChange}
                    className={`${inputClass} font-mono text-4xl font-black tracking-tight h-[72px] pr-16 shadow-inner`}
                    placeholder="0"
                  />
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>UZS</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══ RIGHT PANEL ══════════════════════════════════════════════════════ */}
        <div className={`flex flex-col flex-1 overflow-y-auto ${isDark ? 'bg-black/10' : 'bg-gray-50/60'}`}>

          {/* Desktop close */}
          <div className="flex justify-end px-6 py-5 flex-shrink-0">
            <button type="button" onClick={resetAndClose}
              className={`hidden md:flex items-center justify-center w-8 h-8 rounded-xl transition-colors ${isDark ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="px-7 pb-7 space-y-6 flex-1 -mt-2">

            {/* Day off info */}
            {type === TransactionType.DAY_OFF && (
              <div className={`rounded-2xl p-6 border flex flex-col items-center gap-3 text-center ${isDark ? 'border-blue-500/30 bg-blue-500/8' : 'border-blue-200 bg-blue-50'}`}>
                <span className="text-5xl">🏖</span>
                <p className={`text-base font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Dam olish kuni</p>
                <p className={`text-sm leading-relaxed max-w-xs ${isDark ? 'text-blue-400/80' : 'text-blue-600/80'}`}>
                  <strong>{date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> kuni haydovchidan pul undirilmaydi.
                </p>
              </div>
            )}

            {/* Payment method */}
            {type !== TransactionType.DAY_OFF && (
              <div>
                <label className={labelClass}>To'lov usuli</label>
                <div className="grid grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map(pm => (
                    <button key={pm.id} type="button"
                      onClick={() => { setPaymentMethod(pm.id); setChequeImage(null); setChequeError(null); }}
                      className={`flex flex-col items-center justify-center gap-2.5 h-[88px] rounded-2xl border text-sm font-bold transition-all active:scale-95 ${
                        paymentMethod === pm.id
                          ? isDark ? 'bg-teal-500/15 border-teal-500/60 text-teal-400 shadow-sm' : 'bg-teal-50 border-teal-400 text-teal-700 shadow-sm'
                          : isDark ? 'bg-gray-800/60 border-gray-700 text-gray-400 hover:border-gray-600' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 shadow-sm'
                      }`}
                    >
                      <span className="text-3xl">{pm.icon}</span>
                      <span className="text-xs font-bold">{pm.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cheque upload */}
            {paymentMethod === 'card' && type !== TransactionType.DAY_OFF && (
              <div>
                <label className={labelClass}>
                  Karta cheki <span className="text-red-400 ml-1 normal-case text-xs font-normal">(majburiy)</span>
                </label>
                {chequeImage ? (
                  <div className={`relative rounded-2xl overflow-hidden border-2 ${isDark ? 'border-teal-500/40 bg-gray-900' : 'border-teal-300 bg-gray-50'}`}>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className={`text-xs font-bold ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>✓ Chek qo'shildi</span>
                      <button type="button" onClick={() => { setChequeImage(null); setChequeError(null); }}
                        className={`text-xs px-3 py-1 rounded-lg font-bold transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}>
                        Olib tashlash
                      </button>
                    </div>
                    <div className={`mx-4 border-t border-dashed mb-3 ${isDark ? 'border-gray-700' : 'border-gray-300'}`} />
                    <div className="px-4 pb-4">
                      <img src={chequeImage} alt="Cheque" className="w-full rounded-xl object-contain max-h-44 shadow" />
                    </div>
                  </div>
                ) : (
                  <div onClick={() => chequeRef.current?.click()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) processImageFile(f); }}
                    onDragOver={e => e.preventDefault()}
                    className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all py-8 px-4 group ${
                      isDark ? 'border-gray-700 hover:border-teal-500/50 bg-gray-800/40 hover:bg-teal-500/5' : 'border-gray-300 hover:border-teal-400 bg-white hover:bg-teal-50/50 shadow-sm'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:-translate-y-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>🧾</div>
                    <div className="text-center">
                      <p className={`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Karta chekini yuklang</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                        Drag & drop · <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isDark ? 'bg-gray-700 border border-gray-600' : 'bg-gray-100 border border-gray-200'}`}>Ctrl+V</kbd> · yoki bosing
                      </p>
                    </div>
                  </div>
                )}
                {chequeError && <p className="mt-2 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">⚠ {chequeError}</p>}
                <input ref={chequeRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) processImageFile(f); }} />
              </div>
            )}

            {/* Comment / description */}
            <div>
              <label className={labelClass}>
                {t('comment')}
                {type === TransactionType.EXPENSE && <span className="text-red-400 ml-1 normal-case text-xs font-normal">(majburiy)</span>}
              </label>
              <textarea
                required={type === TransactionType.EXPENSE}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className={`${inputClass} min-h-[110px] resize-none shadow-inner`}
                placeholder={
                  type === TransactionType.EXPENSE && expenseTarget === 'other'
                    ? 'Chiqim sababi...'
                    : type === TransactionType.EXPENSE
                    ? t('commentPlaceholder') || 'Masalan: Benzin uchun, Ta\'mirlash...'
                    : t('commentPlaceholder') || 'Ixtiyoriy izoh...'
                }
              />
            </div>
          </div>

          {/* Action footer */}
          <div className={`mt-auto px-7 py-5 flex justify-end gap-3 border-t ${isDark ? 'bg-transparent border-gray-700/60' : 'bg-gray-50 border-gray-100'}`}>
            <button type="button" onClick={resetAndClose}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm'}`}>
              {t('cancel')}
            </button>
            <button type="submit"
              className={`px-10 py-3 text-white rounded-xl text-sm font-black shadow-sm transition-all transform active:scale-95 ${
                type === TransactionType.INCOME  ? 'bg-teal-500 hover:bg-teal-600'
                : type === TransactionType.DAY_OFF ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-red-500 hover:bg-red-600'
              }`}>
              {t('save')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default FinancialModal;
