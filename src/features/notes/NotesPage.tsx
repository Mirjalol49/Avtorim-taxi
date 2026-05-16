import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Note, NoteColor } from '../../core/types/note.types';
import { addNote, updateNote, deleteNote } from '../../../services/notesService';
import { useNotes } from './hooks/useNotes';
import { useAuth } from '../auth/hooks/useAuth';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { uz, ru, enUS } from 'date-fns/locale';
import 'react-day-picker/style.css';

interface NotesPageProps {
    theme: 'light' | 'dark';
    fleetId?: string;
    /** Pass from App root to avoid duplicate Supabase realtime subscriptions */
    initialNotes?: Note[];
    initialLoading?: boolean;
    initialTableError?: boolean;
}

// ─── SQL Setup Banner ─────────────────────────────────────────────────────────

const SQL = `-- Run this in Supabase SQL Editor to create the notes table

CREATE TABLE IF NOT EXISTS notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fleet_id    UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT 'default',
  is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_at BIGINT,
  created_ms  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_ms  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_notes_fleet ON notes(fleet_id);
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
GRANT ALL ON notes TO anon, authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE notes;

-- If table already exists, add the reminder_at column:
-- ALTER TABLE notes ADD COLUMN IF NOT EXISTS reminder_at BIGINT;`;

