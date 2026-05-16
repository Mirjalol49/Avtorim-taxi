import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Driver } from '../src/core/types/driver.types';
import { Car } from '../src/core/types/car.types';
import { LicensePlate } from '../src/components/ui/LicensePlate';

interface DriverFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDriverId: string;
    onSelect: (driverId: string) => void;
    drivers: Driver[];
    cars: Car[];
    theme: 'dark' | 'light';
    allLabel?: string;
    searchPlaceholder?: string;
}

const DriverFilterModal: React.FC<DriverFilterModalProps> = ({
    isOpen,
    onClose,
    selectedDriverId,
    onSelect,
    drivers,
    cars,
    theme,
    allLabel = 'Barcha Haydovchilar',
    searchPlaceholder = 'Qidirish...',
}) => {
    const [search, setSearch] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const isDark = theme === 'dark';

    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setTimeout(() => searchRef.current?.focus(), 80);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    const getDriverCar = (driverId: string) =>
        cars.find(c => c.assignedDriverId === driverId) ?? null;

    const filtered = drivers
        .filter(d => !d.isDeleted)
        .filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            const carA = getDriverCar(a.id);
            const carB = getDriverCar(b.id);
            
            // 1. Prioritize drivers with cars
            if (carA && !carB) return -1;
            if (!carA && carB) return 1;
            
            // 2. Prioritize ACTIVE drivers
            const isActiveA = a.status === 'ACTIVE';
            const isActiveB = b.status === 'ACTIVE';
            if (isActiveA && !isActiveB) return -1;
            if (!isActiveA && isActiveB) return 1;

            // 3. Alphabetical fallback
            return a.name.localeCompare(b.name);
        });

    const handleSelect = (id: string) => {
        onSelect(id);
        onClose();
    };

    if (!isOpen) return null;

    const modal = (
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className={`relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-[32px] shadow-2xl overflow-hidden ${
                    isDark ? 'bg-[#1a1f2c]/85 border border-white/10' : 'bg-[#eef0f3]/90'
                } backdrop-blur-2xl ring-1 ring-black/5`}
                onMouseDown={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="pt-7 pb-4 px-6 flex-shrink-0 flex flex-col items-center justify-center relative">
                    <h2 className={`text-[22px] font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Haydovchini tanlang
                    </h2>
                    <p className={`text-[13px] mt-1 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {drivers.filter(d => !d.isDeleted).length} ta faol haydovchi
                    </p>
                </div>

                {/* Search */}
                <div className="px-6 pb-4 flex-shrink-0">
                    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-[16px] border ${
                        isDark ? 'bg-black/20 border-white/[0.06] focus-within:border-teal-500/50' : 'bg-black/[0.03] border-transparent focus-within:border-teal-500/50 focus-within:bg-white'
                    } transition-colors`}>
                        <svg className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={searchRef}
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            className={`flex-1 bg-transparent text-[15px] outline-none font-medium ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className={`text-xs ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>✕</button>
                        )}
                    </div>
                </div>

                {/* Grid */}
                <div className="overflow-y-auto flex-1 p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

                        {/* All Drivers card */}
                        {!search && (
                            <button
                                onClick={() => handleSelect('all')}
                                className={`relative flex flex-col items-center gap-3 pt-8 pb-6 px-4 rounded-[24px] transition-all text-left border-2 ${
                                    selectedDriverId === 'all'
                                        ? isDark
                                            ? 'border-teal-500/50 bg-teal-500/10'
                                            : 'border-teal-500/50 bg-teal-50'
                                        : isDark
                                            ? 'border-transparent bg-surface-2/40 hover:bg-white/[0.04]'
                                            : 'border-transparent bg-white shadow-sm hover:shadow-md'
                                }`}
                            >
                                {selectedDriverId === 'all' && (
                                    <span className="absolute top-3 right-3 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center shadow-sm">
                                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </span>
                                )}
                                <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center flex-shrink-0 ${
                                    selectedDriverId === 'all'
                                        ? isDark ? 'text-teal-400 bg-teal-500/10' : 'text-slate-600 bg-slate-50'
                                        : isDark ? 'text-gray-400 bg-surface-2' : 'text-slate-500 bg-slate-50'
                                }`}>
                                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                </div>
                                <div className="w-full text-center mt-2">
                                    <div className={`text-[15px] font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {allLabel}
                                    </div>
                                    <div className={`text-[12px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                        Hammasi
                                    </div>
                                </div>
                            </button>
                        )}

                        {/* Driver cards */}
                        {filtered.map(driver => {
                            const car = getDriverCar(driver.id);
                            const isSelected = selectedDriverId === driver.id;
                            return (
                                <button
                                    key={driver.id}
                                    onClick={() => handleSelect(driver.id)}
                                    className={`relative flex flex-col items-center pt-5 pb-4 px-3 rounded-[24px] transition-all text-left border-2 ${
                                    selectedDriverId === driver.id
                                        ? isDark
                                            ? 'border-teal-500/50 bg-teal-500/10'
                                            : 'border-teal-500/50 bg-teal-50'
                                        : isDark
                                            ? 'border-transparent bg-surface-2/40 hover:bg-white/[0.04]'
                                            : 'border-transparent bg-white shadow-sm hover:shadow-md'
                                }`}>
                                    {/* Checkmark */}
                                    {isSelected && (
                                        <span className="absolute top-3 right-3 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center shadow-sm">
                                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </span>
                                    )}

                                    {/* Driver avatar */}
                                    <div className="relative flex-shrink-0">
                                        <div className={`w-[72px] h-[72px] rounded-full overflow-hidden ${
                                            isDark ? 'bg-surface-2' : 'bg-slate-100'
                                        }`}>
                                            {driver.avatar ? (
                                                <img src={driver.avatar} alt={driver.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center text-xl font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    {driver.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        {/* Car mini badge */}
                                        {car?.avatar && (
                                            <div className="absolute -bottom-3 -right-6 w-[48px] drop-shadow-md">
                                                <img src={car.avatar} alt={car.name} className="w-full h-auto object-contain rounded-[10px]" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="w-full text-center mt-2">
                                        <div className={`text-[15px] font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {driver.name}
                                        </div>
                                        {car ? (
                                            <>
                                                <div className={`text-[12px] truncate mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {car.name}
                                                </div>
                                                <div className="flex justify-center mt-3">
                                                    <LicensePlate plate={car.licensePlate} size="sm" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className={`text-[12px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                Mashina yo'q
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}

                        {filtered.length === 0 && search && (
                            <div className={`col-span-3 py-12 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                Haydovchi topilmadi
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};

export default DriverFilterModal;
