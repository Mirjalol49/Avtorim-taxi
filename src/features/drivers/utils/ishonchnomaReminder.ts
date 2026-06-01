import { DriverDocument } from '../../../core/types';

export const ISHONCHNOMA_REMINDER_WINDOW_DAYS = 14;

export const startOfDayMs = (value: number | Date): number => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const getIshonchnomaReminderMs = (doc?: Partial<DriverDocument> | null): number | null => {
  if (!doc) return null;
  if (typeof doc.reminderAtMs === 'number') return doc.reminderAtMs;
  if (typeof doc.expiryMs === 'number') return doc.expiryMs;
  return null;
};

export const normalizeIshonchnomaReminderDocument = (
  doc: DriverDocument,
  reminderAtMs: number | null,
  name: string,
): DriverDocument => ({
  ...doc,
  name,
  category: 'driver_license',
  reminderAtMs,
  expiryMs: null,
  reminderDaysBefore: null,
});

export const isIshonchnomaReminderDue = (
  reminderAtMs: number | null,
  todayMs: number,
  windowDays = ISHONCHNOMA_REMINDER_WINDOW_DAYS,
): boolean => {
  if (reminderAtMs === null) return false;
  const elapsedMs = startOfDayMs(todayMs) - startOfDayMs(reminderAtMs);
  return elapsedMs >= 0 && elapsedMs <= windowDays * 24 * 60 * 60 * 1000;
};
