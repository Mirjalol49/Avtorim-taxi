import React, { useState, useRef, useEffect } from 'react';
import { CalendarIcon, ChevronDownIcon } from './Icons';

interface YearSelectorProps {
    selectedYear: number;
    onYearChange: (year: number) => void;
    theme?: 'light' | 'dark';
    startYear?: number;
    endYear?: number;
}

const YearSelector: React.FC<YearSelectorProps> = ({
    selectedYear,
    onYearChange,
    theme = 'dark',
    startYear = new Date().getFullYear(),
    endYear = new Date().getFullYear() + 10
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Generate array of years
    const years = Array.from(
        { length: endYear - startYear + 1 },
        (_, i) => startYear + i
    ).reverse(); // Newest first

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleYearSelect = (year: number) => {
        onYearChange(year);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-xl
                    transition-all duration-200
                    border-2 backdrop-blur-sm min-w-[140px] justify-between
                    ${isOpen
                        ? theme === 'dark'
                            ? 'bg-[#1F2937] border-[#2D6A76] shadow-lg shadow-[#2D6A76]/20'
                            : 'bg-white border-[#2D6A76] shadow-lg shadow-[#2D6A76]/20'
                        : theme === 'dark'
                            ? 'bg-[#1F2937] border-gray-700 hover:border-[#2D6A76]/50'
                            : 'bg-white border-gray-300 hover:border-[#2D6A76]/50'
                    }
                `}
            >
                <div className="flex items-center gap-2.5">
                    <CalendarIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                    <span className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {selectedYear}
                    </span>
                </div>
                <ChevronDownIcon
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className={`
                        absolute top-full mt-2 right-0
                        w-[320px] max-h-96 overflow-hidden
                        rounded-2xl border-2 shadow-2xl
                        backdrop-blur-md
                        ${theme === 'dark'
                            ? 'bg-[#1F2937]/98 border-gray-700'
                            : 'bg-white/98 border-gray-300'
                        }
                        animate-dropdown-in
                        z-50
                    `}
                >
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        <div className="p-3 grid grid-cols-3 gap-2">
                            {years.map((year) => (
                                <button
                                    key={year}
                                    onClick={() => handleYearSelect(year)}
                                    className={`
                                        px-4 py-3.5 rounded-xl
                                        font-semibold text-base text-center
                                        transition-all duration-150
                                        ${year === selectedYear
                                            ? 'bg-[#2D6A76] text-white shadow-lg shadow-[#2D6A76]/30 scale-[1.02]'
                                            : theme === 'dark'
                                                ? 'text-gray-300 hover:bg-gray-800 hover:text-white active:scale-95'
                                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:scale-95'
                                        }
                                    `}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes dropdown-in {
                    from {
                        opacity: 0;
                        transform: translateY(-8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-dropdown-in {
                    animation: dropdown-in 0.2s ease-out;
                }
                
                /* Custom Scrollbar for dropdown */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: ${theme === 'dark' ? '#1e293b' : '#f1f5f9'};
                    border-radius: 10px;
                    margin: 8px 0;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${theme === 'dark' ? '#475569' : '#cbd5e1'};
                    border-radius: 10px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: ${theme === 'dark' ? '#64748b' : '#94a3b8'};
                }
            `}</style>
        </div>
    );
};

export default YearSelector;
