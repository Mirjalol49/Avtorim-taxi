import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import SalaryManagement from '../components/SalaryManagement';
import { ToastProvider } from '../components/ToastNotification';
import { PaymentStatus, TransactionType, DriverStatus } from '../types';

vi.mock('../services/reversalService', () => ({
  reverseSalaryPayment: vi.fn(async () => {
    await new Promise(r => setTimeout(r, 50));
    return 'rev-1';
  }),
  refundSalaryPayment: vi.fn(async () => {
    await new Promise(r => setTimeout(r, 50));
  }),
}));

describe('SalaryManagement Reverse integration', () => {
  it('renders Reverse button and triggers reversal with loading state', async () => {
    const user = userEvent.setup();
    const drivers = [{
      id: 'd1', name: 'Driver A', licensePlate: 'AA', carModel: 'Car', status: DriverStatus.ACTIVE,
      avatar: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', telegram: '', location: { lat: 0, lng: 0, heading: 0 }, phone: '', dailyPlan: 0,
      monthlySalary: 1000, balance: 0, rating: 5
    }];
    const transactions = [{
      id: 't1', driverId: 'd1', amount: 500, type: TransactionType.EXPENSE,
      description: 'Salary payment', timestamp: Date.now(), status: PaymentStatus.COMPLETED
    }];
    const salaryHistory = [{
      id: 's1', driverId: 'd1', amount: 500, effectiveDate: Date.now(), createdBy: 'Admin', createdAt: Date.now(),
      status: PaymentStatus.COMPLETED
    }];

    render(
      <ToastProvider>
        <SalaryManagement
          drivers={drivers as any}
          transactions={transactions as any}
          theme="dark"
          userRole="admin"
          language="en"
          onPaySalary={() => {}}
          salaryHistory={salaryHistory as any}
          adminName={'Admin'}
        />
      </ToastProvider>
    );

    // Switch to history view where Reverse button appears
    await user.click(screen.getByRole('button', { name: /history/i }));

    // Provide prompt reason via window.prompt mock
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Test reason');

    const reverseBtn = await screen.findByRole('button', { name: /reverse/i });
    await user.click(reverseBtn);
    const confirm = await screen.findByRole('button', { name: /confirm/i });
    await user.click(confirm);

    expect(reverseBtn).toBeDisabled();

    // Cleanup
    promptSpy.mockRestore();
  });
});
