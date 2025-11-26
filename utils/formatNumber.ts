// Format number with smart abbreviation for mobile
export function formatNumberSmart(value: number, isMobile: boolean = false): string {
    if (!isMobile) return value.toLocaleString();

    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1000000000) {
        return sign + (absValue / 1000000000).toFixed(1) + 'B';
    } else if (absValue >= 1000000) {
        return sign + (absValue / 1000000).toFixed(1) + 'M';
    } else if (absValue >= 1000) {
        return sign + (absValue / 1000).toFixed(1) + 'K';
    }
    return value.toLocaleString();
}

// Format number with full formatting
export function formatNumberFull(value: number): string {
    return value.toLocaleString();
}
