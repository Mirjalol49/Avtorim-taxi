import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon } from './Icons';

interface Option {
    id: string;
    name: string;
}

interface CustomSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    theme: 'light' | 'dark';
    icon?: React.ElementType;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    label,
    value,
    onChange,
    options,
    placeholder = 'Select option',
    theme,
    icon: Icon
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.id === value);
    const displayValue = selectedOption ? selectedOption.name : placeholder;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="w-full md:w-64" ref={dropdownRef}>
            {/* Label */}
            <div className="flex items-center gap-2 mb-3">
                {Icon && <Icon className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />}
                <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {label}
                </span>
            </div>

            {/* Trigger Button */}
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all outline-none ${theme === 'dark'
                        ? 'bg-[#1F2937] border-gray-700 hover:border-gray-600 text-white'
                        : 'bg-white border-gray-200 hover:border-gray-300 text-gray-900'
                        } ${isOpen ? 'ring-2 ring-[#2D6A76] border-transparent' : ''}`}
                    type="button"
                >
                    <span className="truncate">{displayValue}</span>
                    <ChevronDownIcon
                        className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''
                            } ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                    />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className={`absolute z-50 w-full mt-2 rounded-xl shadow-2xl border overflow-hidden ${theme === 'dark'
                        ? 'bg-[#1F2937] border-gray-700'
                        : 'bg-white border-gray-200'
                        }`}>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y" style={{
                            divideColor: theme === 'dark' ? '#374151' : '#E5E7EB'
                        }}>
                            {options.map((option, index) => (
                                <button
                                    key={option.id}
                                    onClick={() => {
                                        onChange(option.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-all duration-150 ${
                                        value === option.id
                                            ? theme === 'dark'
                                                ? 'bg-[#2D6A76] text-white font-semibold'
                                                : 'bg-[#2D6A76] text-white font-semibold'
                                            : theme === 'dark'
                                            ? 'text-gray-200 hover:bg-gray-800'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="flex-1">
                                        {option.name}
                                    </span>
                                    {value === option.id && (
                                        <div className={`flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 ${theme === 'dark' ? 'bg-white/20' : 'bg-white/30'}`}>
                                            <CheckIcon className={`w-4 h-4 ${theme === 'dark' ? 'text-white' : 'text-white'}`} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomSelect;
