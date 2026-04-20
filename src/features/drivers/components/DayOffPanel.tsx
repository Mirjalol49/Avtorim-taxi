import React, { useState } from 'react';
import { DayOff, addDayOff, removeDayOff, countUsedThisMonth, MONTHLY_ALLOWANCE, toDateKey, toMonthKey } from '../../../../services/daysOffService';

interface DayOffPanelProps {
    driver: { id: string; name: string; fleetId: string };
    daysOff: DayOff[];
    theme: 'light' | 'dark';
    onClose: () => void;
}

const monthLabel = (monthKey: string) => {
    const [y, m] = monthKey.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' });
};

const dateLabel = (dateKey: string) => {
    const [y, m, d] = dateKey.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const DayOffPanel: React.FC<DayOffPanelProps> = ({ driver, daysOff, theme, onClose }) => {
    const isDark = theme === 'dark';
    const thisMonth = toMonthKey(new Date());
    const todayKey = toDateKey(new Date());

    const driverDaysOff = daysOff.filter(d => d.driverId === driver.id);
    const usedThisMonth = countUsedThisMonth(daysOff, driver.id);
    const remaining = MONTHLY_ALLOWANCE - usedThisMonth;
    const limitReached = remaining <= 0;

    // Group by month for display
    const byMonth: Record<string, DayOff[]> = {};
    driverDaysOff.forEach(d => {
        if (!byMonth[d.monthKey]) byMonth[d.monthKey] = [];
        byMonth[d.monthKey].push(d);
    });
    const sortedMonths = Object.keys(byMonth).sort().reverse();

    const [selectedDate, setSelectedDate] = useState(todayKey);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAdd = async () => {
        setError(null);
        setSaving(true);
        try {
            const [y, m, d] = selectedDate.split('-').map(Number);
            await addDayOff(driver.id, driver.fleetId, new Date(y, m - 1, d), note);
            setNote('');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async (id: string) => {
        setRemoving(id);
        try {
            await removeDayOff(id);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setRemoving(null);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={`w-full max-w-md rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
                    isDark ? 'bg-[#1F2937] border-gray-700' : 'bg-white border-gray-200'
                }`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div>
                        <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            🏖️ Dam olish kunlari
                        </h2>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{driver.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                            isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                        }`}
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Monthly allowance badge */}
                <div className={`mx-5 mt-4 rounded-xl p-3 flex items-center gap-3 ${
                    limitReached
                        ? isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'
                        : isDark ? 'bg-[#0f766e]/10 border border-[#0f766e]/20' : 'bg-teal-50 border border-teal-200'
                }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${
                        limitReached ? 'bg-red-500/20 text-red-400' : 'bg-[#0f766e]/20 text-[#0f766e]'
                    }`}>
                        {remaining}
                    </div>
                    <div>
                        <p className={`text-sm font-bold ${
                            limitReached
                                ? isDark ? 'text-red-400' : 'text-red-600'
                                : isDark ? 'text-teal-400' : 'text-teal-700'
                        }`}>
                            {limitReached ? 'Bu oy limiti tugadi' : `${remaining} ta dam olish qoldi`}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {usedThisMonth} / {MONTHLY_ALLOWANCE} ishlatildi · {monthLabel(thisMonth)}
                        </p>
                    </div>
                </div>

                {/* Add day off form */}
                {!limitReached && (
                    <div className={`mx-5 mt-3 rounded-xl p-3 ${isDark ? 'bg-gray-800/70' : 'bg-gray-50'}`}>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Dam olish kuni qo'shish
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className={`flex-1 px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#0f766e]/40 transition-all ${
                                    isDark
                                        ? 'bg-gray-700 border-gray-600 text-white'
                                        : 'bg-white border-gray-200 text-gray-900'
                                }`}
                            />
                            <button
                                onClick={handleAdd}
                                disabled={saving || !selectedDate}
                                className="px-4 py-2 rounded-lg bg-[#0f766e] text-white text-sm font-bold hover:bg-teal-600 transition-all active:scale-95 disabled:opacity-50 min-w-[80px]"
                            >
                                {saving ? '...' : "Qo'shish"}
                            </button>
                        </div>
                        {error && (
                            <p className="mt-2 text-xs text-red-400">⚠ {error}</p>
                        )}
                    </div>
                )}

                {limitReached && error && (
                    <p className="mx-5 mt-2 text-xs text-red-400">⚠ {error}</p>
                )}

                {/* History */}
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4 max-h-72">
                    {sortedMonths.length === 0 ? (
                        <p className={`text-sm text-center py-6 ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>
                            Hali dam olish kunlari yo'q
                        </p>
                    ) : (
                        sortedMonths.map(mk => (
                            <div key={mk}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${
                                    mk === thisMonth
                                        ? isDark ? 'text-teal-400' : 'text-teal-600'
                                        : isDark ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                    {monthLabel(mk)} · {byMonth[mk].length}/{MONTHLY_ALLOWANCE}
                                </p>
                                <div className="space-y-1.5">
                                    {byMonth[mk].sort((a, b) => a.dateKey.localeCompare(b.dateKey)).map(d => (
                                        <div
                                            key={d.id}
                                            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                                                isDark ? 'bg-gray-800' : 'bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">🏖️</span>
                                                <div>
                                                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {dateLabel(d.dateKey)}
                                                    </p>
                                                    {d.note && (
                                                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{d.note}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemove(d.id)}
                                                disabled={removing === d.id}
                                                className={`p-1.5 rounded-lg transition-colors ${
                                                    isDark
                                                        ? 'text-gray-600 hover:text-red-400 hover:bg-red-500/10'
                                                        : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                                                }`}
                                                title="Bekor qilish"
                                            >
                                                {removing === d.id ? (
                                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M18 6 6 18M6 6l12 12" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
