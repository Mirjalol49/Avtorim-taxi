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
    showSearch?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    label,
    value,
    onChange,
    options,
    placeholder = 'Select option',
    theme,
    icon: Icon,
    showSearch = true
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.id === value);
    const displayValue = selectedOption ? selectedOption.name : placeholder;

    const filteredOptions = options.filter(opt =>
        opt.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
        if (!isOpen) {
            setSearchTerm(''); // Reset search when closed
        }
    }, [isOpen]);

    return (
        <div className="w-full" ref={dropdownRef}>
            {/* Label */}
            <div className="flex items-center gap-2 mb-2.5">
                {Icon && <Icon className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />}
                <span className={`text-[11px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {label}
                </span>
            </div>

            {/* Trigger Button */}
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 outline-none ${theme === 'dark'
                        ? 'bg-[#1F2937] border-gray-700 hover:border-gray-600 hover:bg-gray-800/50 text-white'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-900'
                        } ${isOpen ? `ring-2 ring-[#2D6A76] ring-opacity-50 border-transparent ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}` : ''}`}
                    type="button"
                >
                    <span className="truncate text-sm">{displayValue}</span>
                    <ChevronDownIcon
                        className={`w-4 h-4 flex-shrink-0 ml-2 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''
                            } ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                    />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className={`absolute z-50 w-full mt-2 rounded-lg shadow-xl border overflow-hidden ${theme === 'dark'
                        ? 'bg-[#1F2937] border-gray-700'
                        : 'bg-white border-gray-200'
                        }`}>

                        {/* Search Input */}
                        {showSearch && (
                            <div className={`p-2 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search..."
                                    className={`w-full px-3 py-2 text-sm rounded-md outline-none transition-colors ${theme === 'dark'
                                        ? 'bg-gray-800 text-white placeholder-gray-500 focus:bg-gray-700'
                                        : 'bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-gray-100'
                                        }`}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}

                        <div className="max-h-56 overflow-y-auto custom-scrollbar" style={{
                            divideColor: theme === 'dark' ? '#374151' : '#E5E7EB'
                        }}>
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option, index) => (
                                    <button
                                        key={option.id}
                                        onClick={() => {
                                            onChange(option.id);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left transition-all duration-150 ${index > 0 ? `border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}` : ''
                                            } ${value === option.id
                                                ? theme === 'dark'
                                                    ? 'bg-[#2D6A76] text-white font-semibold'
                                                    : 'bg-[#2D6A76] text-white font-semibold'
                                                : theme === 'dark'
                                                    ? 'text-gray-200 hover:bg-gray-800/60'
                                                    : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="flex-1 truncate">
                                            {option.name}
                                        </span>
                                        {value === option.id && (
                                            <div className={`flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 ml-2 ${theme === 'dark' ? 'bg-white/20' : 'bg-white/30'}`}>
                                                <CheckIcon className={`w-3.5 h-3.5 text-white`} />
                                            </div>
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className={`px-3.5 py-4 text-center text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                    No results found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomSelect;
