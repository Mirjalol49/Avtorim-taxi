import { describe, expect, it } from 'vitest';
import {
  getIshonchnomaReminderMs,
  isIshonchnomaReminderDue,
  normalizeIshonchnomaReminderDocument,
} from '../src/features/drivers/utils/ishonchnomaReminder';

describe('ishonchnoma reminder helpers', () => {
  it('uses reminderAtMs first and falls back to old expiryMs records', () => {
    expect(getIshonchnomaReminderMs({ reminderAtMs: 1_000, expiryMs: 2_000 })).toBe(1_000);
    expect(getIshonchnomaReminderMs({ expiryMs: 2_000 })).toBe(2_000);
    expect(getIshonchnomaReminderMs({ reminderAtMs: null, expiryMs: null })).toBeNull();
  });

  it('normalizes saved reminder metadata without keeping expiry semantics', () => {
    const normalized = normalizeIshonchnomaReminderDocument(
      {
        name: 'old-license',
        type: 'image/png',
        data: 'data:image/png;base64,abc',
        category: 'driver_license',
        expiryMs: 1_000,
        reminderAtMs: 500,
        reminderDaysBefore: 2,
      },
      3_000,
      'Ishonchnoma',
    );

    expect(normalized).toMatchObject({
      name: 'Ishonchnoma',
      category: 'driver_license',
      reminderAtMs: 3_000,
      expiryMs: null,
      reminderDaysBefore: null,
    });
    expect(normalized.data).toBe('data:image/png;base64,abc');
  });

  it('fires only from the chosen reminder day through the active reminder window', () => {
    const reminderDay = Date.UTC(2026, 4, 20);

    expect(isIshonchnomaReminderDue(reminderDay, Date.UTC(2026, 4, 19))).toBe(false);
    expect(isIshonchnomaReminderDue(reminderDay, Date.UTC(2026, 4, 20))).toBe(true);
    expect(isIshonchnomaReminderDue(reminderDay, Date.UTC(2026, 5, 3))).toBe(true);
    expect(isIshonchnomaReminderDue(reminderDay, Date.UTC(2026, 5, 4))).toBe(false);
  });
});
