/**
 * useNoteReminders
 *
 * Polls every 30 seconds. When a note's reminderAt timestamp is due (within the
 * past 2 minutes), it fires:
 *   1. A browser Push Notification (visible even if window is in background)
 *   2. A custom DOM event 'noteReminderFired' so the UI can show an in-app alert
 *   3. A Supabase notification (goes to the bell)
 *   4. Clears the reminder from the DB so it doesn't fire again.
 */

import { useEffect, useRef } from 'react';
import { Note } from '../src/core/types/note.types';
import { updateNote } from '../services/notesService';
import { NotificationCategory, NotificationPriority } from '../src/core/types/notification.types';
import { sendNotification } from '../services/notificationService';

export interface NoteReminderFiredDetail {
    note: Note;
}

interface UseNoteRemindersOptions {
    notes: Note[];
    adminUserId: string;
    adminUserName: string;
    enabled: boolean;
    onNoteUpdated?: (noteId: string, updates: Partial<Note>) => void;
}

// ── Browser notification helpers ──────────────────────────────────────────────

async function requestBrowserNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
}

function fireBrowserNotification(title: string, body: string, tag: string) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const n = new Notification(title, {
        body,
        tag,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: true, // stays visible until the user dismisses it
    });
    // Focus the app tab when user clicks the notification
    n.onclick = () => {
        window.focus();
        n.close();
    };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useNoteReminders = ({
    notes,
    adminUserId,
    adminUserName,
    enabled,
    onNoteUpdated,
}: UseNoteRemindersOptions) => {
    const dataRef = useRef({ notes, adminUserId, adminUserName, onNoteUpdated });
    useEffect(() => {
        dataRef.current = { notes, adminUserId, adminUserName, onNoteUpdated };
    });

    const firedRef = useRef(new Set<string>());

    // Request permission once when the hook mounts
    useEffect(() => {
        if (enabled) requestBrowserNotificationPermission();
    }, [enabled]);

    const check = async () => {
        if (!enabled || !dataRef.current.adminUserId) return;

        const now = Date.now();
        const { notes, adminUserId, adminUserName, onNoteUpdated } = dataRef.current;

        for (const note of notes) {
            if (!note.reminderAt) continue;
            const delta = now - note.reminderAt;
            // Fire if reminder is due within last 2 minutes to handle missed ticks
            if (delta < 0 || delta > 2 * 60 * 1000) continue;
            if (firedRef.current.has(note.id)) continue;

            firedRef.current.add(note.id);

            const title = note.title || note.content.slice(0, 50) || 'Eslatma';
            const body = note.content ? note.content.slice(0, 120) : 'Eslatma vaqti keldi!';

            // 1️⃣  Browser notification (visible even if tab is not focused)
            fireBrowserNotification(`🔔 ${title}`, body, `note-reminder-${note.id}`);

            // 2️⃣  In-app event — caught by ReminderAlert component to show a banner
            window.dispatchEvent(
                new CustomEvent<NoteReminderFiredDetail>('noteReminderFired', { detail: { note } })
            );

            // 3️⃣  Supabase notification (shows in notification bell)
            try {
                await sendNotification(
                    {
                        title: `📝 ${title}`,
                        message: body,
                        type: 'payment_reminder',
                        category: NotificationCategory.PAYMENT_REMINDER,
                        priority: NotificationPriority.HIGH,
                        targetUsers: 'role:admin',
                        expiresIn: 24 * 60 * 60 * 1000,
                    },
                    adminUserId,
                    adminUserName
                );
            } catch {
                // notification send failure should not interrupt reminder flow
            }

            // 4️⃣  Clear reminder from DB so it doesn't fire again
            try {
                await updateNote(note.id, { reminderAt: null } as any);
                onNoteUpdated?.(note.id, { reminderAt: null });
            } catch {
                // silently continue
            }
        }
    };

    useEffect(() => {
        if (!enabled) return;
        check();
        const interval = setInterval(check, 30 * 1000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, adminUserId]);
};
