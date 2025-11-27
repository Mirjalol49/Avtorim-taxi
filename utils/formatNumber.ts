// Format number with smart abbreviation for mobile
export function formatNumberSmart(value: number, isMobile: boolean = false): string {
    // User requested full numbers with space separators (e.g. 2 000 000)
    // We use a regex to insert spaces as thousand separators
    return value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Format number with full formatting
export function formatNumberFull(value: number): string {
    return value.toLocaleString();
}
