import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Driver, DriverStatus } from '../../../core/types';
import { Car } from '../../../core/types/car.types';
import { Transaction } from '../../../core/types/transaction.types';
import { EditIcon, TrashIcon, CameraIcon } from '../../../../components/Icons';
import { calcDriverDebt, calcExplicitDebt } from '../utils/debtUtils';
import { DayOff, getDaysOffSet, countUsedThisMonth, MONTHLY_ALLOWANCE } from '../../../../services/daysOffService';
import { DayOffPanel } from './DayOffPanel';

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

interface DriverRowProps {
    driver: Driver;
    car?: Car | null;
    transactions: Transaction[];
    daysOff: DayOff[];
    fleetId: string;
    theme: 'light' | 'dark';
    userRole: 'admin' | 'viewer';
    currentUserId: string;
    onEdit: (driver: Driver) => void;
    onDelete: (id: string) => void;
    onUpdateStatus: (id: string, status: DriverStatus) => void;
}

export const DriverRow: React.FC<DriverRowProps> = ({
    driver, car, transactions, daysOff, fleetId, theme, userRole, onEdit, onDelete,
}) => {
    const { t } = useTranslation();
    const [showDayOff, setShowDayOff] = useState(false);
    const docs = driver.documents ?? [];
    const daysOffSet = getDaysOffSet(daysOff, driver.id);
    const usedThisMonth = countUsedThisMonth(daysOff, driver.id);
    const debt = calcDriverDebt(driver, car, transactions, daysOffSet);
    const explicitDebt = calcExplicitDebt(driver, transactions);

    const handleEdit = (e: React.MouseEvent) => { e.stopPropagation(); onEdit(driver); };
    const handleDelete = (e: React.MouseEvent) => { e.stopPropagation(); onDelete(driver.id); };

    return (<>
        <tr className={`group transition-colors ${theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}>

            {/* Driver */}
            <td className="p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0">
                        {driver.avatar ? (
                            <img src={driver.avatar} alt={driver.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                {driver.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div>
                        <p className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{driver.name}</p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{driver.phone}</p>
                    </div>
                </div>
            </td>

            {/* Attached car */}
            <td className="p-4">
                {car ? (
                    <div className="flex items-center gap-2">
                        <div className={`w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                            {car.avatar ? (
                                <img src={car.avatar} alt={car.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <CameraIcon className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                                </div>
                            )}
                        </div>
                        <div>
                            <p className={`font-medium text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{car.name}</p>
                            <p className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{car.licensePlate}</p>
                        </div>
                    </div>
                ) : (
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`}>—</span>
                )}
            </td>

            {/* Documents */}
            <td className="p-4">
                {docs.length > 0 ? (
                    <div className="flex flex-col gap-1">
                        {docs.map((doc, i) => (
                            <a key={i}
                                href={doc.data}
                                download={doc.type === 'application/pdf' ? doc.name : undefined}
                                target={doc.type !== 'application/pdf' ? '_blank' : undefined}
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs text-[#0f766e] hover:underline truncate max-w-[140px]">
                                <span>{doc.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                                <span className="truncate">{doc.name}</span>
                            </a>
                        ))}
                    </div>
                ) : (
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`}>—</span>
                )}
            </td>

            {/* Debt / Day Off */}
            <td className="p-4">
                <div className="space-y-0.5">
                    {/* Day off badge */}
                    <button
                        onClick={e => { e.stopPropagation(); if (userRole === 'admin') setShowDayOff(true); }}
                        title="Dam olish kunlari"
                        className={`mb-1 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                            usedThisMonth >= MONTHLY_ALLOWANCE
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-teal-500/10 text-teal-500 hover:bg-teal-500/20'
                        }`}
                    >
                        🏖️ {usedThisMonth}/{MONTHLY_ALLOWANCE}
                    </button>
                    {debt.todayIsDayOff && (
                        <p className="text-xs font-semibold text-teal-400">🏖️ Dam olish</p>
                    )}
                    {debt.dailyPlan > 0 && !debt.todayIsDayOff && (
                        <>
                            <p className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Reja: {fmt(debt.dailyPlan)}</p>
                            {debt.totalDebt > 0 && (
                                <p className="text-xs font-bold text-red-400">Reja qarz: −{fmt(debt.totalDebt)}</p>
                            )}
                            {debt.todayIncome > 0 && (
                                <p className={`text-xs ${debt.todayIncome >= debt.dailyPlan ? 'text-green-400' : 'text-amber-400'}`}>
                                    Bugun: {fmt(debt.todayIncome)}
                                </p>
                            )}
                        </>
                    )}
                    {explicitDebt.totalDebt > 0 && (
                        <p className={`text-xs font-bold ${explicitDebt.remaining > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                            {explicitDebt.remaining > 0
                                ? `Qarz: −${fmt(explicitDebt.remaining)}`
                                : "Qarz to'landi ✓"}
                        </p>
                    )}
                    {debt.dailyPlan === 0 && explicitDebt.totalDebt === 0 && !debt.todayIsDayOff && (
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`}>—</span>
                    )}
                </div>
            </td>

            {/* Actions */}
            {userRole === 'admin' && (
                <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                        <button onClick={handleEdit}
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-[#0f766e] hover:bg-[#0f766e]/10' : 'text-gray-500 hover:text-[#0f766e] hover:bg-[#0f766e]/10'}`}>
                            <EditIcon className="w-4 h-4" />
                        </button>
                        <button onClick={handleDelete}
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}>
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </td>
            )}
        </tr>

        {/* Day Off Panel */}
        {showDayOff && (
            <DayOffPanel
                driver={{ id: driver.id, name: driver.name, fleetId }}
                daysOff={daysOff}
                theme={theme}
                onClose={() => setShowDayOff(false)}
            />
        )}
    </>);
};
