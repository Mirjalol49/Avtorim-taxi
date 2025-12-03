import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReverseButton from '../components/ReverseButton';
import { vi, describe, it, expect } from 'vitest';

describe('ReverseButton', () => {
  it('renders with label and is clickable', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ReverseButton label="Reverse" onClick={onClick} theme="dark" />);

    const button = screen.getByRole('button', { name: /reverse/i });
    expect(button).toBeInTheDocument();
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows spinner and disables when loading', () => {
    render(<ReverseButton label="Reverse" onClick={() => {}} theme="light" loading />);
    const button = screen.getByRole('button', { name: /reverse/i });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    // Spinner is present via role status
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('applies accessibility attributes', () => {
    render(<ReverseButton label="Reverse" ariaLabel="Reverse payment for John" onClick={() => {}} theme="dark" />);
    const button = screen.getByRole('button', { name: /john/i });
    expect(button).toHaveAttribute('aria-label', 'Reverse payment for John');
    expect(button).toHaveClass('rounded-lg');
  });
});
