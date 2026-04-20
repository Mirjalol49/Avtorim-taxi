import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Note, NoteColor } from '../../core/types/note.types';
import { addNote, updateNote, deleteNote } from '../../../services/notesService';
import { useNotes } from './hooks/useNotes';

interface NotesPageProps {
    theme: 'light' | 'dark';
    fleetId?: string;
}

// ─── SQL Setup Banner ─────────────────────────────────────────────────────────

const SQL = `-- Step 1: create table
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid,
  title text not null default '',
  content text not null default '',
  color text not null default 'default',
  is_pinned boolean not null default false,
  created_ms bigint not null,
  updated_ms bigint not null
);
create index if not exists notes_fleet_id_idx on notes (fleet_id);

-- Step 2: grant access (required for anon key)
grant all on table notes to anon;
grant all on table notes to authenticated;

-- Step 3: enable RLS with open policy
alter table notes enable row level security;
drop policy if exists "notes_open" on notes;
create policy "notes_open" on notes using (true) with check (true);

-- Step 4: enable realtime
alter publication supabase_realtime add table notes;`;

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

const COLOR_MAP: Record<NoteColor, { bg: string; border: string; dot: string; label: string }> = {
    default: { bg: '', border: '', dot: 'bg-gray-400', label: 'Default' },
    red:     { bg: 'bg-red-500/10',    border: 'border-red-500/30',    dot: 'bg-red-400',    label: 'Red' },
    orange:  { bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400', label: 'Orange' },
    yellow:  { bg: 'bg-yellow-500/10', border: 'border-yellow-400/30', dot: 'bg-yellow-400', label: 'Yellow' },
    green:   { bg: 'bg-green-500/10',  border: 'border-green-500/30',  dot: 'bg-green-400',  label: 'Green' },
    teal:    { bg: 'bg-teal-500/10',   border: 'border-teal-500/30',   dot: 'bg-teal-400',   label: 'Teal' },
    blue:    { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   dot: 'bg-blue-400',   label: 'Blue' },
    purple:  { bg: 'bg-purple-500/10', border: 'border-purple-500/30', dot: 'bg-purple-400', label: 'Purple' },
    pink:    { bg: 'bg-pink-500/10',   border: 'border-pink-500/30',   dot: 'bg-pink-400',   label: 'Pink' },
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
    return new Date(ms).toLocaleDateString();
}

// ─── Note Editor Modal ────────────────────────────────────────────────────────

interface EditorProps {
    note?: Note | null;
    theme: 'light' | 'dark';
    saveError?: string | null;
    labels: { title: string; takNote: string; delete: string; confirmDelete: string; cancel: string; save: string; };
    onSave: (data: { title: string; content: string; color: NoteColor; isPinned: boolean }) => void;
    onDelete?: () => void;
    onClose: () => void;
}

const NoteEditor: React.FC<EditorProps> = ({ note, theme, saveError, labels, onSave, onDelete, onClose }) => {
    const [title, setTitle]       = useState(note?.title ?? '');
    const [content, setContent]   = useState(note?.content ?? '');
    const [color, setColor]       = useState<NoteColor>(note?.color ?? 'default');
    const [isPinned, setIsPinned] = useState(note?.isPinned ?? false);
    const [confirmDel, setConfirmDel] = useState(false);
    const contentRef = useRef<HTMLTextAreaElement>(null);
    const isDark = theme === 'dark';

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

    const colorCfg = COLOR_MAP[color];
    const cardBg = isDark
        ? color === 'default' ? 'bg-[#1F2937]' : colorCfg.bg
        : color === 'default' ? 'bg-white' : colorCfg.bg;
    const cardBorder = isDark
        ? color === 'default' ? 'border-gray-700' : colorCfg.border
        : color === 'default' ? 'border-gray-200' : colorCfg.border;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                onClick={e => e.stopPropagation()}
                className={`w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-colors ${cardBg} ${cardBorder}`}
            >
                {/* Color bar */}
                <div className={`flex items-center gap-1.5 px-4 pt-4 pb-2`}>
                    {ALL_COLORS.map(c => (
                        <button
                            key={c}
                            title={COLOR_MAP[c].label}
                            onClick={() => setColor(c)}
                            className={`w-5 h-5 rounded-full transition-all ${COLOR_MAP[c].dot} ${color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110' : 'opacity-60 hover:opacity-100 hover:scale-110'}`}
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
                    className={`w-full px-4 py-2 text-lg font-bold bg-transparent border-none outline-none resize-none placeholder-opacity-30 ${isDark ? 'text-white placeholder-gray-600' : 'text-gray-900 placeholder-gray-300'}`}
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

                {/* Save error */}
                {saveError && (
                    <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs">
                        ⚠ {saveError}
                    </div>
                )}

                {/* Footer */}
                <div className={`flex items-center justify-between px-4 py-3 border-t ${isDark ? 'border-gray-700/50' : 'border-gray-100'}`}>
                    <div className="flex gap-2">
                        {onDelete && !confirmDel && (
                            <button
                                onClick={() => setConfirmDel(true)}
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
                            >
                                {labels.delete}
                            </button>
                        )}
                        {confirmDel && (
                            <>
                                <button onClick={() => setConfirmDel(false)} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                                    {labels.cancel}
                                </button>
                                <button onClick={onDelete} className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-all">
                                    {labels.confirmDelete}
                                </button>
                            </>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            {labels.cancel}
                        </button>
                        <button
                            onClick={() => { if (hasContent) onSave({ title, content, color, isPinned }); else onClose(); }}
                            className="text-xs px-4 py-1.5 rounded-lg font-bold bg-[#0f766e] text-white hover:bg-teal-600 transition-all active:scale-95"
                        >
                            {labels.save}
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

// ─── Note Card ────────────────────────────────────────────────────────────────

interface NoteCardProps {
    note: Note;
    theme: 'light' | 'dark';
    onClick: () => void;
    onTogglePin: () => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, theme, onClick, onTogglePin }) => {
    const isDark = theme === 'dark';
    const colorCfg = COLOR_MAP[note.color];
    const bg = isDark
        ? note.color === 'default' ? 'bg-[#1F2937] hover:bg-[#263244]' : `${colorCfg.bg} hover:brightness-110`
        : note.color === 'default' ? 'bg-white hover:bg-gray-50' : `${colorCfg.bg} hover:brightness-105`;
    const border = isDark
        ? note.color === 'default' ? 'border-gray-700/60' : colorCfg.border
        : note.color === 'default' ? 'border-gray-200' : colorCfg.border;

    return (
        <div
            onClick={onClick}
            className={`group relative rounded-2xl border p-4 cursor-pointer transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5 ${bg} ${border}`}
        >
            {/* Pin badge */}
            {note.isPinned && (
                <div className="absolute top-3 right-3 text-amber-400 opacity-70 group-hover:opacity-100 transition-opacity">
                    <PinIcon pinned />
                </div>
            )}

            {/* Title */}
            {note.title && (
                <h3 className={`font-bold text-sm mb-1 pr-5 leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {note.title}
                </h3>
            )}

            {/* Content preview */}
            {note.content && (
                <p className={`text-xs leading-relaxed line-clamp-6 whitespace-pre-wrap ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {note.content}
                </p>
            )}

            {/* Footer */}
            <div className={`flex items-center justify-between mt-3 pt-2 border-t ${isDark ? 'border-gray-700/50' : 'border-gray-100'}`}>
                <span className={`text-[10px] font-medium ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                    {timeAgo(note.updatedMs)}
                </span>
                <button
                    onClick={e => { e.stopPropagation(); onTogglePin(); }}
                    className={`w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                        note.isPinned
                            ? 'text-amber-400'
                            : isDark ? 'text-gray-600 hover:text-gray-300' : 'text-gray-300 hover:text-gray-600'
                    }`}
                    title={note.isPinned ? 'Unpin' : 'Pin'}
                >
                    <PinIcon pinned={note.isPinned} />
                </button>
            </div>
        </div>
    );
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────

const SkeletonCard = ({ theme }: { theme: 'light' | 'dark' }) => (
    <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'bg-[#1F2937] border-gray-700/60' : 'bg-white border-gray-200'}`}>
        <div className={`h-4 w-3/4 rounded-lg mb-2 animate-pulse ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
        <div className={`h-3 w-full rounded-lg mb-1 animate-pulse ${theme === 'dark' ? 'bg-gray-700/70' : 'bg-gray-100'}`} />
        <div className={`h-3 w-5/6 rounded-lg mb-1 animate-pulse ${theme === 'dark' ? 'bg-gray-700/70' : 'bg-gray-100'}`} />
        <div className={`h-3 w-2/3 rounded-lg animate-pulse ${theme === 'dark' ? 'bg-gray-700/70' : 'bg-gray-100'}`} />
    </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const NotesPage: React.FC<NotesPageProps> = ({ theme, fleetId }) => {
    const { t } = useTranslation();
    const { notes, loading, tableError } = useNotes(fleetId);
    const [search, setSearch] = useState('');
    const [filterColor, setFilterColor] = useState<NoteColor | 'all'>('all');
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const isDark = theme === 'dark';

    const filtered = useMemo(() => {
        let list = notes;
        if (filterColor !== 'all') list = list.filter(n => n.color === filterColor);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
        }
        return list;
    }, [notes, search, filterColor]);

    const pinned   = filtered.filter(n => n.isPinned);
    const unpinned = filtered.filter(n => !n.isPinned);

    const openNew = () => {
        setEditingNote(null);
        setShowEditor(true);
    };

    const openEdit = (note: Note) => {
        setEditingNote(note);
        setShowEditor(true);
    };

    const handleSave = async (data: { title: string; content: string; color: NoteColor; isPinned: boolean }) => {
        if (!fleetId) return;
        setSaveError(null);
        const now = Date.now();
        try {
            if (editingNote) {
                await updateNote((editingNote as Note).id, { ...data, updatedMs: now });
            } else {
                await addNote({ fleetId, ...data, createdMs: now, updatedMs: now });
            }
            setShowEditor(false);
        } catch (err: any) {
            setSaveError(err?.message || 'Failed to save note');
        }
    };

    const handleDelete = async () => {
        if (!editingNote) return;
        try {
            await deleteNote((editingNote as Note).id);
            setShowEditor(false);
        } catch (err: any) {
            setSaveError(err?.message || 'Failed to delete note');
        }
    };

    const handleTogglePin = async (note: Note) => {
        await updateNote(note.id, { isPinned: !note.isPinned });
    };

    const usedColors = useMemo(() => {
        const set = new Set(notes.map(n => n.color));
        return ALL_COLORS.filter(c => set.has(c));
    }, [notes]);

    return (
        <div className={`min-h-screen px-4 py-6 md:px-8 md:py-8 ${isDark ? 'bg-[#111827]' : 'bg-[#F3F4F6]'}`}>
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {t('notes')}
                        </h1>
                        {!loading && (
                            <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                {notes.length} note{notes.length !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={openNew}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#0f766e] hover:bg-teal-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-900/20 transition-all active:scale-95"
                    >
                        <span className="text-lg leading-none">+</span> {t('newNote')}
                    </button>
                </div>

                {/* Search + Color filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className={`relative flex-1 group`}>
                        <div className={`absolute inset-y-0 left-3 flex items-center pointer-events-none ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                            </svg>
                        </div>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('searchNotes')}
                            className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[#0f766e]/40 transition-all ${
                                isDark
                                    ? 'bg-[#1F2937] border-gray-700 text-white placeholder-gray-600'
                                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                            }`}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className={`absolute inset-y-0 right-3 flex items-center ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>

                    {/* Color filter pills */}
                    {usedColors.length > 1 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                                onClick={() => setFilterColor('all')}
                                className={`text-xs px-3 py-2 rounded-xl font-semibold border transition-all ${
                                    filterColor === 'all'
                                        ? 'bg-[#0f766e] text-white border-transparent'
                                        : isDark ? 'bg-[#1F2937] border-gray-700 text-gray-400 hover:text-white' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                {t('all') || 'All'}
                            </button>
                            {usedColors.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setFilterColor(filterColor === c ? 'all' : c)}
                                    title={COLOR_MAP[c].label}
                                    className={`w-8 h-8 rounded-xl border transition-all ${
                                        filterColor === c
                                            ? `${COLOR_MAP[c].dot} border-transparent ring-2 ring-white/30 scale-110`
                                            : `${COLOR_MAP[c].dot} opacity-50 hover:opacity-90 ${isDark ? 'border-gray-700' : 'border-gray-200'}`
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Table not set up yet */}
                {tableError && <SqlSetupBanner isDark={isDark} />}

                {/* Loading state */}
                {loading && !tableError && (
                    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-0">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="break-inside-avoid mb-4">
                                <SkeletonCard theme={theme} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loading && notes.length === 0 && (
                    <div className={`flex flex-col items-center justify-center py-24 rounded-2xl border ${isDark ? 'bg-[#1F2937]/50 border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                            <svg className={`w-8 h-8 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                            </svg>
                        </div>
                        <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('noNotesYet')}</p>
                        <p className={`text-xs mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{t('noNotesDescription')}</p>
                        <button
                            onClick={openNew}
                            className="px-4 py-2 bg-[#0f766e] text-white rounded-xl text-sm font-bold hover:bg-teal-600 transition-all active:scale-95"
                        >
                            + {t('newNote')}
                        </button>
                    </div>
                )}

                {/* No search results */}
                {!loading && notes.length > 0 && filtered.length === 0 && (
                    <div className={`flex flex-col items-center justify-center py-16 rounded-2xl border ${isDark ? 'bg-[#1F2937]/50 border-gray-800' : 'bg-white border-gray-200'}`}>
                        <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('noRecordsFound')}</p>
                    </div>
                )}

                {/* Pinned section */}
                {!loading && pinned.length > 0 && (
                    <section>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            📌 {t('pinnedSection')}
                        </p>
                        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
                            {pinned.map(note => (
                                <div key={note.id} className="break-inside-avoid mb-4">
                                    <NoteCard
                                        note={note}
                                        theme={theme}
                                        onClick={() => openEdit(note)}
                                        onTogglePin={() => handleTogglePin(note)}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Other notes */}
                {!loading && unpinned.length > 0 && (
                    <section>
                        {pinned.length > 0 && (
                            <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {t('othersSection')}
                            </p>
                        )}
                        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
                            {unpinned.map(note => (
                                <div key={note.id} className="break-inside-avoid mb-4">
                                    <NoteCard
                                        note={note}
                                        theme={theme}
                                        onClick={() => openEdit(note)}
                                        onTogglePin={() => handleTogglePin(note)}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Editor modal */}
            {showEditor && (
                <NoteEditor
                    note={editingNote as Note | null}
                    theme={theme}
                    saveError={saveError}
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
