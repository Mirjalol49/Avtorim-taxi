import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Driver } from '../src/core/types/driver.types';
import { Car } from '../src/core/types/car.types';

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

    const filtered = drivers
        .filter(d => !d.isDeleted)
        .filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

    const getDriverCar = (driverId: string) =>
        cars.find(c => c.assignedDriverId === driverId) ?? null;

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
                className={`relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden ${
                    isDark ? 'bg-[#0D0E12] border-white/[0.08]' : 'bg-white border-gray-200'
                }`}
                onMouseDown={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-5 border-b flex-shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <div>
                        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Haydovchini tanlang
                        </h2>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {drivers.filter(d => !d.isDeleted).length} ta haydovchi
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                            isDark ? 'text-gray-400 hover:bg-white/[0.06] hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search */}
                <div className={`px-6 py-4 border-b flex-shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
                        isDark ? 'bg-[#1C1D23]/60 border-white/[0.08] focus-within:border-teal-500' : 'bg-gray-50 border-gray-200 focus-within:border-teal-500'
                    } transition-colors`}>
                        <svg className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={searchRef}
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            className={`flex-1 bg-transparent text-sm outline-none ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
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
                                className={`relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                                    selectedDriverId === 'all'
                                        ? isDark
                                            ? 'border-teal-500 bg-teal-500/10 shadow-sm'
                                            : 'border-teal-500 bg-teal-50 shadow-sm'
                                        : isDark
                                            ? 'border-white/[0.06] bg-[#1C1D23]/40 hover:border-white/[0.08] hover:bg-white/[0.04]'
                                            : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {selectedDriverId === 'all' && (
                                    <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </span>
                                )}
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
                                    isDark ? 'bg-[#1C1D23]' : 'bg-gray-200'
                                }`}>
                                    👥
                                </div>
                                <div className="w-full text-center">
                                    <div className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {allLabel}
                                    </div>
                                    <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
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
                                    className={`relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                                        isSelected
                                            ? isDark
                                                ? 'border-teal-500 bg-teal-500/10 shadow-sm'
                                                : 'border-teal-500 bg-teal-50 shadow-sm'
                                            : isDark
                                                ? 'border-white/[0.06] bg-[#1C1D23]/40 hover:border-white/[0.08] hover:bg-white/[0.04]'
                                                : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {/* Checkmark */}
                                    {isSelected && (
                                        <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </span>
                                    )}

                                    {/* Driver avatar */}
                                    <div className="relative flex-shrink-0">
                                        <div className={`w-14 h-14 rounded-2xl overflow-hidden border-2 ${
                                            isSelected
                                                ? 'border-teal-400'
                                                : isDark ? 'border-white/[0.08]' : 'border-gray-200'
                                        }`}>
                                            {driver.avatar ? (
                                                <img src={driver.avatar} alt={driver.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center text-xl font-bold ${isDark ? 'bg-[#1C1D23] text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                                    {driver.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        {/* Car mini badge */}
                                        {car?.avatar && (
                                            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg overflow-hidden border-2 border-current shadow-md"
                                                style={{ borderColor: isDark ? '#374151' : '#fff' }}>
                                                <img src={car.avatar} alt={car.name} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="w-full text-center">
                                        <div className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {driver.name}
                                        </div>
                                        {car ? (
                                            <>
                                                <div className={`text-xs truncate mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {car.name}
                                                </div>
                                                <div className={`inline-block mt-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg ${
                                                    isDark ? 'bg-[#1C1D23] text-gray-300' : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                    {car.licensePlate}
                                                </div>
                                            </>
                                        ) : (
                                            <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
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
