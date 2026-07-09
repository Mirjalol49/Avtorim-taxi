import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DatePicker from '../components/DatePicker';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        i18n: { language: 'en' },
        t: (_key: string, fallback?: string) => fallback ?? _key,
    }),
}));

describe('DatePicker', () => {
    it('syncs the calendar month when the controlled value changes', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const { rerender } = render(
            <DatePicker label="Vaqt" value={new Date(2026, 3, 15)} onChange={onChange} theme="light" />
        );

        rerender(<DatePicker label="Vaqt" value={new Date(2026, 4, 22)} onChange={onChange} theme="light" />);
        await user.click(screen.getByRole('button', { name: /22\/5\/2026/i }));

        expect(screen.getByText(/May 2026/i)).toBeInTheDocument();
    });
});
