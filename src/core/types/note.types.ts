export type NoteColor = 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink';

export interface Note {
    id: string;
    fleetId: string;
    title: string;
    content: string;
    color: NoteColor;
    isPinned: boolean;
    createdMs: number;
    updatedMs: number;
    reminderAt?: number | null;
}
