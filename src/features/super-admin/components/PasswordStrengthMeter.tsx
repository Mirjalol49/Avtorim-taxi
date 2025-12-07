import React, { useState, useEffect } from 'react';

interface PasswordStrengthMeterProps {
    password: string;
    onValidationChange?: (isValid: boolean, errors: string[]) => void;
    theme?: 'light' | 'dark';
}

interface ValidationResult {
    valid: boolean;
    errors: string[];
    strength: number;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
    password,
    onValidationChange,
    theme = 'dark'
}) => {
    const [validation, setValidation] = useState<ValidationResult>({
        valid: false,
        errors: [],
        strength: 0
    });
    const [isChecking, setIsChecking] = useState(false);
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (debounceTimer) clearTimeout(debounceTimer);

        if (!password || password.length < 3) {
            setValidation({ valid: false, errors: [], strength: 0 });
            return;
        }

        const timer = setTimeout(async () => {
            setIsChecking(true);
            try {
                const response = await fetch('http://localhost:3000/api/admin/validate-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Basic ' + btoa('driver123:secretKey')
                    },
                    body: JSON.stringify({ password })
                });

                const result = await response.json();
                setValidation(result);
                onValidationChange?.(result.valid, result.errors);
            } catch (error) {
                console.error('Password validation error:', error);
            } finally {
                setIsChecking(false);
            }
        }, 500);

        setDebounceTimer(timer);
        return () => clearTimeout(timer);
    }, [password]);

    const getStrengthColor = () => {
        if (validation.strength < 25) return 'bg-red-500';
        if (validation.strength < 50) return 'bg-orange-500';
        if (validation.strength < 75) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getStrengthLabel = () => {
        if (validation.strength < 25) return 'Weak';
        if (validation.strength < 50) return 'Fair';
        if (validation.strength < 75) return 'Good';
        return 'Strong';
    };

    if (!password) return null;

    return (
        <div className="mt-2 space-y-2">
            {/* Strength Bar */}
            <div className="flex items-center gap-2">
                <div className={`flex-1 h-2 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                        className={`h-full rounded-full transition-all duration-300 ${getStrengthColor()}`}
                        style={{ width: `${validation.strength}%` }}
                    />
                </div>
                <span className={`text-xs font-bold ${validation.strength >= 75 ? 'text-green-500' :
                        validation.strength >= 50 ? 'text-yellow-500' :
                            'text-red-500'
                    }`}>
                    {isChecking ? '...' : getStrengthLabel()}
                </span>
            </div>

            {/* Requirements */}
            <div className="space-y-1">
                {validation.errors.map((error, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                        <span className="text-red-500">✕</span>
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                            {error}
                        </span>
                    </div>
                ))}
                {validation.valid && (
                    <div className="flex items-center gap-2 text-xs text-green-500">
                        <span>✓</span>
                        <span>Password meets all requirements</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PasswordStrengthMeter;
