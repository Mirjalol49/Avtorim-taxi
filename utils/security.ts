/**
 * Security utility functions for the application.
 */

/**
 * Sanitizes user input to prevent XSS attacks.
 * Removes HTML tags and dangerous characters.
 * 
 * @param input - The raw input string
 * @returns The sanitized string
 */
export const sanitizeInput = (input: string): string => {
    if (!input) return '';

    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>?/gm, '');

    // Replace potentially dangerous characters
    sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    return sanitized;
};

/**
 * Validates if a string contains only safe characters (alphanumeric, spaces, and basic punctuation).
 * 
 * @param input - The input string to check
 * @returns True if safe, false otherwise
 */
export const isSafeInput = (input: string): boolean => {
    // Allow letters, numbers, spaces, and common punctuation
    const safePattern = /^[a-zA-Z0-9\s.,!?-]*$/;
    return safePattern.test(input);
};
