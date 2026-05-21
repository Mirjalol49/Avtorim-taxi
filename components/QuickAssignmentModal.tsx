import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CarIcon, SearchIcon, XIcon, CheckIcon, UserIcon } from './Icons';
import { Driver } from '../src/core/types/driver.types';
import { Car } from '../src/core/types/car.types';
import { LicensePlate } from '../src/components/ui/LicensePlate';
import { DriverAvatar } from '../src/features/drivers/components/DriverAvatar';

type Mode = 'driver' | 'car';

interface QuickAssignmentModalProps {
    isOpen: boolean;
    mode: Mode;
    driver?: Driver | null;
    car?: Car | null;
    drivers: Driver[];
    cars: Car[];
    theme: 'light' | 'dark';
    onClose: () => void;
    onSave: (payload: { driverId: string; carId: string | null; effectiveFrom?: number; replaceExisting?: boolean }) => Promise<void>;
}

const norm = (value?: string | null) => (value || '').toLowerCase().replace(/\s+/g, ' ').trim();

const QuickAssignmentModal: React.FC<QuickAssignmentModalProps> = ({
    isOpen,
    mode,
    driver,
    car,
    drivers,
    cars,
    theme,
    onClose,
    onSave,
}) => {
    const { t } = useTranslation();
    const isDark = theme === 'dark';
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(mode === 'driver' ? (car?.id ?? null) : (driver?.id ?? null));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        if (!isOpen) return;
        setQuery('');
        setError(null);
        setSelectedId(mode === 'driver' ? (car?.id ?? null) : (driver?.id ?? null));
    }, [isOpen, mode, car?.id, driver?.id]);

    const title = mode === 'driver'
        ? t('quickAssignCarTitle', 'Avtomobil biriktirish')
        : t('quickAssignDriverTitle', 'Haydovchi biriktirish');
    const subtitle = mode === 'driver'
        ? driver?.name
        : car ? `${car.name} • ${car.licensePlate}` : '';

    const activeDrivers = useMemo(() => drivers.filter(d => !d.isDeleted), [drivers]);
    const activeCars = useMemo(() => cars.filter(c => !c.isDeleted), [cars]);

    const rows = useMemo<any[]>(() => {
        const q = norm(query);
        if (mode === 'driver') {
            return activeCars
                .map(item => {
                    const owner = item.assignedDriverId ? activeDrivers.find(d => d.id === item.assignedDriverId) : null;
                    const occupiedByOther = Boolean(owner && owner.id !== driver?.id);
                    return { item, owner, disabled: occupiedByOther };
                })
                .filter(({ item, owner }) => {
                    if (!q) return true;
                    return [
                        item.name,
                        item.licensePlate,
                        owner?.name,
                        owner?.phone,
                    ].some(value => norm(value).includes(q));
                });
        }

        return activeDrivers
            .map(item => {
                const assignedCar = activeCars.find(c => c.assignedDriverId === item.id);
                const assignedToOtherCar = Boolean(assignedCar && assignedCar.id !== car?.id);
                return { item, assignedCar, disabled: assignedToOtherCar };
            })
            .filter(({ item, assignedCar }) => {
                if (!q) return true;
                return [
                    item.name,
                    item.phone,
                    item.carModel,
                    item.licensePlate,
                    assignedCar?.name,
                    assignedCar?.licensePlate,
                ].some(value => norm(value).includes(q));
            });
    }, [activeCars, activeDrivers, car?.id, driver?.id, mode, query]);

    if (!isOpen) return null;

    const handleSave = async (nextId: string | null = selectedId) => {
        const targetDriverId = mode === 'driver' ? driver?.id : (nextId ?? driver?.id);
        const targetCarId = mode === 'driver' ? nextId : (nextId ? car?.id : null);
        if (!targetDriverId) {
            setError(t('quickAssignSelectDriver', 'Haydovchini tanlang'));
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await onSave({
                driverId: targetDriverId,
                carId: targetCarId ?? null,
                effectiveFrom: Date.now(),
                replaceExisting: mode === 'car' && Boolean(car?.assignedDriverId) && Boolean(targetCarId),
            });
            onClose();
        } catch (err: any) {
            setError(err?.message || t('errorOccurred', 'Xatolik yuz berdi'));
        } finally {
            setSaving(false);
        }
    };

    const panelBg = isDark ? 'bg-[#111827] border-white/[0.08]' : 'bg-white border-slate-200';
    const subtle = isDark ? 'text-white/50' : 'text-slate-500';
    const txt = isDark ? 'text-white' : 'text-slate-950';

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[320] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm" onMouseDown={onClose}>
            <div
                className={`w-full max-w-2xl max-h-[86vh] overflow-hidden rounded-[28px] border shadow-2xl ${panelBg}`}
                onMouseDown={e => e.stopPropagation()}
            >
                <div className={`px-5 py-4 border-b ${isDark ? 'border-white/[0.08]' : 'border-slate-100'} flex items-start justify-between gap-4`}>
                    <div className="min-w-0">
                        <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${subtle}`}>
                            {t('quickAssignment', 'Tezkor biriktirish')}
                        </p>
                        <h2 className={`text-xl font-black mt-1 ${txt}`}>{title}</h2>
                        {subtitle && <p className={`text-sm mt-1 truncate ${subtle}`}>{subtitle}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isDark ? 'bg-white/[0.06] text-white/70 hover:bg-white/[0.1]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        aria-label={t('close', 'Yopish')}
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(86vh-156px)]">
                    <div className={`rounded-2xl border px-3 py-2.5 flex items-center gap-2 ${isDark ? 'border-white/[0.08] bg-white/[0.04]' : 'border-slate-200 bg-slate-50'}`}>
                        <SearchIcon className={`w-4 h-4 ${subtle}`} />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={mode === 'driver' ? t('quickAssignSearchCars', 'Avtomobil yoki raqam qidirish...') : t('quickAssignSearchDrivers', 'Haydovchi yoki telefon qidirish...')}
                            className={`w-full bg-transparent outline-none text-sm font-semibold ${txt} ${isDark ? 'placeholder:text-white/25' : 'placeholder:text-slate-400'}`}
                            autoFocus
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className={`w-full rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 transition-colors ${selectedId === null ? 'border-red-300 bg-red-50 text-red-700 dark:bg-red-500/10 dark:border-red-500/25 dark:text-red-300' : isDark ? 'border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.06]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                    >
                        <span className="flex items-center gap-3 text-sm font-black">
                            <span className="w-9 h-9 rounded-xl bg-current/10 flex items-center justify-center">
                                <XIcon className="w-4 h-4" />
                            </span>
                            {t('quickAssignDetach', 'Biriktirishni olib tashlash')}
                        </span>
                        {selectedId === null && <CheckIcon className="w-5 h-5" />}
                    </button>

                    <div className="grid gap-2">
                        {mode === 'driver' ? rows.map(({ item, owner, disabled }) => {
                            const selected = selectedId === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => setSelectedId(item.id)}
                                    className={`rounded-2xl border p-3 flex items-center gap-3 text-left transition-all ${selected ? 'border-teal-400 bg-teal-50 text-teal-800 dark:bg-teal-500/10 dark:border-teal-400/40 dark:text-teal-200' : disabled ? 'opacity-55 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-white/35' : isDark ? 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-white' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-950'}`}
                                >
                                    {item.avatar ? (
                                        <img src={item.avatar} alt={item.name} className="w-12 h-12 rounded-2xl object-cover shrink-0" />
                                    ) : (
                                        <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                                            <CarIcon className="w-5 h-5" />
                                        </span>
                                    )}
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-black truncate">{item.name}</span>
                                        <span className="mt-1 inline-flex"><LicensePlate plate={item.licensePlate} size="sm" /></span>
                                        {owner && <span className={`block text-xs mt-1 ${subtle}`}>{t('quickAssignOccupiedBy', 'Band')}: {owner.name}</span>}
                                    </span>
                                    {selected && <CheckIcon className="w-5 h-5 shrink-0" />}
                                </button>
                            );
                        }) : rows.map(({ item, assignedCar, disabled }) => {
                            const selected = selectedId === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => setSelectedId(item.id)}
                                    className={`rounded-2xl border p-3 flex items-center gap-3 text-left transition-all ${selected ? 'border-teal-400 bg-teal-50 text-teal-800 dark:bg-teal-500/10 dark:border-teal-400/40 dark:text-teal-200' : disabled ? 'opacity-55 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-white/35' : isDark ? 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-white' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-950'}`}
                                >
                                    <DriverAvatar src={item.avatar} name={item.name} size={48} theme={theme} rounded="2xl" className="shrink-0" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-black truncate">{item.name}</span>
                                        <span className={`block text-xs mt-0.5 ${subtle}`}>{item.phone}</span>
                                        {assignedCar && <span className={`block text-xs mt-1 ${subtle}`}>{t('quickAssignAlreadyHasCar', 'Avtomobili bor')}: {assignedCar.name}</span>}
                                    </span>
                                    {selected && <CheckIcon className="w-5 h-5 shrink-0" />}
                                </button>
                            );
                        })}

                        {rows.length === 0 && (
                            <div className={`rounded-2xl border border-dashed p-8 text-center ${isDark ? 'border-white/[0.08] text-white/45' : 'border-slate-200 text-slate-500'}`}>
                                <UserIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm font-bold">{t('nothingFound', 'Hech narsa topilmadi')}</p>
                            </div>
                        )}
                    </div>
                    {error && <p className="text-sm font-bold text-red-500">{error}</p>}
                </div>

                <div className={`px-5 py-4 border-t ${isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-slate-100 bg-slate-50'} flex justify-end gap-3`}>
                    <button type="button" onClick={onClose} className={`px-4 py-2.5 rounded-xl text-sm font-bold ${isDark ? 'text-white/65 hover:bg-white/[0.06]' : 'text-slate-600 hover:bg-slate-100'}`}>
                        {t('cancel', 'Bekor qilish')}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSave()}
                        disabled={saving}
                        className="px-5 py-2.5 rounded-xl text-sm font-black bg-[#0f766e] text-white hover:bg-[#0b5f59] disabled:opacity-60"
                    >
                        {saving ? t('saving', 'Saqlanmoqda...') : t('save', 'Saqlash')}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default QuickAssignmentModal;
