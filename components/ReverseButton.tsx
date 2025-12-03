import React, { forwardRef, useMemo } from 'react';

export interface ReverseButtonProps {
  label: string;
  onClick: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  theme: 'light' | 'dark';
  ariaLabel?: string;
}

/**
 * Accessible, design-system compliant Reverse button with loading state.
 * - Pixel-perfect styling aligned with existing Tailwind patterns
 * - Smooth hover/active/focus transitions
 * - ARIA attributes for assistive technologies
 */
const ReverseButton = forwardRef<HTMLButtonElement, ReverseButtonProps>(function ReverseButton(
  { label, onClick, loading = false, disabled = false, theme, ariaLabel },
  ref
) {
  const isDisabled = disabled || loading;

  const baseClass = useMemo(() => (
    `relative inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 select-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${theme === 'dark' ? 'focus-visible:ring-gray-500 focus-visible:ring-offset-gray-900' : 'focus-visible:ring-gray-300 focus-visible:ring-offset-white'
    }`
  ), [theme]);

  const colorClass = useMemo(() => (
    isDisabled
      ? 'bg-red-600/60 text-white cursor-not-allowed'
      : 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md'
  ), [isDisabled]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`${baseClass} ${colorClass}`}
      aria-label={ariaLabel || label}
      aria-busy={loading}
      aria-disabled={isDisabled}
      disabled={isDisabled}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center" aria-live="polite" role="status">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        </span>
      )}
      <span className={`${loading ? 'opacity-0' : 'opacity-100'}`}>{label}</span>
    </button>
  );
});

export default React.memo(ReverseButton);