const SqlSetupBanner: React.FC<{ isDark: boolean }> = ({ isDark }) => {
    const [copied, setCopied] = useState(false);
    const copy = useCallback(() => {
        navigator.clipboard.writeText(SQL).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, []);

    return (
        <div className={`rounded-2xl border ${isDark ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-start justify-between gap-3 p-5 pb-3">
                <div>
                    <p className={`font-bold text-sm mb-1 ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                        ⚠ Notes table not found in Supabase
                    </p>
                    <p className={`text-xs ${isDark ? 'text-yellow-500/70' : 'text-yellow-600'}`}>
                        Run this SQL in Supabase dashboard → SQL Editor, then reload.
                    </p>
                </div>
                <button
                    onClick={copy}
                    className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                        copied
                            ? 'bg-green-500 text-white'
                            : isDark ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30' : 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                    }`}
                >
                    {copied ? '✓ Copied!' : 'Copy SQL'}
                </button>
            </div>
            <pre
                className={`text-xs px-5 pb-5 overflow-x-auto whitespace-pre select-text cursor-text ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                style={{ userSelect: 'text' }}
            >
                {SQL}
            </pre>
        </div>
    );
};

// ─── Color Palette ────────────────────────────────────────────────────────────

const COLOR_MAP: Record<NoteColor, { bg: string; border: string; dot: string; ring: string; label: string }> = {
    default: { bg: '', border: '', dot: 'bg-gray-400', ring: 'ring-gray-400', label: 'Default' },
    red:     { bg: 'bg-red-500/10',    border: 'border-red-500/30',    dot: 'bg-red-400',    ring: 'ring-red-400',    label: 'Red' },
    orange:  { bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400', ring: 'ring-orange-400', label: 'Orange' },
    yellow:  { bg: 'bg-yellow-500/10', border: 'border-yellow-400/30', dot: 'bg-yellow-400', ring: 'ring-yellow-400', label: 'Yellow' },
    green:   { bg: 'bg-green-500/10',  border: 'border-green-500/30',  dot: 'bg-green-400',  ring: 'ring-green-400',  label: 'Green' },
    teal:    { bg: 'bg-teal-500/10',   border: 'border-teal-500/30',   dot: 'bg-teal-400',   ring: 'ring-teal-400',   label: 'Teal' },
    blue:    { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   dot: 'bg-blue-400',   ring: 'ring-blue-400',   label: 'Blue' },
    purple:  { bg: 'bg-purple-500/10', border: 'border-purple-500/30', dot: 'bg-purple-400', ring: 'ring-purple-400', label: 'Purple' },
    pink:    { bg: 'bg-pink-500/10',   border: 'border-pink-500/30',   dot: 'bg-pink-400',   ring: 'ring-pink-400',   label: 'Pink' },
};

const ALL_COLORS = Object.keys(COLOR_MAP) as NoteColor[];

function timeAgo(ms: number): string {
    const diff = Date.now() - ms;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7)  return `${d}d ago`;
    return new Date(ms).toLocaleDateString('en-GB');
}

// ─── Note Editor Modal ────────────────────────────────────────────────────────

interface EditorProps {
    note?: Note | null;
    theme: 'light' | 'dark';
    saveError?: string | null;
    isSaving?: boolean;
    labels: { title: string; takNote: string; delete: string; confirmDelete: string; cancel: string; save: string; };
    onSave: (data: { title: string; content: string; color: NoteColor; isPinned: boolean; reminderAt?: number | null }) => void;
    onDelete?: () => void;
    onClose: () => void;
}

// Format epoch ms as "YYYY-MM-DDTHH:mm" for datetime-local input
const toInputValue = (ms: number | null | undefined): string => {
    if (!ms) return '';
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const NoteEditor: React.FC<EditorProps> = ({ note, theme, saveError, isSaving, labels, onSave, onDelete, onClose }) => {
    const [title, setTitle]           = useState(note?.title ?? '');
    const [content, setContent]       = useState(note?.content ?? '');
    const [color, setColor]           = useState<NoteColor>(note?.color ?? 'default');
    const [isPinned, setIsPinned]     = useState(note?.isPinned ?? false);
    const [reminderAt, setReminderAt] = useState<number | null>(note?.reminderAt ?? null);
    const [showReminder, setShowReminder] = useState(false);
    const [confirmDel, setConfirmDel] = useState(false);
    const contentRef = useRef<HTMLTextAreaElement>(null);
    const { t, i18n } = useTranslation();
    const isDark = theme === 'dark';

    const getLocale = (lang: string) => {
        if (lang === 'ru') return ru;
        if (lang === 'en') return enUS;
        return uz;
    };
    const locale = getLocale(i18n.language);

    useEffect(() => {
        if (!note) contentRef.current?.focus();
    }, []);

    const autoResize = () => {
        const el = contentRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    };

    const hasContent = title.trim() || content.trim();

    const cardBg = isDark ? 'bg-surface' : 'bg-white';
    const cardBorder = isDark ? 'border-white/[0.08]' : 'border-gray-200';

    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = reminderAt ? (() => { const d = new Date(reminderAt); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })() : '';
    const timeStr = reminderAt ? (() => { const d = new Date(reminderAt); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; })() : '';

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (!val) { setReminderAt(null); return; }
        const [y, m, d] = val.split('-').map(Number);
        const current = reminderAt ? new Date(reminderAt) : new Date();
        current.setFullYear(y, m - 1, d);
        if (!reminderAt) current.setHours(12, 0, 0, 0);
        setReminderAt(current.getTime());
    };

    const updateTime = (hStr: string | null, mStr: string | null) => {
        if (!reminderAt) return;
        const current = new Date(reminderAt);
        if (hStr !== null) current.setHours(parseInt(hStr, 10));
        if (mStr !== null) current.setMinutes(parseInt(mStr, 10));
        setReminderAt(current.getTime());
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                onClick={e => e.stopPropagation()}
                className={`w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${cardBg} ${cardBorder}`}
            >
                {/* Color bar */}
                <div className={`flex items-center gap-1.5 px-4 pt-4 pb-2`}>
                    {ALL_COLORS.map(c => (
                        <button
                            key={c}
                            title={COLOR_MAP[c].label}
                            onClick={() => setColor(c)}
                            className={`w-5 h-5 rounded-full transition-all ${COLOR_MAP[c].dot} ${color === c ? `ring-2 ring-offset-2 ${isDark ? 'ring-offset-[#1c1c1e]' : 'ring-offset-white'} ${COLOR_MAP[c].ring} scale-110` : 'opacity-50 hover:opacity-100 hover:scale-110'}`}
                        />
                    ))}
                    <div className="flex-1" />
                    <button
                        onClick={() => setIsPinned(p => !p)}
                        title={isPinned ? 'Unpin' : 'Pin'}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${isPinned ? 'text-amber-400' : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <PinIcon pinned={isPinned} />
                    </button>
                </div>

                {/* Title */}
                <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={labels.title}
                    className={`w-full px-4 py-2 text-lg font-bold bg-transparent border-none outline-none resize-none placeholder-opacity-30 ${isDark ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
                    style={{ backgroundColor: 'transparent' }} // Force transparency if global styles interfere
                />

                {/* Content */}
                <textarea
                    ref={contentRef}
                    value={content}
                    onChange={e => { setContent(e.target.value); autoResize(); }}
                    onInput={autoResize}
                    placeholder={labels.takNote}
                    rows={5}
                    className={`w-full px-4 py-2 pb-4 text-sm bg-transparent border-none outline-none resize-none min-h-[120px] max-h-[60vh] overflow-y-auto placeholder-opacity-30 ${isDark ? 'text-gray-200 placeholder-gray-600' : 'text-gray-700 placeholder-gray-300'}`}
                />

                {/* Reminder */}
                <div className="mx-4 mb-3">
                    {!showReminder ? (
                        <button
                            type="button"
                            onClick={() => setShowReminder(true)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                                reminderAt
                                    ? isDark
                                        ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                                        : 'bg-amber-50 border-amber-200 text-amber-600'
                                    : isDark
                                        ? 'bg-white/[0.03] border-white/[0.06] text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] hover:border-white/[0.10]'
                                        : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17H9m10.659-9.338A8 8 0 1 0 4.341 16.66M18 8V4m0 0l-2 2m2-2l2 2" />
                            </svg>
                            {reminderAt
                                ? new Date(reminderAt).toLocaleString(i18n.language === 'en' ? 'en-US' : i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                : t('addReminder', 'Eslatma qo\'shish')}
                        </button>
                    ) : (
                        <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-surface-2' : 'bg-slate-50'}`}>
                            {/* Header */}
                            <div className={`flex items-center justify-between px-4 py-3`}>
                                <div className="flex items-center gap-2">
                                    <svg className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17H9m10.659-9.338A8 8 0 1 0 4.341 16.66M18 8V4m0 0l-2 2m2-2l2 2" />
                                    </svg>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t('reminderTime', 'Eslatma vaqti')}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowReminder(false)}
                                    className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Quick picks */}
                            <div className="px-4 pt-3 pb-2">
                                <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{t('quickPick', 'Tezkor tanlash')}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { label: t('30mins', '30 daqiqa'), mins: 30 },
                                        { label: t('1hour', '1 soat'),    mins: 60 },
                                        { label: t('3hours', '3 soat'),    mins: 180 },
                                        { label: t('tomorrow', 'Ertaga'),    mins: 1440 },
                                    ].map(({ label, mins }) => {
                                        const ts = Date.now() + mins * 60_000;
                                        const active = reminderAt !== null && Math.abs((reminderAt ?? 0) - ts) < 60_000;
                                        return (
                                            <button
                                                key={label}
                                                type="button"
                                                onClick={() => setReminderAt(ts)}
                                                className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
                                                    active
                                                        ? 'bg-[#0f766e]/10 text-[#0f766e]'
                                                        : isDark
                                                            ? 'bg-white/[0.06] text-gray-400 hover:bg-white/[0.10] hover:text-white'
                                                            : 'bg-white shadow-sm text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Custom datetime */}
                            <div className="px-4 pb-4 pt-2">
                                <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{t('exactTime', 'Aniq vaqt')}</p>
                                <div className="flex items-center gap-2">
                                    <Popover.Root>
                                        <Popover.Trigger asChild>
                                            <button type="button" className={`flex-1 flex items-center justify-start gap-2.5 px-3.5 py-2.5 text-[13px] font-semibold rounded-xl border shadow-sm transition-all outline-none ${isDark ? 'bg-surface-3 border-white/[0.08] text-white hover:bg-white/[0.06] focus:ring-2 focus:ring-[#0f766e]/40' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 focus:ring-2 focus:ring-[#0f766e]/20'}`}>
                                                <svg className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {reminderAt ? format(new Date(reminderAt), 'PPP', { locale }) : t('selectDay', 'Kunni tanlang')}
                                            </button>
                                        </Popover.Trigger>
                                        <Popover.Portal>
                                            <Popover.Content
                                                align="start"
                                                sideOffset={8}
                                                className={`z-[60] p-3 rounded-2xl shadow-xl outline-none border ${isDark ? 'bg-[#1c1c1e] border-white/[0.08] text-white' : 'bg-white border-gray-100 text-gray-900'}`}
                                            >
                                                <style>
                                                    {`
                                                    .rdp-root {
                                                        --rdp-accent-color: #0f766e;
                                                        --rdp-background-color: ${isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'};
                                                        margin: 0;
                                                    }
                                                    .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
                                                        color: white;
                                                        background-color: #0f766e;
                                                    }
                                                    .rdp-day_today:not(.rdp-day_selected) {
                                                        font-weight: bold;
                                                        color: #0f766e;
                                                        background-color: ${isDark ? 'rgba(15, 118, 110, 0.15)' : 'rgba(15, 118, 110, 0.1)'};
                                                        border: 2px solid ${isDark ? 'rgba(15, 118, 110, 0.5)' : 'rgba(15, 118, 110, 0.3)'};
                                                        border-radius: 100%;
                                                    }
                                                    `}
                                                </style>
                                                <DayPicker
                                                    locale={locale}
                                                    mode="single"
                                                    selected={reminderAt ? new Date(reminderAt) : undefined}
                                                    onSelect={(date) => {
                                                        if (!date) return;
                                                        const d = new Date(date);
                                                        if (reminderAt) {
                                                            const current = new Date(reminderAt);
                                                            d.setHours(current.getHours(), current.getMinutes(), 0, 0);
                                                        } else {
                                                            const now = new Date();
                                                            let h = now.getHours();
                                                            let m = Math.ceil(now.getMinutes() / 5) * 5;
                                                            if (m === 60) { m = 0; h += 1; }
                                                            d.setHours(h, m, 0, 0);
                                                        }
                                                        setReminderAt(d.getTime());
                                                    }}
                                                />
                                            </Popover.Content>
                                        </Popover.Portal>
                                    </Popover.Root>

                                    <Popover.Root>
                                        <Popover.Trigger asChild>
                                            <button 
                                                type="button" 
                                                disabled={!reminderAt}
                                                className={`relative w-[110px] flex items-center justify-start gap-2.5 px-3.5 py-2.5 text-[13px] font-semibold rounded-xl border shadow-sm transition-all outline-none disabled:opacity-50 ${isDark ? 'bg-surface-3 border-white/[0.08] text-white hover:bg-white/[0.06] focus:ring-2 focus:ring-[#0f766e]/40' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 focus:ring-2 focus:ring-[#0f766e]/20'}`}
                                            >
                                                <svg className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {reminderAt ? timeStr : '--:--'}
                                            </button>
                                        </Popover.Trigger>
                                        <Popover.Portal>
                                            <Popover.Content
                                                align="center"
                                                sideOffset={8}
                                                className={`z-[60] flex p-1.5 rounded-2xl shadow-xl outline-none border ${isDark ? 'bg-[#1c1c1e] border-white/[0.08] text-white' : 'bg-white border-gray-100 text-gray-900'}`}
                                            >
                                                <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
                                                <div className="flex h-56">
                                                    <div className="overflow-y-auto px-1 no-scrollbar border-r border-gray-100 dark:border-white/[0.08]">
                                                        <div className={`text-[10px] font-bold text-center mb-1 text-gray-400 sticky top-0 py-1 z-10 ${isDark ? 'bg-[#1c1c1e]' : 'bg-white'}`}>{t('hourUpper', 'SOAT')}</div>
                                                        {Array.from({ length: 24 }, (_, i) => pad(i)).map(h => {
                                                            const isActive = timeStr.split(':')[0] === h;
                                                            return (
                                                                <button 
                                                                    key={h} 
                                                                    ref={isActive ? (el) => el && setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'instant' }), 10) : null}
                                                                    type="button" 
                                                                    onClick={() => updateTime(h, null)} 
                                                                    className={`w-12 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all mb-0.5 ${isActive ? 'bg-[#0f766e] text-white shadow-sm' : isDark ? 'hover:bg-white/[0.06] text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                                                                >
                                                                    {h}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="overflow-y-auto px-1 no-scrollbar">
                                                        <div className={`text-[10px] font-bold text-center mb-1 text-gray-400 sticky top-0 py-1 z-10 ${isDark ? 'bg-[#1c1c1e]' : 'bg-white'}`}>{t('minuteUpper', 'DAQIQA')}</div>
                                                        {Array.from({ length: 12 }, (_, i) => pad(i * 5)).map(m => {
                                                            const isActive = timeStr.split(':')[1] === m;
                                                            return (
                                                                <button 
                                                                    key={m} 
                                                                    ref={isActive ? (el) => el && setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'instant' }), 10) : null}
                                                                    type="button" 
                                                                    onClick={() => updateTime(null, m)} 
                                                                    className={`w-12 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all mb-0.5 ${isActive ? 'bg-[#0f766e] text-white shadow-sm' : isDark ? 'hover:bg-white/[0.06] text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                                                                >
                                                                    {m}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </Popover.Content>
                                        </Popover.Portal>
                                    </Popover.Root>

                                    {reminderAt && (
                                        <button
                                            type="button"
                                            onClick={() => setReminderAt(null)}
                                            className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                                            title="Bekor qilish"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Save error */}
                {saveError && (
                    <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs">
                        ⚠ {saveError}
                    </div>
                )}

                {/* Footer */}
                <div className={`flex items-center justify-between px-4 py-3 border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <div className="flex gap-2">
                        {onDelete && !confirmDel && (
                            <button
                                onClick={() => setConfirmDel(true)}
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${isDark ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                            >
                                {labels.delete}
                            </button>
                        )}
                        {confirmDel && (
                            <>
                                <button onClick={() => setConfirmDel(false)} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${isDark ? 'text-gray-400 hover:bg-white/[0.06]' : 'text-gray-500 hover:bg-gray-100'}`}>
                                    {labels.cancel}
                                </button>
                                <button onClick={onDelete} disabled={isSaving} className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50">
                                    {isSaving ? '...' : labels.confirmDelete}
                                </button>
                            </>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${isDark ? 'text-gray-400 hover:bg-white/[0.06]' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            {labels.cancel}
                        </button>
                        <button
                            onClick={() => { if (hasContent) onSave({ title, content, color, isPinned, reminderAt }); else onClose(); }}
                            disabled={isSaving}
                            className="text-xs px-4 py-1.5 rounded-lg font-bold bg-[#0f766e] text-white hover:bg-teal-600 transition-all active:scale-95 disabled:opacity-50 min-w-[50px]"
                        >
                            {isSaving ? '...' : labels.save}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Pin Icon ─────────────────────────────────────────────────────────────────

const PinIcon = ({ pinned, className }: { pinned?: boolean; className?: string }) => (
    <svg className={`w-4 h-4 ${className ?? ''}`} viewBox="0 0 24 24" fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L9 9H2l5.5 4.5L5 21l7-4.5L19 21l-2.5-7.5L22 9h-7z" />
    </svg>
);

const BellOutlineIcon = ({ className }: { className?: string }) => (
    <svg className={className ?? ''} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17H9m10.659-9.338A8 8 0 1 0 4.341 16.66M18 8V4m0 0l-2 2m2-2l2 2" />
    </svg>
);

const ClockOutlineIcon = ({ className }: { className?: string }) => (
    <svg className={className ?? ''} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <circle cx="12" cy="12" r="9.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
    </svg>
);

// ─── Note Card ────────────────────────────────────────────────────────────────

interface NoteCardProps {
    note: Note;
    theme: 'light' | 'dark';
    onClick: () => void;
    onTogglePin: () => void;
    onDismissReminder: () => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, theme, onClick, onTogglePin, onDismissReminder }) => {
    const isDark = theme === 'dark';
    const colorCfg = COLOR_MAP[note.color];
    const isDue = note.reminderAt && note.reminderAt <= Date.now();
    
    const bg = isDark ? 'bg-surface hover:bg-surface-2' : 'bg-white hover:bg-gray-50';
    
    const borderBase = isDark ? 'border-white/[0.08]' : 'border-gray-200';
    const borderDue = isDue ? 'border-l-[4px] border-l-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.1)]' : '';

    return (
        <div
            onClick={onClick}
            className={`group relative rounded-2xl border p-4 cursor-pointer transition-all duration-200 hover:shadow-md flex flex-col ${bg} ${borderBase} ${borderDue}`}
        >
            <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className={`font-semibold text-lg leading-snug line-clamp-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {note.title || 'Untitled'}
                </h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Pin badge */}
                    {note.isPinned && (
                        <div className="text-amber-400">
                            <PinIcon pinned />
                        </div>
                    )}
                    {/* Color dot */}
                    {note.color !== 'default' && (
                        <div className={`w-3 h-3 rounded-full ${colorCfg.dot}`} />
                    )}
                    {/* Overdue Action Checkbox */}
                    {isDue && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDismissReminder(); }}
                            className="group/check flex items-center justify-center w-6 h-6 rounded-full transition-colors ml-1"
                            title="O'qildi (Eslatmani o'chirish)"
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isDark ? 'border-gray-500 group-hover/check:border-red-400 group-hover/check:bg-red-500/20' : 'border-gray-300 group-hover/check:border-red-500 group-hover/check:bg-red-50'}`}>
                                <svg className="w-3 h-3 text-red-500 opacity-0 group-hover/check:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </button>
                    )}
                </div>
            </div>

            {/* Content preview */}
            {note.content && (
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                    {note.content}
                </p>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center mt-auto w-full pt-4">
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {timeAgo(note.updatedMs)}
                </span>
                
                <div className="flex items-center gap-2">
                    {note.reminderAt && (
                        <span 
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                                isDue 
                                    ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.2)] dark:shadow-[inset_0_0_0_1px_rgba(239,68,68,0.1)]' 
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.2)] dark:shadow-[inset_0_0_0_1px_rgba(251,191,36,0.1)]'
                            }`} 
                            title={`Eslatma: ${new Date(note.reminderAt).toLocaleString()}`}
                        >
                            {isDue ? (
                                <>
                                    <BellOutlineIcon className="w-3.5 h-3.5 animate-bounce origin-bottom opacity-80" />
                                    <span className="uppercase tracking-wider">Vaqti keldi</span>
                                </>
                            ) : (
                                <>
                                    <ClockOutlineIcon className="w-3.5 h-3.5 opacity-80" />
                                    {(() => {
                                        const d = new Date(note.reminderAt as number);
                                        const now = new Date();
                                        const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                        const tomorrow = new Date(now);
                                        tomorrow.setDate(tomorrow.getDate() + 1);
                                        const isTomorrow = d.getDate() === tomorrow.getDate() && d.getMonth() === tomorrow.getMonth() && d.getFullYear() === tomorrow.getFullYear();
                                        const time = format(d, 'HH:mm');
                                        if (isToday) return time;
                                        if (isTomorrow) return `Ertaga ${time}`;
                                        return format(d, 'd MMM HH:mm', { locale: uz });
                                    })()}
                                </>
                            )}
                        </span>
                    )}
                    <button
                        onClick={e => { e.stopPropagation(); onTogglePin(); }}
                        className={`w-7 h-7 flex items-center justify-center flex-shrink-0 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                            note.isPinned
                                ? 'text-amber-400 hover:bg-amber-400/10'
                                : isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.08]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                        title={note.isPinned ? 'Unpin' : 'Pin'}
                    >
                        <PinIcon pinned={note.isPinned} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────

const SkeletonCard = ({ theme }: { theme: 'light' | 'dark' }) => (
    <div className={`rounded-2xl border p-4 h-[140px] ${theme === 'dark' ? 'bg-surface border-white/[0.06]' : 'bg-white border-gray-200'}`}>
        <div className={`h-5 w-3/4 rounded-lg mb-3 animate-pulse ${theme === 'dark' ? 'bg-surface-2' : 'bg-gray-200'}`} />
        <div className={`h-3 w-full rounded-lg mb-2 animate-pulse ${theme === 'dark' ? 'bg-surface-2' : 'bg-gray-100'}`} />
        <div className={`h-3 w-5/6 rounded-lg mb-2 animate-pulse ${theme === 'dark' ? 'bg-surface-2' : 'bg-gray-100'}`} />
        <div className={`h-3 w-2/3 rounded-lg animate-pulse ${theme === 'dark' ? 'bg-surface-2' : 'bg-gray-100'}`} />
    </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const NotesPage: React.FC<NotesPageProps> = ({ theme, fleetId, initialNotes, initialLoading, initialTableError }) => {
    const { t } = useTranslation();
    const { adminUser } = useAuth();

    // Use props from App root if available — avoids duplicate Supabase realtime subscription
    const internalHook = useNotes(initialNotes !== undefined ? undefined : fleetId);
    const remoteNotes  = initialNotes    !== undefined ? initialNotes    : internalHook.notes;
    const loading      = initialLoading  !== undefined ? initialLoading  : internalHook.loading;
    const tableError   = initialTableError !== undefined ? initialTableError : internalHook.tableError;

    // Optimistic local state — UI updates instantly, syncs with DB in background
    const [localNotes, setLocalNotes] = useState<Note[]>([]);
    const [search, setSearch] = useState('');
    const [filterColor, setFilterColor] = useState<NoteColor | 'all'>('all');
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const isDark = theme === 'dark';

    // Sync remote notes into local state whenever they update
    useEffect(() => {
        setLocalNotes(remoteNotes);
    }, [remoteNotes]);

    const notes = localNotes;


    const filtered = useMemo(() => {
        let list = notes;
        if (filterColor !== 'all') list = list.filter(n => n.color === filterColor);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
        }
        return list;
    }, [notes, search, filterColor]);

    const sortNotes = (list: Note[]) => {
        const now = Date.now();
        return [...list].sort((a, b) => {
            const aDue = a.reminderAt && a.reminderAt <= now ? 1 : 0;
            const bDue = b.reminderAt && b.reminderAt <= now ? 1 : 0;
            if (aDue !== bDue) return bDue - aDue; // Due notes first (1 before 0)
            return b.updatedMs - a.updatedMs; // Then by most recently updated
        });
    };

    const pinned   = useMemo(() => sortNotes(filtered.filter(n => n.isPinned)), [filtered]);
    const unpinned = useMemo(() => sortNotes(filtered.filter(n => !n.isPinned)), [filtered]);

    const openNew = () => {
        setEditingNote(null);
        setSaveError(null);
        setShowEditor(true);
    };

    const openEdit = (note: Note) => {
        setEditingNote(note);
        setSaveError(null);
        setShowEditor(true);
    };

    const handleSave = async (data: { title: string; content: string; color: NoteColor; isPinned: boolean; reminderAt?: number | null }) => {
        if (!fleetId) return;
        setSaveError(null);
        setIsSaving(true);
        const now = Date.now();

        try {
            if (editingNote) {
                // Optimistic update
                const updated: Note = { ...editingNote, ...data, updatedMs: now };
                setLocalNotes(prev => prev.map(n => n.id === editingNote.id ? updated : n).sort((a, b) => {
                    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                    return b.updatedMs - a.updatedMs;
                }));
                setShowEditor(false);
                // Persist in background
                await updateNote(editingNote.id, { ...data, updatedMs: now });
            } else {
                // Optimistic add with temp id
                const tempId = `temp_${Date.now()}`;
                const newNote: Note = { id: tempId, fleetId, ...data, createdMs: now, updatedMs: now };
                setLocalNotes(prev => {
                    const withNew = [newNote, ...prev];
                    return withNew.sort((a, b) => {
                        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                        return b.updatedMs - a.updatedMs;
                    });
                });
                setShowEditor(false);
                // Persist and replace temp id
                const realId = await addNote({ fleetId, ...data, createdMs: now, updatedMs: now });
                setLocalNotes(prev => prev.map(n => n.id === tempId ? { ...n, id: realId } : n));
            }
        } catch (err: any) {
            // Rollback on error
            setLocalNotes(remoteNotes);
            setSaveError(err?.message || 'Failed to save note');
            setShowEditor(true);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingNote) return;
        setIsSaving(true);
        const noteToDelete = editingNote;

        // Optimistic remove
        setLocalNotes(prev => prev.filter(n => n.id !== noteToDelete.id));
        setShowEditor(false);

        try {
            await deleteNote(noteToDelete.id);
        } catch (err: any) {
            // Rollback on error
            setLocalNotes(remoteNotes);
            setEditingNote(noteToDelete);
            setSaveError(err?.message || 'Failed to delete note');
            setShowEditor(true);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTogglePin = async (note: Note) => {
        const updated = { ...note, isPinned: !note.isPinned, updatedMs: Date.now() };
        // Optimistic update
        setLocalNotes(prev => prev.map(n => n.id === note.id ? updated : n).sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return b.updatedMs - a.updatedMs;
        }));
        try {
            await updateNote(note.id, { isPinned: updated.isPinned });
        } catch {
            setLocalNotes(remoteNotes); // rollback
        }
    };

    const handleDismissReminder = async (note: Note) => {
        const updated = { ...note, reminderAt: null, updatedMs: Date.now() };
        // Optimistic update
        setLocalNotes(prev => prev.map(n => n.id === note.id ? updated : n));
        try {
            await updateNote(note.id, { reminderAt: null });
        } catch {
            setLocalNotes(remoteNotes); // rollback
        }
    };

    const usedColors = useMemo(() => {
        const set = new Set(notes.map(n => n.color));
        return ALL_COLORS.filter(c => set.has(c));
    }, [notes]);

    return (
        <div className={`min-h-screen px-4 py-6 md:px-8 md:py-8 ${isDark ? 'bg-[#0b1326]' : 'bg-surface-2'}`}>
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header & Unified Control Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-[22px] font-bold tracking-tight ${isDark ? 'text-white' : 'text-black'}`}>
                            {t('notes')}
                        </h1>
                        {!loading && (
                            <p className={`text-[13px] mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {notes.length} note{notes.length !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        {/* Search */}
                        <div className="relative w-full sm:w-64 flex-shrink-0">
                            <div className={`absolute inset-y-0 left-3 flex items-center pointer-events-none ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                </svg>
                            </div>
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={t('searchNotes')}
                                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[#0f766e]/30 transition-all ${
                                    isDark
                                        ? 'bg-surface border-white/[0.10] text-white placeholder-gray-600'
                                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                                }`}
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className={`absolute inset-y-0 right-3 flex items-center ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>

                        {/* Color Filters */}
                        {usedColors.length > 1 && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={() => setFilterColor('all')}
                                    className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
                                        filterColor === 'all'
                                            ? isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'
                                            : isDark ? 'bg-surface border border-white/[0.10] text-gray-400 hover:text-white' : 'bg-gray-100 border border-gray-200 text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {t('all') || 'All'}
                                </button>
                                {usedColors.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setFilterColor(filterColor === c ? 'all' : c)}
                                        title={COLOR_MAP[c].label}
                                        className={`w-5 h-5 rounded-full transition-all ${COLOR_MAP[c].dot} ${
                                            filterColor === c
                                                ? `outline outline-2 outline-offset-2 outline-[#0f766e] scale-110`
                                                : `opacity-50 hover:opacity-100 hover:scale-110`
                                        }`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* New Note Button */}
                        <button
                            onClick={openNew}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0f766e] hover:bg-[#0a5c56] text-white rounded-xl font-semibold text-sm transition-all active:scale-95"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                            {t('newNote')}
                        </button>
                    </div>
                </div>

                {/* Table not set up yet */}
                {tableError && <SqlSetupBanner isDark={isDark} />}

                {/* Loading state */}
                {loading && !tableError && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonCard key={i} theme={theme} />
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loading && notes.length === 0 && !tableError && (
                    <div className={`flex flex-col items-center justify-center py-24 rounded-2xl ${isDark ? 'bg-surface' : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.07)]'}`}>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}>
                            <svg className={`w-8 h-8 ${isDark ? 'text-[rgba(235,235,245,0.3)]' : 'text-[rgba(60,60,67,0.3)]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                            </svg>
                        </div>
                        <p className={`text-[15px] font-semibold mb-1 ${isDark ? 'text-[rgba(235,235,245,0.6)]' : 'text-[rgba(60,60,67,0.6)]'}`}>{t('noNotesYet')}</p>
                        <p className={`text-[13px] mb-5 ${isDark ? 'text-[rgba(235,235,245,0.3)]' : 'text-[rgba(60,60,67,0.4)]'}`}>{t('noNotesDescription')}</p>
                        <button
                            onClick={openNew}
                            className="px-5 py-2.5 bg-[#0f766e] text-white rounded-xl text-[15px] font-semibold hover:bg-[#0a5c56] transition-all active:scale-95"
                        >
                            + {t('newNote')}
                        </button>
                    </div>
                )}

                {/* No search results */}
                {!loading && notes.length > 0 && filtered.length === 0 && (
                    <div className={`flex flex-col items-center justify-center py-16 rounded-2xl ${isDark ? 'bg-surface' : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.07)]'}`}>
                        <p className={`text-[15px] font-semibold ${isDark ? 'text-[rgba(235,235,245,0.5)]' : 'text-[rgba(60,60,67,0.5)]'}`}>{t('noRecordsFound')}</p>
                    </div>
                )}

                {/* Pinned section */}
                {!loading && pinned.length > 0 && (
                    <section>
                        <p className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-[rgba(235,235,245,0.3)]' : 'text-[rgba(60,60,67,0.4)]'}`}>
                            📌 {t('pinnedSection')}
                        </p>
                        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 [&>*]:mb-6 [&>*]:break-inside-avoid">
                            {pinned.map(note => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    theme={theme}
                                    onClick={() => openEdit(note)}
                                    onTogglePin={() => handleTogglePin(note)}
                                    onDismissReminder={() => handleDismissReminder(note)}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Other notes */}
                {!loading && unpinned.length > 0 && (
                    <section>
                        {pinned.length > 0 && (
                            <p className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-[rgba(235,235,245,0.3)]' : 'text-[rgba(60,60,67,0.4)]'}`}>
                                {t('othersSection')}
                            </p>
                        )}
                        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 [&>*]:mb-6 [&>*]:break-inside-avoid">
                            {unpinned.map(note => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    theme={theme}
                                    onClick={() => openEdit(note)}
                                    onTogglePin={() => handleTogglePin(note)}
                                    onDismissReminder={() => handleDismissReminder(note)}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Editor modal */}
            {showEditor && (
                <NoteEditor
                    note={editingNote}
                    theme={theme}
                    saveError={saveError}
                    isSaving={isSaving}
                    labels={{
                        title: t('title') || 'Title',
                        takNote: t('takeNote') || 'Take a note…',
                        delete: t('deleteNote'),
                        confirmDelete: t('confirmDelete'),
                        cancel: t('cancel'),
                        save: t('save'),
                    }}
                    onSave={handleSave}
                    onDelete={editingNote ? handleDelete : undefined}
                    onClose={() => { setShowEditor(false); setSaveError(null); }}
                />
            )}
        </div>
    );
};

export default NotesPage;
