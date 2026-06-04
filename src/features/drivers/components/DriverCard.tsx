import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Driver, DriverStatus } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { PaymentStatus, Transaction } from '../../../core/types/transaction.types';
import { DriverAvatar } from './DriverAvatar';
import { calcDriverFinance } from '../utils/debtUtils';
import { LicensePlate } from '../../../components/ui/LicensePlate';
import { VisuallyHidden } from '../../../components/ui/VisuallyHidden';
import { useBoop } from '../../../core/hooks/useBoop';
import { animated } from 'react-spring';
import { 
    PhoneIcon, 
    CarIcon, 
    EditIcon, 
    TrashIcon,
    WalletIcon,
    AlertCircleIcon,
    BanknoteIcon,
    CalendarIcon,
    PlusIcon
} from 'lucide-react';

interface DriverCardProps {
    driver: Driver;
    car?: Car | null;
    transactions?: Transaction[];
    userRole: 'admin' | 'user' | 'viewer';
    theme: 'light' | 'dark';
    fleetId: string;
    currentUserId: string;
    onEdit: (d: Driver) => void;
    onDelete: (d: string) => void;
    onUpdateStatus: (id: string, status: DriverStatus) => void;
}

export const DriverCard: React.FC<DriverCardProps> = ({
    driver,
    car,
    transactions = [],
    userRole,
    theme,
    fleetId,
    currentUserId,
    onEdit,
    onDelete,
    onUpdateStatus
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isDark = theme === 'dark';

    const [editStyle, triggerEdit] = useBoop({ rotation: 10, scale: 1.1 });
    const [deleteStyle, triggerDelete] = useBoop({ rotation: 10, scale: 1.1 });

    const typeLabel = useMemo(() => {
        switch (driver.driverType) {
            case 'salary': return t('typeSalary', 'Maosh');
            case 'lease_to_own': return t('typeVikup', 'Vikup');
            default: return t('typeStandard', 'Standart');
        }
    }, [driver.driverType, t]);

    const typeBadgeStyles = useMemo(() => {
        switch (driver.driverType) {
            case 'deposit':
                return isDark 
                    ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' 
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100';
            case 'salary':
                return isDark 
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100';
            case 'lease_to_own':
                return isDark 
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' 
                    : 'bg-amber-50 text-amber-600 border border-amber-100';
            default:
                return isDark 
                    ? 'bg-gray-500/10 text-gray-300 border border-gray-500/20' 
                    : 'bg-slate-50 text-slate-600 border border-slate-200';
        }
    }, [driver.driverType, isDark]);

    const finance = useMemo(() => calcDriverFinance(driver, car, transactions), [driver, car, transactions]);

    const metric = useMemo(() => {
        const fmt = (v: number) => new Intl.NumberFormat('uz-UZ').format(v) + ' UZS';
        const hasDepositActivity =
            (driver.driverType ?? 'deposit') === 'deposit' &&
            (
                (driver.depositAmount ?? 0) > 0 ||
                finance.remainingDeposit > 0 ||
                transactions.some(tx =>
                    tx.driverId === driver.id &&
                    tx.status !== PaymentStatus.DELETED &&
                    (tx.category === 'deposit_topup' || tx.useDeposit === true)
                )
            );
        const isLowDeposit =
            hasDepositActivity &&
            finance.remainingDeposit <= (driver.depositWarningThreshold ?? 1_000_000);

        if (!driver.driverType || driver.driverType === 'deposit') {
            return {
                label: t('dailyPlan', 'Kunlik Reja'),
                value: car?.dailyPlan ? fmt(car.dailyPlan) : '-',
                icon: <CalendarIcon className="w-4 h-4 text-indigo-400" />,
                deposit: hasDepositActivity ? {
                    value: fmt(finance.remainingDeposit),
                    isLow: isLowDeposit
                } : null,
                warning: null
            };
        } else if (driver.driverType === 'salary') {
            return {
                label: t('salary', 'Maosh'),
                value: finance.salaryAmount ? fmt(finance.salaryAmount) : '-',
                icon: <BanknoteIcon className="w-4 h-4 text-emerald-400" />,
                deposit: null,
                warning: null
            };
        } else if (driver.driverType === 'lease_to_own') {
            return {
                label: t('contractRemaining', 'Qoldiq'),
                value: finance.contractRemaining ? fmt(finance.contractRemaining) : '-',
                icon: <WalletIcon className="w-4 h-4 text-amber-400" />,
                deposit: null,
                warning: null
            };
        }
        return null;
    }, [driver, car, finance, t, transactions]);

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(driver);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(driver.id);
    };

    const cardClass = isDark 
        ? 'bg-[#151f32] border border-white/5' 
        : 'bg-white border border-slate-200 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.1)]';

    const widgetBg = isDark 
        ? 'bg-[#1a2840]/60 border border-white/5 shadow-inner' 
        : 'bg-slate-50 border border-slate-100 shadow-sm';

    const labelColor = isDark ? 'text-gray-400' : 'text-slate-400';
    const valueColor = isDark ? 'text-slate-100' : 'text-slate-800';

    return (
        <div 
            onClick={() => navigate(`/drivers/${driver.id}`)}
            className={`p-5 rounded-3xl cursor-pointer transition-all duration-300 relative group overflow-hidden ${cardClass}`}
        >
            {/* Header Section */}
            <div className="flex justify-between items-start relative z-10">
                <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        <DriverAvatar 
                            src={driver.avatar} 
                            name={driver.name} 
                            size={56} 
                            rounded="full" 
                            theme={theme}
                            className={isDark ? '' : 'shadow-sm border border-slate-100'}
                        />
                        <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-[2.5px] ${isDark ? 'border-[#151f32]' : 'border-white'} ${
                            car 
                                ? 'bg-emerald-500' 
                                : 'bg-rose-500'
                        }`} />
                    </div>

                    {/* Driver Identity */}
                    <div className="flex flex-col justify-center min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className={`text-[17px] font-black truncate tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {driver.name}
                            </h3>
                            <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${typeBadgeStyles}`}>
                                {typeLabel}
                            </div>
                        </div>
                        <div className={`text-[13px] font-medium flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                            <PhoneIcon className="w-3.5 h-3.5 opacity-70" />
                            <span className="truncate">{driver.phone || t('unknownPhone', 'Raqam yoq')}</span>
                        </div>
                    </div>
                </div>

                {/* Actions (Admin Only) */}
                {userRole === 'admin' && (
                    <div className="flex items-center gap-0.5 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                            onClick={handleEdit}
                            onMouseEnter={triggerEdit}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                isDark ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                        >
                            <animated.span style={editStyle}>
                                <EditIcon className="w-4 h-4" />
                            </animated.span>
                            <VisuallyHidden>{t('edit', 'Tahrirlash')}</VisuallyHidden>
                        </button>
                        <button
                            onClick={handleDelete}
                            onMouseEnter={triggerDelete}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                isDark ? 'text-gray-400 hover:bg-red-500/20 hover:text-red-400' : 'text-slate-400 hover:bg-red-50 hover:text-red-600'
                            }`}
                        >
                            <animated.span style={deleteStyle}>
                                <TrashIcon className="w-4 h-4" />
                            </animated.span>
                            <VisuallyHidden>{t('delete', "O'chirish")}</VisuallyHidden>
                        </button>
                    </div>
                )}
            </div>

            {/* Widgets Section (Grid) */}
            <div className="mt-5 grid grid-cols-2 gap-3 relative z-10">
                {/* Car Widget */}
                <div className={`p-3.5 rounded-2xl flex flex-col justify-between min-h-[96px] transition-all duration-300 ${widgetBg}`}>
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${labelColor}`}>
                            {t('car', 'Avto')}
                        </span>
                        <CarIcon className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-slate-300'}`} />
                    </div>
                    
                    {car ? (
                        <div>
                            <div className={`text-[14px] font-bold truncate leading-tight mb-1.5 ${valueColor}`}>
                                {car.name}
                            </div>
                            <LicensePlate plate={car.licensePlate} size="sm" />
                        </div>
                    ) : (
                        <div>
                            <div className={`text-[13px] font-bold mb-2 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                                {t('notAssigned', 'Biriktirilmagan')}
                            </div>
                            {userRole === 'admin' && (
                                <button 
                                    onClick={handleEdit}
                                    className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md transition-all active:scale-[0.97] ${
                                        isDark 
                                            ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30' 
                                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                    }`}
                                >
                                    <PlusIcon className="w-3 h-3" />
                                    {t('assign', 'Qo\'shish')}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Metric Widget */}
                {metric && (
                    <div className={`p-3.5 rounded-2xl flex flex-col justify-between min-h-[96px] transition-all duration-300 ${widgetBg}`}>
                        <div className="flex justify-between items-start mb-2 gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest truncate ${labelColor}`}>
                                {metric.label}
                            </span>
                            <div className="flex-shrink-0">
                                {metric.icon}
                            </div>
                        </div>
                        
                        <div>
                            <div className={`text-[15px] font-black truncate leading-tight ${valueColor}`}>
                                {metric.value}
                            </div>
                            {metric.deposit && (
                                <div
                                    className={`mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-black leading-none ${
                                        metric.deposit.isLow
                                            ? isDark
                                                ? 'border-amber-400/25 bg-amber-400/10 text-amber-300'
                                                : 'border-amber-200 bg-amber-50 text-amber-700'
                                            : isDark
                                                ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    }`}
                                    title={`${t('deposit', 'Depozit')}: ${metric.deposit.value}`}
                                >
                                    <WalletIcon className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{t('deposit', 'Depozit')}: {metric.deposit.value}</span>
                                </div>
                            )}
                            {metric.warning && (
                                <div className="mt-1.5 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                                    <span className="text-[11px] font-bold text-red-500 truncate" title={metric.warning}>
                                        {metric.warning}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Background Glow Effect (Subtle) */}
            {isDark && (
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            )}
        </div>
    );
};
