import React from 'react';
import { useToast } from './ToastNotification';
import { setVolume, setSoundEnabled, isSoundEnabled } from '../services/soundService';

const SoundTestPanel: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => {
    const { addToast } = useToast();
    const [volume, setVol] = React.useState(0.5);
    const [enabled, setEnabled] = React.useState(true);

    const handleVolumeChange = (newVolume: number) => {
        setVol(newVolume);
        setVolume(newVolume);
    };

    const handleToggleSound = () => {
        const newState = !enabled;
        setEnabled(newState);
        setSoundEnabled(newState);
    };

    const buttonClass = `px-4 py-2 rounded-lg font-medium transition-all ${theme === 'dark'
            ? 'bg-gray-700 hover:bg-gray-600 text-white'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
        }`;

    return (
        <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
            <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                🔊 Sound Test Panel
            </h3>

            {/* Test Buttons */}
            <div className="space-y-3 mb-6">
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => addToast('success', 'Success sound test!')}
                        className={`${buttonClass} bg-emerald-600 hover:bg-emerald-700 text-white`}
                    >
                        ✅ Test Success
                    </button>
                    <button
                        onClick={() => addToast('error', 'Error sound test!')}
                        className={`${buttonClass} bg-red-600 hover:bg-red-700 text-white`}
                    >
                        ❌ Test Error
                    </button>
                    <button
                        onClick={() => addToast('info', 'Info sound test!')}
                        className={`${buttonClass} bg-blue-600 hover:bg-blue-700 text-white`}
                    >
                        ℹ️ Test Info
                    </button>
                    <button
                        onClick={() => addToast('warning', 'Warning sound test!')}
                        className={`${buttonClass} bg-amber-600 hover:bg-amber-700 text-white`}
                    >
                        ⚠️ Test Warning
                    </button>
                </div>
            </div>

            {/* Volume Control */}
            <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Volume: {Math.round(volume * 100)}%
                </label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume * 100}
                    onChange={(e) => handleVolumeChange(parseInt(e.target.value) / 100)}
                    className="w-full"
                />
                <div className="flex justify-between text-xs mt-1">
                    <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>Muted</span>
                    <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>Max</span>
                </div>
            </div>

            {/* Enable/Disable Toggle */}
            <button
                onClick={handleToggleSound}
                className={`w-full py-2 rounded-lg font-medium transition-all ${enabled
                        ? 'bg-teal-600 hover:bg-teal-700 text-white'
                        : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
                    }`}
            >
                {enabled ? '🔊 Sound Enabled' : '🔇 Sound Disabled'}
            </button>

            <p className={`text-xs mt-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                💡 Click any test button to hear the sound. Adjust volume or toggle sound on/off.
            </p>
        </div>
    );
};

export default SoundTestPanel;
