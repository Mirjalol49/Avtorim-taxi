import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Car } from '../../core/types/car.types';
import CarDamageDetail from './CarDamageDetail';
import { LicensePlate } from '../../components/ui/LicensePlate';

interface Props {
    cars: Car[];
    isDataLoading: boolean;
    userRole: 'admin' | 'viewer';
    adminName: string;
    theme: 'light' | 'dark';
}

type Filter = 'all' | 'damaged' | 'clean';

export default function DamagesPage({ cars, isDataLoading, userRole, adminName, theme }: Props) {
    const { t } = useTranslation();
    const isDark = theme === 'dark';
    const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>('all');
    const [search, setSearch] = useState('');

    const active = cars.filter(c => !c.isDeleted);
    const filtered = active.filter(c => {
        const hasDamage = (c.damage ?? []).length > 0;
        if (filter === 'damaged' && !hasDamage) return false;
        if (filter === 'clean' && hasDamage) return false;
        const q = search.toLowerCase();
        if (q && !c.name.toLowerCase().includes(q) && !c.licensePlate.toLowerCase().includes(q)) return false;
        return true;
    });

    const selectedCar = active.find(c => c.id === selectedCarId) ?? null;

    if (selectedCar) {
        return (
            <CarDamageDetail
                car={selectedCar}
                allCars={active}
                userRole={userRole}
                adminName={adminName}
                theme={theme}
                onBack={() => setSelectedCarId(null)}
                onCarChange={setSelectedCarId}
            />
        );
    }

    const sevColor = (car: Car) => {
        const d = car.damage ?? [];
        if (!d.length) return isDark ? 'bg-white/10 text-white/30' : 'bg-black/10 text-black/30';
        if (d.some(x => x.severity === 'severe'))   return 'bg-red-500 text-white';
        if (d.some(x => x.severity === 'moderate')) return 'bg-orange-400 text-white';
        return 'bg-yellow-400 text-black';
    };

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                    <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        💥 {t('damagesTitle', 'Shikastlar')}
                    </h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                        {active.length} {t('carsCountPlural', 'ta avtomobil')} · {active.filter(c => (c.damage ?? []).length > 0).length} {t('damagedCountPlural', 'ta shikastli')}
                    </p>
                </div>

                {/* Search + filter row */}
                <div className="flex gap-2 flex-1 sm:max-w-xl">
                    <div className="relative flex-1">
                        <svg className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/25' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
                        </svg>
                        <input
                            type="text" placeholder={t('searchNameOrPlate', 'Nom yoki raqam…')} value={search}
                            onChange={e => setSearch(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-[13px] outline-none transition-all ${isDark ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/25 focus:border-teal-500/40' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-400'}`}
                        />
                    </div>
                    <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                        {(['all', 'damaged', 'clean'] as Filter[]).map((f, i) => {
                            const labels = [t('filterAll', 'Hammasi'), t('filterDamaged', 'Shikastli'), t('filterClean', "Sog'lom")];
                            return (
                                <button key={f} onClick={() => setFilter(f)}
                                    className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${filter === f
                                        ? isDark ? 'bg-white/[0.12] text-white' : 'bg-white text-gray-900 shadow-sm'
                                        : isDark ? 'text-white/35 hover:text-white/60' : 'text-gray-500 hover:text-gray-700'
                                    }`}>
                                    {labels[i]}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Grid ── */}
            {isDataLoading ? (
                <div className="flex justify-center py-32">
                    <div className="w-10 h-10 rounded-full border-4 border-t-transparent border-teal-500 animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className={`rounded-2xl border p-20 text-center ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-gray-200'}`}>
                    <div className="text-5xl mb-4">🚗</div>
                    <p className={`text-base font-medium ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{t('carNotFound', 'Avtomobil topilmadi')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(car => {
                        const dmgCount = (car.damage ?? []).length;
                        const hasSevere = (car.damage ?? []).some(d => d.severity === 'severe');
                        return (
                            <button
                                key={car.id}
                                onClick={() => setSelectedCarId(car.id)}
                                className={`rounded-2xl border overflow-hidden text-left transition-all duration-200 active:scale-[0.97] group
                                    ${isDark
                                        ? 'bg-[#161c26] border-white/[0.07] hover:border-white/20 hover:shadow-xl hover:shadow-black/30'
                                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-200/80'
                                    }`}
                            >
                                {/* Photo */}
                                <div className={`relative overflow-hidden ${isDark ? 'bg-[#0a1020]' : 'bg-gray-100'}`} style={{ height: '160px' }}>
                                    {car.avatar
                                        ? <img src={car.avatar} alt={car.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="text-6xl opacity-10">🚗</span>
                                            </div>
                                        )
                                    }
                                    {/* gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                    {/* damage badge */}
                                    <span className={`absolute top-3 right-3 min-w-[24px] h-6 px-2 rounded-full text-[11px] font-black flex items-center justify-center shadow-lg ${sevColor(car)}`}>
                                        {dmgCount}
                                    </span>

                                    {/* plate over gradient */}
                                    <div className="absolute bottom-0 left-0 right-0 px-3.5 pb-3.5">
                                        <LicensePlate plate={car.licensePlate} size="sm" />
                                    </div>

                                    {/* severe pulse */}
                                    {hasSevere && (
                                        <span className="absolute top-3 left-3 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="px-3.5 py-3">
                                    <p className={`font-bold text-[14px] truncate ${isDark ? 'text-white/90' : 'text-gray-900'}`}>{car.name}</p>
                                    <p className={`text-[12px] mt-0.5 font-medium ${dmgCount ? 'text-red-400' : isDark ? 'text-white/25' : 'text-gray-400'}`}>
                                        {dmgCount ? `${dmgCount} ${t('damageCountPlural', 'ta shikast')}` : t('noDamage', "Shikast yo'q")}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
