import React, { useState, useEffect } from 'react';
import { Driver } from '../types';
import { useUIContext } from '../src/features/shared/context/UIContext';

interface TelegramRegistrationProps {
    drivers: Driver[];
    theme: 'light' | 'dark';
    onClose: () => void;
}

interface TelegramDriver {
    driver_id: string;
    telegram_user_id: number;
    is_live: number;
}

const TelegramRegistration: React.FC<TelegramRegistrationProps> = ({ drivers, theme, onClose }) => {
    const { t } = useUIContext();
    const [selectedDriverId, setSelectedDriverId] = useState('');
    const [telegramId, setTelegramId] = useState('');
    const [registeredDrivers, setRegisteredDrivers] = useState<TelegramDriver[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchRegisteredDrivers();
    }, []);

    const fetchRegisteredDrivers = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/telegram/drivers');
            if (response.ok) {
                const data = await response.json();
                setRegisteredDrivers(data);
            }
        } catch (error) {
            console.error('Failed to fetch registered drivers:', error);
        }
    };

    const handleRegister = async () => {
        if (!selectedDriverId || !telegramId) {
            setMessage({ type: 'error', text: t.selectDriverError });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch('http://localhost:3000/api/telegram/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    driver_id: selectedDriverId,
                    telegram_user_id: parseInt(telegramId)
                })
            });

            if (response.ok) {
                setMessage({ type: 'success', text: t.registerSuccess });
                setSelectedDriverId('');
                setTelegramId('');
                fetchRegisteredDrivers();
            } else {
                const error = await response.json();
                setMessage({ type: 'error', text: error.error || t.notificationFailed });
            }
        } catch (error) {
            setMessage({ type: 'error', text: t.networkError });
        } finally {
            setLoading(false);
        }
    };

    const getDriverName = (driverId: string) => {
        return drivers.find(d => d.id === driverId)?.name || driverId;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`max-w-2xl w-full rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-[#1F2937]' : 'bg-white'
                }`}>
                {/* Header */}
                <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                🤖 {t.telegramRegistrationTitle}
                            </h2>
                            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {t.telegramRegistrationDesc}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                                }`}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="p-6 space-y-6">
                    {/* Instructions */}
                    <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                        <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>
                            📱 {t.howToGetId}
                        </h3>
                        <ol className={`text-sm space-y-1 ml-4 list-decimal ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                            <li>{t.step1}</li>
                            <li>{t.step2}</li>
                            <li>{t.step3}</li>
                            <li>{t.step4}</li>
                            <li>{t.step5}</li>
                        </ol>
                    </div>

                    {/* Registration Form */}
                    <div className="space-y-4">
                        <div>
                            <label className={`block text-sm font-bold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                {t.selectDriverLabel}
                            </label>
                            <select
                                value={selectedDriverId}
                                onChange={(e) => setSelectedDriverId(e.target.value)}
                                className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#0d9488] ${theme === 'dark'
                                    ? 'bg-gray-800 border-gray-700 text-white'
                                    : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                            >
                                <option value="">{t.chooseDriverOption}</option>
                                {drivers.map(driver => (
                                    <option key={driver.id} value={driver.id}>
                                        {driver.name} ({driver.carModel} - {driver.licensePlate})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={`block text-sm font-bold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                {t.telegramUserIdLabel}
                            </label>
                            <input
                                type="number"
                                value={telegramId}
                                onChange={(e) => setTelegramId(e.target.value)}
                                placeholder="e.g., 123456789"
                                className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-[#0d9488] ${theme === 'dark'
                                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                                    }`}
                            />
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl ${message.type === 'success'
                                ? theme === 'dark' ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-green-50 border border-green-200 text-green-800'
                                : theme === 'dark' ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-800'
                                }`}>
                                {message.text}
                            </div>
                        )}

                        <button
                            onClick={handleRegister}
                            disabled={loading || !selectedDriverId || !telegramId}
                            className={`w-full py-3 rounded-xl font-bold transition-all ${loading || !selectedDriverId || !telegramId
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-lg active:scale-95'
                                }`}
                        >
                            {loading ? `⏳ ${t.registeringBtn}` : `✅ ${t.registerDriverBtn}`}
                        </button>
                    </div>

                    {/* Registered Drivers List */}
                    {registeredDrivers.length > 0 && (
                        <div>
                            <h3 className={`font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                📋 {t.registeredDriversTitle} ({registeredDrivers.length})
                            </h3>
                            <div className="space-y-2">
                                {registeredDrivers.map(rd => (
                                    <div
                                        key={rd.driver_id}
                                        className={`p-3 rounded-xl border flex justify-between items-center ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                                            }`}
                                    >
                                        <div>
                                            <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                {getDriverName(rd.driver_id)}
                                            </div>
                                            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                Telegram ID: {rd.telegram_user_id}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {rd.is_live === 1 ? (
                                                <span className="text-xs font-bold text-green-500 flex items-center gap-1">
                                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                    {t.liveStatus}
                                                </span>
                                            ) : (
                                                <span className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {t.offlineStatus}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TelegramRegistration;
