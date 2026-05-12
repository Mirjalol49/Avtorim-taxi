/**
 * NoteReminderAlert
 *
 * Listens for 'noteReminderFired' events dispatched by useNoteReminders
 * and shows a premium in-app floating alert banner at the top-right of the screen.
 *
 * Mount this once at the app root level so it works across all pages.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Note } from '../src/core/types/note.types';
import { NoteReminderFiredDetail } from '../hooks/useNoteReminders';

interface ReminderAlert {
    id: string;
    note: Note;
    firedAt: number;
}

interface NoteReminderAlertProps {
    theme: 'light' | 'dark';
    onNoteClick?: (note: Note) => void;
}

const AUTO_DISMISS_MS = 12_000;

const NoteReminderAlert: React.FC<NoteReminderAlertProps> = ({ theme, onNoteClick }) => {
    const [alerts, setAlerts] = useState<ReminderAlert[]>([]);
    const isDark = theme === 'dark';

    const dismiss = useCallback((id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    }, []);

    useEffect(() => {
        const handler = (e: Event) => {
            const { note } = (e as CustomEvent<NoteReminderFiredDetail>).detail;
            const id = `${note.id}-${Date.now()}`;
            setAlerts(prev => [{ id, note, firedAt: Date.now() }, ...prev].slice(0, 5));

            // Auto-dismiss after 12 seconds
            setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
        };

        window.addEventListener('noteReminderFired', handler);
        return () => window.removeEventListener('noteReminderFired', handler);
    }, [dismiss]);

    if (alerts.length === 0) return null;

    return createPortal(
        <div
            className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
            style={{ maxWidth: 360 }}
        >
            {alerts.map(alert => (
                <div
                    key={alert.id}
                    className="pointer-events-auto"
                    style={{ animation: 'reminderSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
                >
                    <div
                        className={`rounded-2xl border shadow-2xl overflow-hidden ${
                            isDark
                                ? 'bg-[#1a2236] border-amber-500/30'
                                : 'bg-white border-amber-300'
                        }`}
                        style={{ boxShadow: isDark
                            ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,158,11,0.2)'
                            : '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(245,158,11,0.3)' }}
                    >
                        {/* Amber accent stripe at the top */}
                        <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-400" />

                        <div className="px-4 py-3.5">
                            <div className="flex items-start gap-3">
                                {/* Bell icon */}
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                    isDark ? 'bg-amber-500/15' : 'bg-amber-50'
                                }`}>
                                    <span className="text-lg">🔔</span>
                                </div>

                                {/* Text */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[13px] font-bold leading-tight truncate ${
                                        isDark ? 'text-white' : 'text-gray-900'
                                    }`}>
                                        {alert.note.title || 'Eslatma'}
                                    </p>
                                    {alert.note.content && (
                                        <p className={`text-[12px] mt-0.5 line-clamp-2 leading-snug ${
                                            isDark ? 'text-gray-400' : 'text-gray-500'
                                        }`}>
                                            {alert.note.content.slice(0, 100)}
                                        </p>
                                    )}
                                    <p className={`text-[10px] font-semibold mt-1.5 uppercase tracking-wider ${
                                        isDark ? 'text-amber-500' : 'text-amber-600'
                                    }`}>
                                        Eslatma vaqti keldi
                                    </p>
                                </div>

                                {/* Close button */}
                                <button
                                    onClick={() => dismiss(alert.id)}
                                    className={`w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 transition-colors ${
                                        isDark
                                            ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.08]'
                                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 mt-3">
                                {onNoteClick && (
                                    <button
                                        onClick={() => { dismiss(alert.id); onNoteClick(alert.note); }}
                                        className="flex-1 text-[12px] font-bold py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-white transition-colors active:scale-95"
                                    >
                                        Izohni ochish
                                    </button>
                                )}
                                <button
                                    onClick={() => dismiss(alert.id)}
                                    className={`flex-1 text-[12px] font-semibold py-1.5 px-3 rounded-lg transition-colors active:scale-95 ${
                                        isDark
                                            ? 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.10]'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    Yopish
                                </button>
                            </div>
                        </div>

                        {/* Progress bar — drains over AUTO_DISMISS_MS */}
                        <div className={`h-0.5 w-full ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}>
                            <div
                                className="h-full bg-amber-400 origin-left"
                                style={{
                                    animation: `reminderProgress ${AUTO_DISMISS_MS}ms linear forwards`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            ))}

            <style>{`
                @keyframes reminderSlideIn {
                    from { opacity: 0; transform: translateX(24px) scale(0.95); }
                    to   { opacity: 1; transform: translateX(0)    scale(1);    }
                }
                @keyframes reminderProgress {
                    from { transform: scaleX(1); }
                    to   { transform: scaleX(0); }
                }
            `}</style>
        </div>,
        document.body
    );
};

export default NoteReminderAlert;
