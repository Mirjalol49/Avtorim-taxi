import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Fine } from '../../../core/types/fines.types';
import { Driver, Car } from '../../../../types';
import { useUIContext } from '../../shared/context/UIContext';
import DatePicker from '../../../../components/DatePicker';
import { ChevronDownIcon, SearchIcon, CheckIcon, CarIcon, XIcon, AlertTriangleIcon } from '../../../../components/Icons';
import { LicensePlate } from '../../../components/ui/LicensePlate';
import { getDriverForCarOnDate } from '../../../../services/carsService';

interface FineModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<Fine, 'id' | 'createdMs' | 'updatedMs'> & { id?: string }) => Promise<void>;
    editingFine: Fine | null;
    drivers: Driver[];
    cars: Car[];
}

const FineModal: React.FC<FineModalProps> = ({ isOpen, onClose, onSubmit, editingFine, drivers, cars }) => {
    const { t, theme } = useUIContext();
    const isDark = theme === 'dark';

    const [driverId, setDriverId] = useState('');
    const [carId, setCarId] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [fineDate, setFineDate] = useState<Date>(new Date());
    const [status, setStatus] = useState<'UNPAID' | 'PAID'>('UNPAID');
    const [isLoading, setIsLoading] = useState(false);

    const [isDriverOpen, setIsDriverOpen] = useState(false);
    const [driverSearch, setDriverSearch] = useState('');
    const [isCarOpen, setIsCarOpen] = useState(false);
    const [carSearch, setCarSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (editingFine) {
                setDriverId(editingFine.driverId);
                setCarId(editingFine.carId || '');
                setAmount(editingFine.amount.toString());
                setDescription(editingFine.description || '');
                setFineDate(new Date(editingFine.fineDate));
                setStatus(editingFine.status);
            } else {
                setDriverId('');
                setCarId('');
                setAmount('');
                setDescription('');
                setFineDate(new Date());
                setStatus('UNPAID');
            }
        }
    }, [isOpen, editingFine]);

    const [isAutoDetecting, setIsAutoDetecting] = useState(false);
    useEffect(() => {
        let active = true;
        const autoDetect = async () => {
            if (isOpen && !editingFine && carId && fineDate) {
                setIsAutoDetecting(true);
                const assignedDriver = await getDriverForCarOnDate(carId, fineDate.getTime());
                if (active) {
                    if (assignedDriver) {
                        setDriverId(assignedDriver);
                    }
                    setIsAutoDetecting(false);
                }
            }
        };
        autoDetect();
        return () => { active = false; };
    }, [carId, fineDate, isOpen, editingFine]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!driverId || !amount) return;

        setIsLoading(true);
        try {
            await onSubmit({
                id: editingFine?.id,
                fleetId: editingFine?.fleetId || '', // will be set properly in page component or service if needed
                driverId,
                carId: carId || null,
                amount: parseInt(amount.replace(/\D/g, ''), 10) || 0,
                fineDate: fineDate.getTime(),
                status,
                description,
            });
            onClose();
        } catch (error) {
            console.error('Failed to save fine', error);
        } finally {
            setIsLoading(false);
        }
    };

    const selectedDriver = drivers.find(d => d.id === driverId) || null;
    const selectedCar = cars.find(c => c.id === carId) || null;

    const filteredDrivers = drivers.filter(d =>
        d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
        (d.carModel || '').toLowerCase().includes(driverSearch.toLowerCase()) ||
        (d.licensePlate || '').toLowerCase().includes(driverSearch.toLowerCase())
    );

    const filteredCars = cars.filter(c =>
        c.name.toLowerCase().includes(carSearch.toLowerCase()) ||
        c.licensePlate.toLowerCase().includes(carSearch.toLowerCase())
    );

    if (!isOpen) return null;

    const inputClass = `w-full px-4 py-3 rounded-xl outline-none transition-all border ${isDark
        ? 'bg-surface-2 border-white/[0.08] text-white focus:border-[#0f766e] placeholder-gray-500'
        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#0f766e] placeholder-gray-400'}`;
    const labelClass = `block text-[11px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <form
                onSubmit={handleSubmit}
                className={`flex flex-col md:flex-row w-full max-w-[1000px] max-h-[92vh] rounded-[2rem] shadow-2xl overflow-hidden border ${isDark ? 'border-white/[0.06]' : 'bg-white border-gray-200'}`}
                style={{ animation: 'modalPop 0.2s ease-out', ...(isDark ? { background: '#171f33' } : {}) }}
            >
                {/* ══ LEFT PANEL ══════════════════════════════════════════════════════ */}
                <div
                    className={`flex flex-col w-full md:w-[480px] flex-shrink-0 overflow-y-auto border-b md:border-b-0 md:border-r ${isDark ? 'border-white/[0.06]' : 'border-gray-100 bg-white'}`}
                    style={isDark ? { background: '#171f33' } : undefined}
                >
                    {/* Header */}
                    <div
                        className={`sticky top-0 z-10 px-7 py-5 border-b flex items-center justify-between ${isDark ? 'border-white/[0.06] backdrop-blur-md' : 'border-gray-100 bg-white/95 backdrop-blur-md'}`}
                        style={isDark ? { background: '#171f33' } : undefined}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`}>
                                🚨
                            </div>
                            <div>
                                <h3 className={`font-bold text-base leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {editingFine ? "Jarima tahrirlash" : "Yangi jarima"}
                                </h3>
                                <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Yo'l harakati qoidalari buzilishi
                                </p>
                            </div>
                        </div>
                        <button type="button" onClick={onClose} className={`md:hidden p-2 rounded-xl transition-colors ${isDark ? 'text-gray-500 hover:text-white hover:bg-white/[0.04]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-7 space-y-6">
                        {/* Status Toggle */}
                        <div className={`flex gap-1 p-1 rounded-2xl border overflow-x-auto ${isDark ? 'bg-surface-3 border-white/[0.08]' : 'bg-surface-2 border-gray-200'}`}>
                            {[
                                { v: 'UNPAID', label: 'To\'lanmagan', emoji: '🔴' },
                                { v: 'PAID', label: 'To\'langan', emoji: '🟢' },
                            ].map(item => (
                                <button key={item.v} type="button"
                                    onClick={() => setStatus(item.v as 'UNPAID' | 'PAID')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                                        status === item.v
                                            ? item.v === 'UNPAID' ? 'bg-rose-500 text-white shadow-sm' : 'bg-[#0f766e] text-white shadow-sm'
                                            : isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]' : 'text-gray-400 hover:text-gray-700 hover:bg-black/[0.02]'
                                    }`}
                                >
                                    <span className="text-sm hidden sm:inline">{item.emoji}</span>
                                    <span className="truncate">{item.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Driver Selector */}
                        <div className="relative">
                            <label className={labelClass}>
                                Haydovchi
                                {isAutoDetecting && <span className="ml-2 lowercase text-teal-500 normal-case font-medium">(Avto-qidirilmoqda...)</span>}
                            </label>
                            {!isDriverOpen && selectedDriver ? (
                                <div onClick={() => setIsDriverOpen(true)}
                                    className={`cursor-pointer p-4 rounded-2xl border transition-all group active:scale-[0.99] ${isDark ? 'bg-surface-2/60 border-white/[0.08] hover:border-white/[0.12]' : 'bg-gray-50 border-gray-200 hover:border-gray-300 shadow-sm'}`}>
                                    <div className="flex items-center gap-4">
                                        {selectedDriver.avatar
                                            ? <img src={selectedDriver.avatar} alt={selectedDriver.name} className={`w-11 h-11 rounded-xl object-cover border-2 ${isDark ? 'border-gray-600' : 'border-white shadow'}`} />
                                            : <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base ${isDark ? 'bg-surface-2 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{selectedDriver.name.charAt(0)}</div>
                                        }
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedDriver.name}</p>
                                            <div className={`text-xs mt-1.5 flex items-center gap-2 truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                <span className="truncate">{selectedDriver.carModel || '—'}</span>
                                                {selectedDriver.licensePlate && <LicensePlate plate={selectedDriver.licensePlate} size="sm" />}
                                            </div>
                                        </div>
                                        <ChevronDownIcon className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                    </div>
                                </div>
                            ) : !isDriverOpen && !selectedDriver ? (
                                <div onClick={() => setIsDriverOpen(true)}
                                    className={`cursor-pointer p-4 rounded-2xl border transition-all group flex items-center justify-between ${isDark ? 'bg-surface-2/60 border-white/[0.08] hover:border-white/[0.12]' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'}`}>
                                    <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Haydovchini tanlang</span>
                                    <ChevronDownIcon className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                </div>
                            ) : (
                                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-surface-2 border-white/[0.08] shadow-xl' : 'bg-white border-gray-200 shadow-lg'}`}>
                                    <div className={`p-3 border-b ${isDark ? 'border-white/[0.08] bg-surface-3' : 'border-gray-100 bg-gray-50'}`}>
                                        <div className="relative">
                                            <SearchIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                            <input type="text" value={driverSearch} onChange={e => setDriverSearch(e.target.value)}
                                                placeholder="Qidirish..." autoFocus
                                                className={`w-full pl-9 pr-4 py-2.5 rounded-xl outline-none text-sm ${isDark ? 'bg-surface-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#0f766e]/40' : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-200 focus:border-[#0f766e]'}`} />
                                        </div>
                                    </div>
                                    <div className="max-h-[220px] overflow-y-auto divide-y divide-white/[0.05]">
                                        {filteredDrivers.map(d => (
                                            <div key={d.id} onClick={() => { setDriverId(d.id); setIsDriverOpen(false); setDriverSearch(''); }}
                                                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${driverId === d.id ? isDark ? 'bg-[#0f766e]/15' : 'bg-teal-50' : isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.03]'}`}>
                                                {d.avatar
                                                    ? <img src={d.avatar} alt={d.name} className="w-9 h-9 rounded-lg object-cover" />
                                                    : <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${isDark ? 'bg-surface-2 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{d.name.charAt(0)}</div>
                                                }
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-bold truncate ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{d.name}</p>
                                                    <div className={`text-[11px] mt-1 flex items-center gap-2 truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                        <span className="truncate">{d.carModel || '—'}</span>
                                                        {d.licensePlate && <LicensePlate plate={d.licensePlate} size="sm" />}
                                                    </div>
                                                </div>
                                                {driverId === d.id && <CheckIcon className="w-4 h-4 text-[#0f766e] flex-shrink-0" />}
                                            </div>
                                        ))}
                                        {filteredDrivers.length === 0 && <p className="p-5 text-center text-sm text-gray-500">Topilmadi</p>}
                                    </div>
                                    {selectedDriver && (
                                        <div onClick={() => setIsDriverOpen(false)}
                                            className={`p-3 text-center border-t cursor-pointer text-xs font-medium transition-colors ${isDark ? 'border-white/[0.08] text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]' : 'border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-black/[0.03]'}`}>
                                            Yopish
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Car Selector */}
                        <div className="relative">
                            <label className={labelClass}>Avtomobil</label>
                            {!isCarOpen && selectedCar ? (
                                <div onClick={() => setIsCarOpen(true)}
                                    className={`cursor-pointer p-4 rounded-2xl border transition-all group active:scale-[0.99] ${isDark ? 'bg-surface-2/60 border-white/[0.08] hover:border-white/[0.12]' : 'bg-gray-50 border-gray-200 hover:border-gray-300 shadow-sm'}`}>
                                    <div className="flex items-center gap-4">
                                        {selectedCar.avatar
                                            ? <img src={selectedCar.avatar} alt={selectedCar.name} className="w-11 h-11 rounded-xl object-cover" />
                                            : <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isDark ? 'bg-surface-2' : 'bg-gray-200'}`}><CarIcon className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} /></div>
                                        }
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedCar.name}</p>
                                            <div className="mt-1">
                                                <LicensePlate plate={selectedCar.licensePlate} size="sm" />
                                            </div>
                                        </div>
                                        <ChevronDownIcon className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                    </div>
                                </div>
                            ) : !isCarOpen && !selectedCar ? (
                                <div onClick={() => setIsCarOpen(true)}
                                    className={`cursor-pointer p-4 rounded-2xl border transition-all group flex items-center justify-between ${isDark ? 'bg-surface-2/60 border-white/[0.08] hover:border-white/[0.12]' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'}`}>
                                    <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Avtomobil tanlanmagan</span>
                                    <ChevronDownIcon className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                </div>
                            ) : (
                                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-surface-2 border-white/[0.08] shadow-xl' : 'bg-white border-gray-200 shadow-lg'}`}>
                                    <div className={`p-3 border-b ${isDark ? 'border-white/[0.08] bg-surface-3' : 'border-gray-100 bg-gray-50'}`}>
                                        <div className="relative">
                                            <SearchIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                            <input type="text" value={carSearch} onChange={e => setCarSearch(e.target.value)}
                                                placeholder="Mashinani qidirish..." autoFocus
                                                className={`w-full pl-9 pr-4 py-2.5 rounded-xl outline-none text-sm ${isDark ? 'bg-surface-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#0f766e]/40' : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-200 focus:border-[#0f766e]'}`} />
                                        </div>
                                    </div>
                                    <div className="max-h-[220px] overflow-y-auto divide-y divide-white/[0.05]">
                                        <div onClick={() => { setCarId(''); setIsCarOpen(false); setCarSearch(''); }}
                                            className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${!carId ? isDark ? 'bg-[#0f766e]/15' : 'bg-teal-50' : isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.03]'}`}>
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`}><CarIcon className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} /></div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-bold truncate ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Avtomobil tanlanmagan</p>
                                            </div>
                                            {!carId && <CheckIcon className="w-4 h-4 text-[#0f766e] flex-shrink-0" />}
                                        </div>
                                        {filteredCars.map(c => (
                                            <div key={c.id} onClick={() => { setCarId(c.id); setIsCarOpen(false); setCarSearch(''); }}
                                                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${carId === c.id ? isDark ? 'bg-[#0f766e]/15' : 'bg-teal-50' : isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.03]'}`}>
                                                {c.avatar ? <img src={c.avatar} alt={c.name} className="w-9 h-9 rounded-lg object-cover" /> : <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`}><CarIcon className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} /></div>}
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-bold truncate ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{c.name}</p>
                                                    <div className="mt-1">
                                                        <LicensePlate plate={c.licensePlate} size="sm" />
                                                    </div>
                                                </div>
                                                {carId === c.id && <CheckIcon className="w-4 h-4 text-[#0f766e] flex-shrink-0" />}
                                            </div>
                                        ))}
                                    </div>
                                    {selectedCar && (
                                        <div onClick={() => setIsCarOpen(false)}
                                            className={`p-3 text-center border-t cursor-pointer text-xs font-medium transition-colors ${isDark ? 'border-white/[0.08] text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]' : 'border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-black/[0.03]'}`}>
                                            Yopish
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ══ RIGHT PANEL ══════════════════════════════════════════════════════ */}
                <div className={`flex flex-col flex-1 overflow-y-auto ${isDark ? 'bg-surface-2/30' : 'bg-surface-2/50'}`}>
                    {/* Desktop close */}
                    <div className="flex justify-end px-6 py-5 flex-shrink-0">
                        <button type="button" onClick={onClose}
                            className={`hidden md:flex items-center justify-center w-8 h-8 rounded-xl transition-colors ${isDark ? 'text-gray-500 hover:text-white hover:bg-white/[0.04]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="px-7 pb-7 space-y-6 flex-1 -mt-2">
                        {/* Amount */}
                        <div>
                            <label className={labelClass}>Summa (UZS)</label>
                            <div className="relative">
                                <input type="text" required inputMode="numeric"
                                    value={amount}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setAmount(val ? new Intl.NumberFormat('uz-UZ').format(parseInt(val)) : '');
                                    }}
                                    className={`${inputClass} font-mono text-4xl font-black tracking-tight h-[72px] pr-16 shadow-inner`}
                                    placeholder="0"
                                />
                                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>UZS</span>
                            </div>
                        </div>

                        {/* Date */}
                        <DatePicker label="Vaqt" value={fineDate} onChange={(d) => d && setFineDate(d)} theme={theme} />

                        {/* Description */}
                        <div>
                            <label className={labelClass}>Tavsif / Sabab</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className={`${inputClass} min-h-[110px] resize-none shadow-inner`}
                                placeholder="Masalan: Qizil chiroq, tezlikni oshirish..."
                            />
                        </div>
                    </div>

                    {/* Action footer */}
                    <div className={`mt-auto px-7 py-5 flex justify-end gap-3 border-t ${isDark ? 'bg-transparent border-white/[0.06]' : 'bg-gray-50 border-gray-100'}`}>
                        <button type="button" onClick={onClose}
                            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${isDark ? 'bg-surface-2 text-gray-300 hover:bg-white/[0.06] border border-white/[0.08]' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm'}`}>
                            Bekor qilish
                        </button>
                        <button type="submit" disabled={isLoading || !driverId || !amount}
                            className={`px-10 py-3 text-white rounded-xl text-sm font-black shadow-sm transition-all transform active:scale-95 disabled:opacity-50 ${
                                status === 'PAID' ? 'bg-[#0f766e] hover:bg-[#0d9488]' : 'bg-rose-500 hover:bg-rose-600'
                            }`}>
                            {isLoading ? 'Saqlanmoqda...' : 'Saqlash'}
                        </button>
                    </div>
                </div>
            </form>
        </div>,
        document.body
    );
};

export default FineModal;
