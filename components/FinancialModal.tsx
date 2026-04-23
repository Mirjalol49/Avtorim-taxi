import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { XIcon, UsersIcon, SearchIcon, CheckIcon, ChevronDownIcon } from './Icons';
import DatePicker from './DatePicker';
import { Driver, Transaction, TransactionType, Car } from '../src/core/types';
import { PaymentStatus } from '../src/core/types/transaction.types';
import {
  toDateKey,
  toMonthKey,
} from '../services/daysOffService';

// ─── Payment method ──────────────────────────────────────────────────────────
type PaymentMethod = 'cash' | 'card' | 'transfer';

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'cash',     label: "Naqd",       icon: '💵' },
  { id: 'card',     label: "Karta",      icon: '💳' },
];

// ─── Props ───────────────────────────────────────────────────────────────────
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

// ─── Component ───────────────────────────────────────────────────────────────
const FinancialModal: React.FC<FinancialModalProps> = ({
  isOpen, onClose, onSubmit, drivers, cars = [], transactions = [], theme, fleetId = '',
  initialType, initialDriverId, initialDate, initialTransaction
}) => {
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  // Transaction fields
  const [type, setType] = useState<TransactionType>(initialType || TransactionType.INCOME);
  const [expenseTarget, setExpenseTarget] = useState<'driver' | 'car'>('driver');
  const [driverId, setDriverId] = useState<string>(initialDriverId || '');
  const [carId, setCarId] = useState<string>('');
  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);
  const [isCarDropdownOpen, setIsCarDropdownOpen] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [carSearch, setCarSearch] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());

  // Reset states when modal is opened or explicitly provided initials change
  useEffect(() => {
    if (isOpen) {
      if (initialTransaction) {
        setType(initialTransaction.type);
        setExpenseTarget(initialTransaction.driverId ? 'driver' : 'car');
        setDriverId(initialTransaction.driverId || '');
        setCarId(initialTransaction.carId || '');
        setAmount(initialTransaction.amount.toString());
        setDisplayAmount(formatNumberDisplay(initialTransaction.amount.toString()));
        setDescription(initialTransaction.description || '');
        setDate(new Date(initialTransaction.timestamp));
        setPaymentMethod(initialTransaction.paymentMethod || 'cash');
        setChequeImage(initialTransaction.chequeImage || null);
        setIsDriverDropdownOpen(false);
        setIsCarDropdownOpen(false);
      } else {
        setType(initialType || TransactionType.INCOME);
        if (initialDriverId) setDriverId(initialDriverId);
        if (initialDate) setDate(initialDate);
        setIsDriverDropdownOpen(!initialDriverId); // Open dropdown if no driver is pre-selected
        setDriverSearch('');
      }
    }
  }, [isOpen, initialType, initialDriverId, initialDate, initialTransaction]);

  // Payment method + cheque
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [chequeImage, setChequeImage] = useState<string | null>(null);  // base64
  const [chequeError, setChequeError] = useState<string | null>(null);
  const chequeRef = useRef<HTMLInputElement>(null);

  const selectedDriver = drivers.find(d => d.id === driverId) ?? null;

  const selectedDateKey = toDateKey(date);

  // Debt preview
  const driverDebtInfo = useMemo(() => {
    if (!selectedDriver || transactions.length === 0) return null;
    const driverTxs = transactions.filter(tx =>
      tx.driverId === selectedDriver.id &&
      tx.status !== PaymentStatus.DELETED
    );
    const totalDebt = driverTxs
      .filter(tx => tx.type === TransactionType.DEBT)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    if (totalDebt === 0) return null;
    const totalIncome = driverTxs
      .filter(tx => tx.type === TransactionType.INCOME)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    return { totalDebt, remaining: Math.max(0, totalDebt - totalIncome) };
  }, [selectedDriver, transactions]);

  const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

  const formatNumberDisplay = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setAmount(rawValue);
    setDisplayAmount(formatNumberDisplay(rawValue));
  };

  // ── Cheque image helpers ────────────────────────────────────────────────────
  const processImageFile = useCallback((file: File) => {
    setChequeError(null);
    if (!file.type.startsWith('image/')) {
      setChequeError('Faqat rasm fayl qabul qilinadi');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setChequeError("Fayl hajmi 5MB dan oshmasligi kerak");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setChequeImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  // Global paste listener
  useEffect(() => {
    if (!isOpen || paymentMethod !== 'card') return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) processImageFile(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, paymentMethod, processImageFile]);

  // ── Reset ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setAmount(''); setDisplayAmount(''); setDescription('');
      setType(TransactionType.INCOME); setDate(new Date());
      setPaymentMethod('cash'); setChequeImage(null); setChequeError(null);
    } else if (isOpen && drivers.length > 0) {
      if (!driverId || !drivers.find(d => d.id === driverId)) setDriverId(drivers[0].id);
    }
  }, [isOpen, drivers, driverId]);

  if (!isOpen) return null;

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type !== TransactionType.EXPENSE || expenseTarget === 'driver') {
      if (!driverId || !drivers.find(d => d.id === driverId)) return;
    } else {
      if (!carId || !cars.find(c => c.id === carId)) return;
    }

    // Normal transaction
    if (type === TransactionType.EXPENSE && !description.trim()) return;
    
    let finalAmount = Number(amount);
    if (type === TransactionType.DAY_OFF) finalAmount = 0;
    
    if (type !== TransactionType.DAY_OFF && (isNaN(finalAmount) || finalAmount <= 0)) {
        return;
    }
    if (paymentMethod === 'card' && !chequeImage) {
      setChequeError("Karta orqali to'lovda chek rasmi talab qilinadi");
      return;
    }

    const timestamp = new Date(date);
    const now = new Date();
    timestamp.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    const isCarExpense = type === TransactionType.EXPENSE && expenseTarget === 'car';

    onSubmit({
      amount: finalAmount,
      type,
      description,
      ...(isCarExpense ? { carId } : { driverId }),
      timestamp: timestamp.getTime(),
      // Extra fields stored as any — backend accepts them
      ...({ paymentMethod, chequeImage: chequeImage ?? undefined } as any),
    } as any, initialTransaction?.id);
    resetAndClose();
  };

  const resetAndClose = () => {
    setAmount(''); setDisplayAmount(''); setDescription('');
    setDriverId(''); setCarId('');
    setIsDriverDropdownOpen(false); setIsCarDropdownOpen(false);
    setDriverSearch(''); setCarSearch('');
    setDate(new Date());
    setPaymentMethod('cash'); setChequeImage(null); setChequeError(null);
    setExpenseTarget('driver');
    onClose();
  };

  // ── Styles ───────────────────────────────────────────────────────────────────
  const inputClass = `w-full px-4 py-3 rounded-xl outline-none transition-all border ${isDark
    ? 'bg-gray-800 border-gray-700 text-white focus:border-[#0f766e] placeholder-gray-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#0f766e] placeholder-gray-400'}`;

  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`;

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(driverSearch.toLowerCase()) || 
    (d.carModel && d.carModel.toLowerCase().includes(driverSearch.toLowerCase())) ||
    (d.licensePlate && d.licensePlate.toLowerCase().includes(driverSearch.toLowerCase()))
  );

  const selectedCar = cars.find(c => c.id === carId);
  const filteredCars = cars.filter(c =>
    c.name.toLowerCase().includes(carSearch.toLowerCase()) ||
    c.licensePlate.toLowerCase().includes(carSearch.toLowerCase())
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
      {/* 
        NEW HORIZONTAL LAYOUT ("Square Rectangle Design")
        Using max-w-[800px] and a flex-col to md:flex-row dual panel approach
      */}
      <form onSubmit={handleSubmit} className={`flex flex-col md:flex-row w-full max-w-[800px] max-h-[95vh] rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200 border ${
        isDark ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
      }`}>

        {/* ── LEFT PANEL (Driver, Date, Amount) ── */}
        <div className={`flex flex-col flex-1 overflow-y-auto border-b md:border-b-0 md:border-r ${isDark ? 'border-gray-700 bg-gray-800/20' : 'border-gray-100 bg-white'}`}>
          {/* Header left */}
          <div className={`sticky top-0 z-10 px-6 py-5 border-b flex justify-between items-center ${
            isDark ? 'border-gray-700 bg-gray-800/80 backdrop-blur-sm' : 'border-gray-100 bg-white/90 backdrop-blur-sm'
          }`}>
            <h3 className={`font-bold text-lg flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <span className="text-xl">💸</span>
              {initialTransaction ? 'Tahrirlash' : t('newTransaction')}
            </h3>
            {/* Close button (Mobile only) */}
            <button type="button" onClick={resetAndClose} className={`md:hidden transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Toggle between Driver and Car (only for Expenses) */}
            {type === TransactionType.EXPENSE && (
              <div className={`flex p-1 mb-4 rounded-xl border ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                <button
                  type="button"
                  onClick={() => { setExpenseTarget('driver'); setCarId(''); setIsCarDropdownOpen(false); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    expenseTarget === 'driver'
                      ? (isDark ? 'bg-gray-700 text-white shadow' : 'bg-white text-gray-900 shadow')
                      : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
                  }`}
                >
                  Haydovchi
                </button>
                <button
                  type="button"
                  onClick={() => { setExpenseTarget('car'); setDriverId(''); setIsDriverDropdownOpen(false); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    expenseTarget === 'car'
                      ? (isDark ? 'bg-gray-700 text-white shadow' : 'bg-white text-gray-900 shadow')
                      : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
                  }`}
                >
                  Mashina
                </button>
              </div>
            )}

            {/* Rich Driver / Car Selector (Apple Style) */}
            <div className="w-full relative">
              <div className="flex items-center gap-2 mb-3">
                <UsersIcon className={`w-3.5 h-3.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {expenseTarget === 'driver' ? t('driver') : 'Mashina'}
                </span>
              </div>

              {expenseTarget === 'driver' ? (
                <>
                  {/* --- DRIVER SELECTOR --- */}
                  {!isDriverDropdownOpen && selectedDriver ? (
                <div 
                  onClick={() => setIsDriverDropdownOpen(true)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all active:scale-[0.98] group ${isDark ? 'bg-gray-800/80 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm hover:shadow'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {selectedDriver.avatar ? (
                        <img src={selectedDriver.avatar} alt={selectedDriver.name} className={`w-12 h-12 rounded-full object-cover border-2 shadow-sm transition-transform group-hover:scale-105 ${isDark ? 'border-gray-600' : 'border-white'}`} />
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm transition-transform group-hover:scale-105 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                          {selectedDriver.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedDriver.name}</h4>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {selectedDriver.carModel || 'Avtomobil yo\'q'} • <span className="font-mono">{selectedDriver.licensePlate || ''}</span>
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isDark ? 'bg-gray-700/50 text-gray-400 group-hover:text-white' : 'bg-gray-100 text-gray-500 group-hover:text-gray-900'} transition-colors`}>
                      <ChevronDownIcon className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`rounded-2xl border overflow-hidden transition-all animate-in slide-in-from-top-2 ${isDark ? 'bg-gray-800/90 border-gray-700 shadow-xl' : 'bg-white border-gray-200 shadow-lg'}`}>
                  <div className={`p-3 border-b ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-100 bg-gray-50/80'}`}>
                    <div className="relative">
                      <SearchIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                      <input 
                        type="text" 
                        value={driverSearch}
                        onChange={(e) => setDriverSearch(e.target.value)}
                        placeholder="Haydovchini qidirish..."
                        autoFocus
                        className={`w-full pl-9 pr-4 py-2.5 rounded-xl outline-none text-sm transition-all ${isDark ? 'bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#0f766e]' : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-200 focus:ring-2 focus:ring-[#0f766e] focus:border-transparent'}`}
                      />
                    </div>
                  </div>
                  <div className="max-h-[260px] overflow-y-auto divide-y dark:divide-gray-700/50 custom-scrollbar">
                    {filteredDrivers.map(d => (
                      <div 
                        key={d.id}
                        onClick={() => {
                          setDriverId(d.id);
                          setIsDriverDropdownOpen(false);
                          setDriverSearch('');
                        }}
                        className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${driverId === d.id ? (isDark ? 'bg-[#0f766e]/20' : 'bg-teal-50') : (isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50')}`}
                      >
                        {d.avatar ? (
                          <img src={d.avatar} alt={d.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                            {d.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-bold truncate ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{d.name}</h4>
                          <p className={`text-[11px] truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{d.carModel} • {d.licensePlate}</p>
                        </div>
                        {driverId === d.id && <CheckIcon className="w-5 h-5 text-[#0f766e]" />}
                      </div>
                    ))}
                    {filteredDrivers.length === 0 && (
                      <div className="p-6 text-center text-sm text-gray-500">Haydovchi topilmadi</div>
                    )}
                  </div>
                  {selectedDriver && (
                    <div 
                      onClick={() => setIsDriverDropdownOpen(false)}
                      className={`p-3 text-center border-t cursor-pointer text-sm font-medium transition-colors ${isDark ? 'border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700/50' : 'border-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                    >
                      Bekor qilish
                    </div>
                  )}
                </div>
                )}
                </>
              ) : (
                <>
                  {/* --- CAR SELECTOR --- */}
                  {!isCarDropdownOpen && selectedCar ? (
                  <div 
                    onClick={() => setIsCarDropdownOpen(true)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all active:scale-[0.98] group ${isDark ? 'bg-gray-800/80 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm hover:shadow'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {selectedCar.avatar ? (
                          <img src={selectedCar.avatar} alt={selectedCar.name} className={`w-12 h-12 rounded-full object-cover border-2 shadow-sm transition-transform group-hover:scale-105 ${isDark ? 'border-gray-600' : 'border-white'}`} />
                        ) : (
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm transition-transform group-hover:scale-105 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                            🚗
                          </div>
                        )}
                        <div>
                          <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedCar.name}</h4>
                          <p className={`text-xs mt-0.5 font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {selectedCar.licensePlate}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isDark ? 'bg-gray-700/50 text-gray-400 group-hover:text-white' : 'bg-gray-100 text-gray-500 group-hover:text-gray-900'} transition-colors`}>
                        <ChevronDownIcon className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-2xl border overflow-hidden transition-all animate-in slide-in-from-top-2 ${isDark ? 'bg-gray-800/90 border-gray-700 shadow-xl' : 'bg-white border-gray-200 shadow-lg'}`}>
                    <div className={`p-3 border-b ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-100 bg-gray-50/80'}`}>
                      <div className="relative">
                        <SearchIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <input 
                          type="text" 
                          value={carSearch}
                          onChange={(e) => setCarSearch(e.target.value)}
                          placeholder="Mashinani qidirish..."
                          autoFocus
                          className={`w-full pl-9 pr-4 py-2.5 rounded-xl outline-none text-sm transition-all ${isDark ? 'bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#0f766e]' : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-200 focus:ring-2 focus:ring-[#0f766e] focus:border-transparent'}`}
                        />
                      </div>
                    </div>
                    <div className="max-h-[260px] overflow-y-auto divide-y dark:divide-gray-700/50 custom-scrollbar">
                      {filteredCars.map(c => (
                        <div 
                          key={c.id}
                          onClick={() => {
                            setCarId(c.id);
                            setIsCarDropdownOpen(false);
                            setCarSearch('');
                          }}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${carId === c.id ? (isDark ? 'bg-[#0f766e]/20' : 'bg-teal-50') : (isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50')}`}
                        >
                          {c.avatar ? (
                            <img src={c.avatar} alt={c.name} className={`w-10 h-10 rounded-full object-cover border shadow-sm ${isDark ? 'border-gray-600' : 'border-gray-200'}`} />
                          ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                              🚗
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-bold truncate ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{c.name}</h4>
                            <p className={`text-[11px] truncate font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{c.licensePlate}</p>
                          </div>
                          {carId === c.id && <CheckIcon className="w-5 h-5 text-[#0f766e]" />}
                        </div>
                      ))}
                      {filteredCars.length === 0 && (
                        <div className="p-6 text-center text-sm text-gray-500">Mashina topilmadi</div>
                      )}
                    </div>
                    {selectedCar && (
                      <div 
                        onClick={() => setIsCarDropdownOpen(false)}
                        className={`p-3 text-center border-t cursor-pointer text-sm font-medium transition-colors ${isDark ? 'border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700/50' : 'border-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                      >
                        Bekor qilish
                      </div>
                    )}
                  </div>
                )}
                </>
              )}
            </div>

            {/* Date */}
            <DatePicker label={t('time') || 'Date'} value={date} onChange={setDate} theme={theme} />

                {/* Type toggle */}
                <div className={`grid grid-cols-3 p-1 rounded-2xl border shadow-inner ${isDark ? 'bg-[#111827] border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                  {[
                    { t: TransactionType.INCOME,  label: 'Kirim',      color: 'bg-[#0f766e]' },
                    { t: TransactionType.EXPENSE, label: 'Chiqim',     color: 'bg-red-500' },
                    { t: TransactionType.DAY_OFF, label: 'Dam olish',  color: 'bg-blue-500' },
                  ].map(item => (
                    <button key={item.t} type="button" onClick={() => { setType(item.t); if(item.t === TransactionType.INCOME) setExpenseTarget('driver'); }}
                      className={`py-3 rounded-xl text-sm font-bold transition-all ${
                        type === item.t ? `${item.color} text-white shadow-lg scale-[1.02]`
                        : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                      }`}>{item.label}</button>
                  ))}
                </div>

                {/* Debt preview */}
                {type === TransactionType.INCOME && driverDebtInfo && driverDebtInfo.remaining > 0 && (
                  <div className="rounded-xl p-4 border border-orange-500/30 bg-orange-500/5">
                    <p className="text-xs font-bold text-orange-400 mb-2">⚠ Haydovchida qarz bor</p>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Qolgan qarz:</span>
                      <span className="font-bold text-orange-400">−{fmt(driverDebtInfo.remaining)} UZS</span>
                    </div>
                    {amount && Number(amount) > 0 && (
                      <div className="flex justify-between text-sm pt-2 border-t border-orange-500/20">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Bu to'lovdan so'ng:</span>
                        <span className={`font-bold ${Math.max(0, driverDebtInfo.remaining - Number(amount)) > 0 ? 'text-orange-400' : 'text-green-400'}`}>
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
                    <label className={labelClass}>{t('amount')} (UZS)</label>
                    <input type="text" required inputMode="numeric"
                      value={displayAmount} onChange={handleAmountChange}
                      className={`${inputClass} font-mono text-3xl font-black tracking-tight h-16 shadow-inner`} placeholder="0" />
                  </div>
                )}
          </div>
        </div>

        {/* ── RIGHT PANEL (Payment Method, Cheque, Comment, Action) ── */}
        <div className={`flex flex-col flex-1 overflow-y-auto ${isDark ? 'bg-gray-800/10' : 'bg-gray-50/50'}`}>
          {/* Header right (Close button) */}
          <div className="sticky top-0 z-10 px-4 py-4 flex justify-end h-[68px]">
            {/* Close button (Desktop only) */}
            <button type="button" onClick={resetAndClose} className={`hidden md:flex items-center justify-center w-8 h-8 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'}`}>
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 pb-6 space-y-6 flex-1 -mt-2">
                {/* ── DAY OFF INFO CARD ───────────────────────── */}
                {type === TransactionType.DAY_OFF && (
                  <div className={`rounded-2xl p-5 border flex flex-col items-center gap-3 text-center mt-4 ${isDark ? 'border-blue-500/30 bg-blue-500/10' : 'border-blue-200 bg-blue-50'}`}>
                    <span className="text-4xl">🌙</span>
                    <p className={`text-sm font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Dam olish kuni</p>
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-blue-400/80' : 'text-blue-600/80'}`}>
                      Tanlangan haydovchi uchun <strong>{date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> sanasi dam olish kuni sifatida belgilanadi.
                    </p>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Bu kunda haydovchidan pul undirilmaydi.
                    </p>
                  </div>
                )}
                {/* ── Payment method ───────────────────────────── */}
                {type !== TransactionType.DAY_OFF && (
                  <div>
                    <label className={labelClass}>To'lov usuli</label>
                  <div className="grid grid-cols-2 gap-3">
                    {PAYMENT_METHODS.map(pm => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => { setPaymentMethod(pm.id); setChequeImage(null); setChequeError(null); }}
                        className={`flex flex-col items-center justify-center gap-2 h-[84px] rounded-xl border text-sm font-bold transition-all active:scale-95 ${
                          paymentMethod === pm.id
                            ? isDark
                              ? 'bg-[#0f766e]/15 border-[#0f766e]/60 text-[#0f766e]'
                              : 'bg-teal-50 border-teal-400 text-teal-700 shadow-sm'
                            : isDark
                            ? 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 shadow-sm'
                        }`}
                      >
                        <span className="text-2xl drop-shadow">{pm.icon}</span>
                        <span className="text-xs">{pm.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                )}

                {/* ── Cheque card (only when card selected) ───── */}
                {paymentMethod === 'card' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className={labelClass}>Karta cheki <span className="text-red-400 text-lg leading-none align-middle ml-1">*</span></label>

                    {chequeImage ? (
                      /* Preview */
                      <div className={`relative rounded-2xl overflow-hidden border-2 shadow-lg ${
                        isDark ? 'border-[#0f766e]/50 bg-gray-800' : 'border-teal-300 bg-gray-50'
                      }`}
                        style={{ background: isDark
                          ? 'repeating-linear-gradient(90deg,#1f2937 0px,#1f2937 10px,#1a2332 10px,#1a2332 20px)'
                          : 'repeating-linear-gradient(90deg,#f9fafb 0px,#f9fafb 10px,#f3f4f6 10px,#f3f4f6 20px)' }}
                      >
                        {/* Receipt top notch */}
                        <div className="flex justify-between px-4 pt-3 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base text-gray-300">#</span>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>Karta cheki olingan</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setChequeImage(null); setChequeError(null); }}
                            className={`text-xs px-2 py-0.5 rounded-lg font-bold transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
                          >X Olib tashlash</button>
                        </div>
                        {/* Dashed separator */}
                        <div className={`mx-4 border-t-2 border-dashed mb-3 ${isDark ? 'border-gray-700' : 'border-gray-300'}`} />
                        {/* Image */}
                        <div className="px-4 pb-4">
                          <img src={chequeImage} alt="Cheque" className="w-full rounded-xl object-contain max-h-48 shadow" />
                        </div>
                        {/* Bottom tear-off decoration */}
                        <div className="flex justify-between px-2 pb-1 relative top-1">
                          {Array.from({ length: 18 }).map((_, i) => (
                            <div key={i} className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-gray-800/10 shadow-inner' : 'bg-gray-200 shadow-inner'}`} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Upload / paste zone */
                      <div
                        onClick={() => chequeRef.current?.click()}
                        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) processImageFile(f); }}
                        onDragOver={e => e.preventDefault()}
                        className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all py-10 px-4 group ${
                          isDark
                            ? 'border-gray-600 hover:border-teal-500/60 bg-gray-800/50 hover:bg-teal-500/5'
                            : 'border-gray-300 hover:border-teal-400 bg-white hover:bg-teal-50/60 shadow-sm'
                        }`}
                      >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-transform group-hover:-translate-y-1 group-hover:scale-110 shadow-sm ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          🧾
                        </div>
                        <div className="text-center">
                          <p className={`text-base font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Karta chekini yuklang
                          </p>
                          <p className={`text-xs mt-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Nusxalangan rasmni <kbd className={`px-1.5 py-0.5 rounded border font-mono mx-1 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>Ctrl+V</kbd> orqali qo'shing
                          </p>
                          <p className={`text-[10px] mt-2 font-medium uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                            yoki bu yerga bosing
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {chequeError && <p className="mt-2 text-xs text-red-500 font-bold bg-red-500/10 px-3 py-1.5 rounded-lg w-fit">⚠ {chequeError}</p>}
                    
                    <input
                      ref={chequeRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) processImageFile(f); }}
                    />
                  </div>
                )}

            {/* Comment */}
            <div>
              <label className={labelClass}>
                {t('comment')}
                {type === TransactionType.EXPENSE && <span className="text-red-500 ml-1 text-lg leading-none align-middle">*</span>}
              </label>
              <textarea
                required={type === TransactionType.EXPENSE}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className={`${inputClass} min-h-[100px] resize-none shadow-inner`}
                placeholder={
                  type === TransactionType.EXPENSE ? t('commentPlaceholder') || 'Masalan: Benzin uchun, Mashina zarari, jarima...'
                  : t('commentPlaceholder') || 'Ixtiyoriy yozuv'
                }
              />
            </div>
          </div>

          {/* Actions (Sticky bottom of right panel) */}
          <div className={`mt-auto p-6 flex justify-end gap-3 border-t ${isDark ? 'bg-gray-800/80 border-gray-700 backdrop-blur-sm' : 'bg-gray-50/80 border-gray-200 backdrop-blur-sm'}`}>
            <button type="button" onClick={resetAndClose}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
              {t('cancel')}
            </button>
            <button type="submit"
              className={`px-8 py-3 text-white rounded-xl text-sm font-black shadow-xl transition-all transform active:scale-95 flex-1 md:flex-none ${
                type === TransactionType.INCOME ? 'bg-[#0f766e] hover:bg-teal-600 shadow-[#0f766e]/30'
                : 'bg-red-500 hover:bg-red-400 shadow-red-500/30'
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