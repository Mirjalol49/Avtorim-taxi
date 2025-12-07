import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import AdminModal from '../components/AdminModal';

const props = {
  isOpen: true,
  onClose: vi.fn(),
  adminData: { name: 'Admin', role: 'Manager', avatar: '' },
  onUpdate: vi.fn(),
  lang: 'en' as const,
  userRole: 'admin' as const,
  theme: 'dark' as const,
};

describe('Password visibility toggle', () => {
  it('toggles current password field visibility with ARIA labels', async () => {
    const user = userEvent.setup();
    render(<AdminModal {...props} />);
    const buttons = screen.getAllByRole('button', { name: /show password|hide password/i });
    // There are two eye buttons: current and new password
    // Current password is now visible by default (starts with "Hide password")
    const eyeButton = buttons[0];
    // Initially password is visible, so label should be "Hide password"
    expect(eyeButton).toHaveAccessibleName(/hide password/i);
    // After click, label should change to "Show password"
    await user.click(eyeButton);
    expect(eyeButton).toHaveAccessibleName(/show password/i);
  });
});

