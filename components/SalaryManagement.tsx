/**
 * SalaryManagement — legacy stub kept for test compatibility.
 * The actual salary management UI lives in src/features/finance/PayrollPage.tsx
 */
import React from 'react';

interface SalaryManagementProps {
    drivers: any[];
    transactions: any[];
    theme: 'dark' | 'light';
    userRole: 'admin' | 'viewer';
    language?: string;
    onPaySalary: (...args: any[]) => void;
    salaryHistory?: any[];
    adminName?: string;
}

const SalaryManagement: React.FC<SalaryManagementProps> = () => {
    return <div data-testid="salary-management" />;
};

export default SalaryManagement;
