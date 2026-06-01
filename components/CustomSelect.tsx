import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, CheckIcon } from './Icons';

interface Option {
    id: string;
    name: string;
    node?: React.ReactNode;
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
    labelClassName?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    label,
    value,
    onChange,
    options,
    placeholder,
    theme,
    icon: Icon,
    showSearch = true,
    labelClassName
}) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

    const defaultPlaceholder = t('selectOption') || 'Select option';
    const effectivePlaceholder = placeholder || defaultPlaceholder;

    const selectedOption = options.find(opt => opt.id === value);
    const displayValue = selectedOption ? (selectedOption.node || selectedOption.name) : effectivePlaceholder;

    const filteredOptions = options.filter(opt =>
        opt.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const updateMenuPosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setMenuStyle({
            position: 'fixed',
            top: rect.bottom + 8,
            left: Math.max(12, Math.min(rect.left, window.innerWidth - rect.width - 12)),
            width: rect.width,
            zIndex: 99999,
        });
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                menuRef.current &&
                !menuRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            updateMenuPosition();
            window.addEventListener('resize', updateMenuPosition);
            window.addEventListener('scroll', updateMenuPosition, true);
        }
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
        if (!isOpen) {
            setSearchTerm(''); // Reset search when closed
        }
        return () => {
            window.removeEventListener('resize', updateMenuPosition);
            window.removeEventListener('scroll', updateMenuPosition, true);
        };
    }, [isOpen, updateMenuPosition]);

    const dropdownMenu = isOpen ? (
        <div
            ref={menuRef}
            className={`rounded-lg shadow-xl border overflow-hidden ${theme === 'dark' ? 'border-white/[0.08]' : 'bg-white border-gray-200'}`}
            style={{ ...(theme === 'dark' ? { background: '#171f33' } : undefined), ...menuStyle }}
        >

            {/* Search Input */}
            {showSearch && (
                <div className={`p-2 border-b ${theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-100'}`}>
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('searchPlaceholder') || 'Search...'}
                        className={`w-full px-3 py-2 text-sm rounded-md outline-none transition-colors ${theme === 'dark'
                            ? 'text-white placeholder-gray-500'
                            : 'bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-gray-100'
                            }`}
                        style={theme === 'dark' ? { background: '#222a3d' } : undefined}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            <div className={`max-h-48 overflow-y-auto divide-y ${theme === 'dark' ? 'divide-white/[0.07]' : 'divide-black/[0.05]'}
                [&::-webkit-scrollbar]:w-2
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:bg-gray-400
                [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-thumb]:border-2
                [&::-webkit-scrollbar-thumb]:border-transparent
                dark:[&::-webkit-scrollbar-thumb]:bg-gray-600
                hover:[&::-webkit-scrollbar-thumb]:bg-gray-500
            `}>
                {filteredOptions.length > 0 ? (
                    filteredOptions.map((option, index) => (
                        <button
                            key={option.id}
                            onClick={() => {
                                onChange(option.id);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left transition-all duration-150 ${index > 0 ? `border-t ${theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-100'}` : ''
                                } ${value === option.id
                                    ? theme === 'dark'
                                        ? 'bg-[#0f766e] text-white font-semibold'
                                        : 'bg-[#0f766e] text-white font-semibold'
                                    : theme === 'dark'
                                        ? 'text-gray-200 hover:bg-white/[0.04]/60'
                                        : 'text-gray-700 hover:bg-black/[0.03]'
                                }`}
                        >
                            <span className="flex-1 truncate">
                                {option.node || option.name}
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
                        {t('noResultsFound') || 'No results found'}
                    </div>
                )}
            </div>
        </div>
    ) : null;

    const shouldPortal = typeof document !== 'undefined' && dropdownMenu;

    return (
        <div className="w-full" ref={dropdownRef}>
            {/* Label */}
            {label && (
                <div className="flex items-center gap-2 mb-3">
                    {Icon && <Icon className={`w-3.5 h-3.5 ${labelClassName || (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}`} />}
                    <span className={`text-xs font-bold uppercase tracking-wider ${labelClassName || (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}`}>
                        {label}
                    </span>
                </div>
            )}

            {/* Trigger Button */}
            <div className="relative" ref={triggerRef}>
                <button
                    onClick={() => {
                        updateMenuPosition();
                        setIsOpen(!isOpen);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 outline-none ${theme === 'dark'
                        ? 'bg-surface-2/50 border-white/[0.08] hover:border-white/[0.12] text-white'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-900'
                        } ${isOpen ? `ring-2 ring-[#0f766e] ring-opacity-50 border-transparent ${theme === 'dark' ? 'bg-surface-2' : 'bg-white'}` : ''}`}
                    type="button"
                >
                    <span className="truncate text-sm">{displayValue}</span>
                    <ChevronDownIcon
                        className={`w-4 h-4 flex-shrink-0 ml-2 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''
                            } ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                    />
                </button>

                {shouldPortal ? createPortal(dropdownMenu, document.body) : dropdownMenu}
            </div>
        </div>
    );
};

export default CustomSelect;
