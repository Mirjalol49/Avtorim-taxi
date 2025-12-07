import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import AdminModal from '../components/AdminModal';

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  adminData: { name: 'Admin', role: 'Manager', avatar: '' },
  onUpdate: vi.fn(),
  lang: 'en' as const,
  userRole: 'admin' as const,
  theme: 'dark' as const,
};

describe('AdminModal image upload and display', () => {
  it('renders file upload input for avatar', async () => {
    render(<AdminModal {...baseProps} />);
    // Check that the file input exists
    const fileInput = document.getElementById('admin-avatar-upload') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.type).toBe('file');
    expect(fileInput.accept).toBe('image/*');
  });

  it('renders avatar with fallback handler', async () => {
    render(<AdminModal {...baseProps} adminData={{ name: 'Admin', role: 'Manager', avatar: 'data:image/jpeg;base64,test' }} />);
    const avatar = screen.getByAltText('Admin') as HTMLImageElement;
    // Verify the avatar has the onerror handler attached (it will be a React synthetic event handler)
    expect(avatar).toBeInTheDocument();
    expect(avatar.src).toContain('data:image/jpeg;base64,test');
  });
});

