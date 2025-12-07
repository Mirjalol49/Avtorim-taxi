import React, { useState } from 'react';

interface MFASetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    username: string;
    theme?: 'light' | 'dark';
    onSuccess?: () => void;
}

const MFASetupModal: React.FC<MFASetupModalProps> = ({
    isOpen,
    onClose,
    userId,
    username,
    theme = 'dark',
    onSuccess
}) => {
    const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
    const [qrCode, setQrCode] = useState<string>('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa('driver123:secretKey')
    };

    const handleSetup = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:3000/api/admin/mfa/setup', {
                method: 'POST',
                headers,
                body: JSON.stringify({ userId, username })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setQrCode(data.qrCode);
            setBackupCodes(data.backupCodes);
            setStep('verify');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:3000/api/admin/mfa/verify', {
                method: 'POST',
                headers,
                body: JSON.stringify({ userId, token: verificationCode })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setStep('backup');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = () => {
        onSuccess?.();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`w-full max-w-md rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>

                {/* Header */}
                <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-center">
                        <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {step === 'setup' && '🔐 Enable Two-Factor Authentication'}
                            {step === 'verify' && '📱 Scan QR Code'}
                            {step === 'backup' && '📋 Save Backup Codes'}
                        </h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
                    </div>
                    <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {step === 'setup' && 'Add an extra layer of security to your account'}
                        {step === 'verify' && 'Scan with Google Authenticator or similar app'}
                        {step === 'backup' && 'Save these codes in a secure place'}
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {step === 'setup' && (
                        <div className="space-y-4">
                            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
                                <h4 className={`font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    What you'll need:
                                </h4>
                                <ul className={`text-sm space-y-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <li>• Google Authenticator, Authy, or similar app</li>
                                    <li>• Access to your mobile device</li>
                                </ul>
                            </div>
                            <button
                                onClick={handleSetup}
                                disabled={loading}
                                className="w-full py-3 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? 'Setting up...' : 'Continue'}
                            </button>
                        </div>
                    )}

                    {step === 'verify' && (
                        <div className="space-y-4">
                            {qrCode && (
                                <div className="flex justify-center">
                                    <img src={qrCode} alt="MFA QR Code" className="w-48 h-48 rounded-xl" />
                                </div>
                            )}
                            <div>
                                <label className={`block text-sm font-bold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Enter verification code from app
                                </label>
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={verificationCode}
                                    onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                    className={`w-full p-4 text-center text-2xl font-mono tracking-[0.5em] rounded-xl border ${theme === 'dark'
                                            ? 'bg-gray-900 border-gray-700 text-white'
                                            : 'bg-gray-50 border-gray-200 text-gray-900'
                                        }`}
                                />
                            </div>
                            <button
                                onClick={handleVerify}
                                disabled={loading || verificationCode.length !== 6}
                                className="w-full py-3 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? 'Verifying...' : 'Verify'}
                            </button>
                        </div>
                    )}

                    {step === 'backup' && (
                        <div className="space-y-4">
                            <div className={`p-4 rounded-xl border-2 border-dashed ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-300 bg-gray-50'}`}>
                                <div className="grid grid-cols-2 gap-2">
                                    {backupCodes.map((code, index) => (
                                        <div key={index} className={`font-mono text-sm p-2 rounded ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'}`}>
                                            {code}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className={`text-xs p-3 rounded-lg ${theme === 'dark' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
                                ⚠️ Each backup code can only be used once. Store them securely.
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => navigator.clipboard.writeText(backupCodes.join('\n'))}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                >
                                    Copy Codes
                                </button>
                                <button
                                    onClick={handleComplete}
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all active:scale-95"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MFASetupModal;
