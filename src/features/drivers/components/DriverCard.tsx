import React from 'react';
import { useTranslation } from 'react-i18next';
import { Driver, DriverStatus } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { Transaction } from '../../../core/types/transaction.types';
import { EditIcon, TrashIcon, CameraIcon } from '../../../../components/Icons';
import { calcDriverDebt } from '../utils/debtUtils';

interface DriverCardProps {
    driver: Driver;
    car?: Car | null;
    transactions: Transaction[];
    theme: 'light' | 'dark';
    userRole: 'admin' | 'viewer';
    currentUserId: string;
    onEdit: (driver: Driver) => void;
    onDelete: (id: string) => void;
    onUpdateStatus: (id: string, status: DriverStatus) => void;
}

const fmt = (n: number) =>
    new Intl.NumberFormat('uz-UZ').format(Math.round(n));

export const DriverCard: React.FC<DriverCardProps> = ({
    driver, car, transactions, theme, userRole, onEdit, onDelete,
}) => {
    const { t } = useTranslation();
    const debt = calcDriverDebt(driver, car, transactions);
    const docs = driver.documents ?? [];

    const handleEdit = (e: React.MouseEvent) => { e.stopPropagation(); onEdit(driver); };
    const handleDelete = (e: React.MouseEvent) => { e.stopPropagation(); onDelete(driver.id); };

    return (
        <div className={`rounded-2xl flex flex-col transition-all group relative border overflow-hidden ${theme === 'dark'
            ? 'bg-[#1F2937] border-gray-700 hover:border-gray-600'
            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg'
        }`}>

            {/* Header: avatar + name + phone */}
            <div className="flex items-center gap-4 p-5 pb-3">
                <div className={`w-16 h-16 rounded-full border-2 overflow-hidden flex-shrink-0 transition-colors ${theme === 'dark' ? 'border-gray-600 group-hover:border-[#0f766e]' : 'border-gray-200 group-hover:border-[#0f766e]'}`}>
                    {driver.avatar ? (
                        <img src={driver.avatar} className="w-full h-full object-cover" alt={driver.name} />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center text-xl font-bold ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                            {driver.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className={`font-bold text-base truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</h3>
                    <p className={`text-sm mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{driver.phone}</p>
                </div>
                {/* Debt badge */}
                {debt.totalDebt > 0 && (
                    <div className="flex-shrink-0 text-right">
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Qarz</p>
                        <p className="text-sm font-bold text-red-400">−{fmt(debt.totalDebt)}</p>
                    </div>
                )}
            </div>

            {/* Daily plan stats */}
            {debt.dailyPlan > 0 && (
                <div className={`mx-4 mb-3 rounded-xl p-3 grid grid-cols-3 gap-2 ${theme === 'dark' ? 'bg-gray-800/70' : 'bg-gray-50'}`}>
                    <div className="text-center">
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Kunlik reja</p>
                        <p className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{fmt(debt.dailyPlan)}</p>
                    </div>
                    <div className="text-center">
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Bugun</p>
                        <p className={`text-xs font-bold ${debt.todayIncome >= debt.dailyPlan ? 'text-green-400' : 'text-amber-400'}`}>{fmt(debt.todayIncome)}</p>
                    </div>
                    <div className="text-center">
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Bugun qarz</p>
                        <p className={`text-xs font-bold ${debt.todayDebt > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {debt.todayDebt > 0 ? `−${fmt(debt.todayDebt)}` : '✓'}
                        </p>
                    </div>
                </div>
            )}

            {/* Attached car */}
            <div className={`mx-4 mb-3 rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                {car ? (
                    <div className="flex items-center gap-3 p-2.5">
                        <div className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                            {car.avatar ? (
                                <img src={car.avatar} alt={car.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <CameraIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Avtomobil</p>
                            <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{car.name}</p>
                            <span className={`inline-block text-xs font-mono px-1.5 py-0.5 rounded mt-0.5 ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{car.licensePlate}</span>
                        </div>
                        {car.dailyPlan > 0 && !((driver as any).dailyPlan) && (
                            <div className="flex-shrink-0 text-right">
                                <p className={`text-[10px] font-bold uppercase ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Reja</p>
                                <p className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{fmt(car.dailyPlan)}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={`flex items-center gap-2 p-2.5 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`}>
                        <CameraIcon className="w-4 h-4" />
                        <span className="text-xs">Avtomobil biriktirilmagan</span>
                    </div>
                )}
            </div>

            {/* Documents */}
            {docs.length > 0 && (
                <div className={`mx-4 mb-3 rounded-xl border p-2.5 space-y-1 ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Hujjatlar</p>
                    {docs.map((doc, i) => (
                        <a key={i} href={doc.data}
                            download={doc.type === 'application/pdf' ? doc.name : undefined}
                            target={doc.type !== 'application/pdf' ? '_blank' : undefined}
                            rel="noreferrer"
                            className="flex items-center gap-2 text-xs text-[#0f766e] hover:underline truncate">
                            <span>{doc.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                            <span className="truncate">{doc.name}</span>
                        </a>
                    ))}
                </div>
            )}

            {/* Actions */}
            {userRole === 'admin' && (
                <div className={`flex gap-2 p-4 border-t mt-auto ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                    <button onClick={handleEdit}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all active:scale-95 font-medium text-sm ${theme === 'dark'
                            ? 'bg-[#0f766e]/10 text-[#0f766e] hover:bg-[#0f766e]/20 border border-[#0f766e]/20'
                            : 'bg-[#0f766e]/10 text-[#0f766e] hover:bg-[#0f766e]/20 border border-[#0f766e]/20'}`}>
                        <EditIcon className="w-4 h-4" /><span>{t('edit')}</span>
                    </button>
                    <button onClick={handleDelete}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all active:scale-95 font-medium text-sm ${theme === 'dark'
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                            : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}>
                        <TrashIcon className="w-4 h-4" /><span>{t('delete')}</span>
                    </button>
                </div>
            )}
        </div>
    );
};
