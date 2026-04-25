import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface DatePickerProps {
    label: string;
    value: Date;
    onChange: (date: Date) => void;
    theme: 'light' | 'dark';
    labelClassName?: string;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function getCalendarDays(year: number, month: number) {
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const cells: { day: number; cur: boolean }[] = [];

    for (let i = firstDow - 1; i >= 0; i--)
        cells.push({ day: daysInPrev - i, cur: false });

    for (let d = 1; d <= daysInMonth; d++)
        cells.push({ day: d, cur: true });

    while (cells.length % 7 !== 0)
        cells.push({ day: cells.length - daysInMonth - firstDow + 1, cur: false });

    return cells;
}

function fmt(d: Date) {
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

const DatePicker: React.FC<DatePickerProps> = ({ label, value, onChange, theme, labelClassName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [month, setMonth] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const triggerRef = useRef<HTMLButtonElement>(null);
    const calRef = useRef<HTMLDivElement>(null);
    const isDark = theme === 'dark';
    const today = new Date();

    // Position calendar relative to trigger button
    useLayoutEffect(() => {
        if (!isOpen || !triggerRef.current) return;

        const r = triggerRef.current.getBoundingClientRect();
        const CAL_W = 280;
        const CAL_H = 330;
        const GAP = 6;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Horizontal: align left edge to button left, clamp to viewport
        let left = r.left;
        if (left + CAL_W > vw - 8) left = vw - CAL_W - 8;
        left = Math.max(8, left);

        // Vertical: open below by default, flip above if not enough space
        let top = r.bottom + GAP;
        if (top + CAL_H > vh - 8) top = r.top - CAL_H - GAP;
        top = Math.max(8, top);

        setPos({ top, left });
    }, [isOpen]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            const t = e.target as Node;
            if (triggerRef.current?.contains(t) || calRef.current?.contains(t)) return;
            setIsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen]);

    const cells = getCalendarDays(month.getFullYear(), month.getMonth());

    const isSelected = (c: { day: number; cur: boolean }) =>
        c.cur &&
        c.day === value.getDate() &&
        month.getMonth() === value.getMonth() &&
        month.getFullYear() === value.getFullYear();

    const isToday = (c: { day: number; cur: boolean }) =>
        c.cur &&
        c.day === today.getDate() &&
        month.getMonth() === today.getMonth() &&
        month.getFullYear() === today.getFullYear();

    const selectDay = (c: { day: number; cur: boolean }) => {
        if (!c.cur) return;
        onChange(new Date(month.getFullYear(), month.getMonth(), c.day));
        setIsOpen(false);
    };

    const goToday = () => {
        const t = new Date();
        setMonth(new Date(t.getFullYear(), t.getMonth(), 1));
        onChange(t);
        setIsOpen(false);
    };

    const calendar = (
        <div
            ref={calRef}
            className={`fixed z-[99999] rounded-2xl shadow-2xl border overflow-hidden select-none ${
                isDark
                    ? 'bg-[#1a2332] border-white/[0.08]'
                    : 'bg-white border-gray-200'
            }`}
            style={{ top: pos.top, left: pos.left, width: 280 }}
            onMouseDown={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                <button
                    type="button"
                    onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                        isDark ? 'text-gray-400 hover:bg-white/[0.06] hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                    <ChevronLeftIcon className="w-4 h-4" />
                </button>

                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {MONTHS[month.getMonth()]} {month.getFullYear()}
                </span>

                <button
                    type="button"
                    onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                        isDark ? 'text-gray-400 hover:bg-white/[0.06] hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                    <ChevronRightIcon className="w-4 h-4" />
                </button>
            </div>

            <div className="p-3">
                {/* Day name headers */}
                <div className="grid grid-cols-7 mb-1">
                    {DAYS.map(d => (
                        <div key={d} className={`text-center text-[10px] font-bold py-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {d}
                        </div>
                    ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-y-0.5">
                    {cells.map((c, i) => {
                        const sel = isSelected(c);
                        const tod = isToday(c);
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => selectDay(c)}
                                disabled={!c.cur}
                                className={`
                                    h-8 w-full flex items-center justify-center text-xs rounded-lg font-medium transition-all
                                    ${sel
                                        ? 'bg-[#0f766e] text-white font-bold shadow-sm'
                                        : tod
                                            ? isDark
                                                ? 'ring-1 ring-[#0f766e] text-[#0f766e] font-bold'
                                                : 'ring-1 ring-[#0f766e] text-[#0f766e] font-bold'
                                            : c.cur
                                                ? isDark
                                                    ? 'text-gray-200 hover:bg-white/[0.06]'
                                                    : 'text-gray-800 hover:bg-gray-100'
                                                : isDark
                                                    ? 'text-gray-600 cursor-default'
                                                    : 'text-gray-300 cursor-default'
                                    }
                                `}
                            >
                                {c.day}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className={`px-3 pb-3`}>
                <button
                    type="button"
                    onClick={goToday}
                    className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isDark
                            ? 'bg-[#111111] text-gray-400 hover:bg-white/[0.06] hover:text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                >
                    Today
                </button>
            </div>
        </div>
    );

    return (
        <div className="relative w-full">
            {/* Label */}
            <div className={`flex items-center gap-2 mb-2 ${labelClassName || (isDark ? 'text-gray-400' : 'text-gray-500')}`}>
                <CalendarIcon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            </div>

            {/* Trigger button */}
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(o => !o)}
                className={`w-full px-4 py-3 rounded-xl border text-left transition-all ${
                    isOpen
                        ? isDark
                            ? 'bg-[#111111] border-[#0f766e] ring-1 ring-[#0f766e]/40 text-white'
                            : 'bg-white border-[#0f766e] ring-1 ring-[#0f766e]/20 text-gray-900'
                        : isDark
                            ? 'bg-[#111111]/50 border-white/[0.08] hover:border-white/[0.12] text-white'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-900'
                }`}
            >
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{fmt(value)}</span>
                    <CalendarIcon className={`w-4 h-4 transition-colors ${isOpen ? 'text-[#0f766e]' : isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
            </button>

            {/* Portal calendar */}
            {isOpen && typeof document !== 'undefined' && createPortal(calendar, document.body)}
        </div>
    );
};

export default DatePicker;
