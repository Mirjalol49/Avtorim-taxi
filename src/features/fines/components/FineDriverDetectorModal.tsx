import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Driver, Car } from '../../../../types';
import { useUIContext } from '../../shared/context/UIContext';
import DatePicker from '../../../../components/DatePicker';
import { ChevronDownIcon, SearchIcon, CheckIcon, CarIcon, XIcon, PhoneIcon } from '../../../../components/Icons';
import { LicensePlate } from '../../../components/ui/LicensePlate';
import { getDriverForCarOnDate } from '../../../../services/carsService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    drivers: Driver[];
    cars: Car[];
}

const FineDriverDetectorModal: React.FC<Props> = ({ isOpen, onClose, drivers, cars }) => {
    const { t, theme } = useUIContext();
    const isDark = theme === 'dark';

    const [carId, setCarId] = useState('');
    const [date, setDate] = useState<Date>(new Date());
    
    const [isCarOpen, setIsCarOpen] = useState(false);
    const [carSearch, setCarSearch] = useState('');

    const [detectedDriverId, setDetectedDriverId] = useState<string | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setCarId('');
            setDate(new Date());
            setDetectedDriverId(null);
            setIsCarOpen(false);
        }
    }, [isOpen]);

    useEffect(() => {
        let active = true;
        const detect = async () => {
            if (isOpen && carId && date) {
                setIsDetecting(true);
                const driverId = await getDriverForCarOnDate(carId, date.getTime());
                if (active) {
                    setDetectedDriverId(driverId);
                    setIsDetecting(false);
                }
            } else {
                setDetectedDriverId(null);
            }
        };
        detect();
        return () => { active = false; };
    }, [carId, date, isOpen]);

    const selectedCar = cars.find(c => c.id === carId) || null;
    const detectedDriver = drivers.find(d => d.id === detectedDriverId) || null;

    const filteredCars = cars.filter(c =>
        c.name.toLowerCase().includes(carSearch.toLowerCase()) ||
        c.licensePlate.toLowerCase().includes(carSearch.toLowerCase())
    );

    if (!isOpen) return null;

    const labelClass = `block text-[11px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div
                className={`w-full max-w-[480px] rounded-[2rem] shadow-2xl overflow-hidden border ${isDark ? 'border-white/[0.06]' : 'bg-white border-gray-200'}`}
                style={{ animation: 'modalPop 0.2s ease-out', ...(isDark ? { background: '#171f33' } : {}) }}
            >
                <div className={`px-7 py-5 border-b flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`}>
                            🔍
                        </div>
                        <div>
                            <h3 className={`font-bold text-base leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Haydovchini aniqlash
                            </h3>
                            <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                Jarima sanasi bo'yicha qidiruv
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDark ? 'text-gray-500 hover:text-white hover:bg-white/[0.04]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-7 space-y-6">
                    {/* Date */}
                    <div>
                        <DatePicker label="Jarima sanasi" value={date} onChange={(d) => d && setDate(d)} theme={theme} />
                    </div>

                    {/* Car Selector */}
                    <div className="relative z-10">
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
                                <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Avtomobilni tanlang</span>
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
                            </div>
                        )}
                    </div>

                    {/* Result */}
                    <div className="mt-6 border-t pt-6" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                        <label className={labelClass}>Natija</label>
                        {isDetecting ? (
                            <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-3 py-8 ${isDark ? 'bg-surface-2/30 border-white/[0.04]' : 'bg-gray-50/50 border-gray-100'}`}>
                                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Qidirilmoqda...</span>
                            </div>
                        ) : !carId ? (
                            <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 py-8 text-center ${isDark ? 'bg-surface-2/30 border-white/[0.04]' : 'bg-gray-50/50 border-gray-100'}`}>
                                <span className="text-2xl opacity-50">📅</span>
                                <span className={`text-sm font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Avtomobilni tanlang</span>
                            </div>
                        ) : detectedDriver ? (
                            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0f766e]/10 border-[#0f766e]/30' : 'bg-teal-50 border-teal-200'}`}>
                                <div className="flex items-center gap-4">
                                    {detectedDriver.avatar
                                        ? <img src={detectedDriver.avatar} alt={detectedDriver.name} className={`w-12 h-12 rounded-xl object-cover border-2 ${isDark ? 'border-[#0f766e]/30' : 'border-teal-200 shadow-sm'}`} />
                                        : <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${isDark ? 'bg-[#0f766e]/20 text-teal-400' : 'bg-teal-100 text-teal-700'}`}>{detectedDriver.name.charAt(0)}</div>
                                    }
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-black text-lg truncate ${isDark ? 'text-teal-400' : 'text-teal-800'}`}>{detectedDriver.name}</p>
                                        <p className={`text-[11px] font-bold tracking-wider uppercase mt-0.5 ${isDark ? 'text-teal-500/70' : 'text-teal-600/70'}`}>Topildi</p>
                                    </div>
                                </div>
                                
                                {detectedDriver.phone && (
                                    <div className="mt-4 flex gap-2">
                                        <a href={`tel:${detectedDriver.phone}`} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 ${isDark ? 'bg-[#0f766e] text-white hover:bg-[#0d9488]' : 'bg-[#0f766e] text-white hover:bg-[#0d9488]'}`}>
                                            <PhoneIcon className="w-4 h-4" />
                                            {detectedDriver.phone}
                                        </a>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 py-8 text-center ${isDark ? 'bg-surface-2/30 border-white/[0.04]' : 'bg-gray-50/50 border-gray-100'}`}>
                                <span className="text-2xl opacity-50">🤷‍♂️</span>
                                <span className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Haydovchi topilmadi</span>
                                <p className={`text-[11px] max-w-[200px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Ushbu sanada bu avtomobilga haydovchi biriktirilmagan.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FineDriverDetectorModal;
