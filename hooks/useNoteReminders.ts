/**
 * useNoteReminders
 *
 * Polls every 30 seconds. When a note's reminderAt timestamp is due (within the
 * past minute), fires a notification and clears the reminder from the DB so it
 * doesn't fire again.
 */

import { useEffect, useRef } from 'react';
import { Note } from '../src/core/types/note.types';
import { updateNote } from '../services/notesService';
import { NotificationCategory, NotificationPriority } from '../src/core/types/notification.types';
import { sendNotification } from '../services/notificationService';

interface UseNoteRemindersOptions {
    notes: Note[];
    adminUserId: string;
    adminUserName: string;
    enabled: boolean;
    onNoteUpdated?: (noteId: string, updates: Partial<Note>) => void;
}

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

    const check = async () => {
        if (!enabled || !dataRef.current.adminUserId) return;

        const now = Date.now();
        const { notes, adminUserId, adminUserName, onNoteUpdated } = dataRef.current;

        for (const note of notes) {
            if (!note.reminderAt) continue;
            // Fire if reminder is due (within last 2 minutes to handle missed ticks)
            const delta = now - note.reminderAt;
            if (delta < 0 || delta > 2 * 60 * 1000) continue;
            if (firedRef.current.has(note.id)) continue;

            firedRef.current.add(note.id);

            const title = note.title || note.content.slice(0, 50) || 'Eslatma';

            try {
                await sendNotification(
                    {
                        title: `📝 ${title}`,
                        message: note.content ? note.content.slice(0, 120) : 'Eslatma vaqti keldi!',
                        type: 'payment_reminder',
                        category: NotificationCategory.PAYMENT_REMINDER,
                        priority: NotificationPriority.HIGH,
                        targetUsers: 'role:admin',
                        expiresIn: 24 * 60 * 60 * 1000,
                    },
                    adminUserId,
                    adminUserName
                );
            } catch (err) {
                console.error('[NoteReminders] Failed to send notification:', err);
            }

            // Clear reminder from DB
            try {
                await updateNote(note.id, { reminderAt: null } as any);
                onNoteUpdated?.(note.id, { reminderAt: null });
            } catch (err) {
                console.error('[NoteReminders] Failed to clear reminder:', err);
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
