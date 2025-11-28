// Format number with smart abbreviation for cleaner display
export function formatNumberSmart(value: number, isMobile: boolean = false, language: string = 'uz'): string {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    // Language-specific abbreviations
    const abbreviations = {
        uz: { billion: 'mlrd', million: 'mln', thousand: 'ming' },
        ru: { billion: 'млрд', million: 'млн', thousand: 'тыс' },
        en: { billion: 'B', million: 'M', thousand: 'K' }
    };

    const abbr = abbreviations[language as keyof typeof abbreviations] || abbreviations.uz;

    // Billions (1,000,000,000+)
    if (absValue >= 1000000000) {
        const formatted = (absValue / 1000000000).toFixed(absValue >= 10000000000 ? 0 : 1);
        return `${sign}${formatted} ${abbr.billion}`;
    }

    // Millions (1,000,000+)
    if (absValue >= 1000000) {
        const formatted = (absValue / 1000000).toFixed(absValue >= 10000000 ? 0 : 1);
        return `${sign}${formatted} ${abbr.million}`;
    }

    // Thousands (100,000+) - only abbreviate if over 100K
    if (absValue >= 100000) {
        const formatted = (absValue / 1000).toFixed(0);
        return `${sign}${formatted} ${abbr.thousand}`;
    }

    // Smaller numbers - show with space separators
    return sign + absValue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Format number with full formatting and tooltips
export function formatNumberFull(value: number): string {
    return value.toLocaleString('uz-UZ');
}
