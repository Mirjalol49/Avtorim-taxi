/**
 * Decodes HTML entities in a string back to their raw characters.
 * Useful for fixing data that was unintentionally double-sanitized (e.g. "&#039;" -> "'")
 * 
 * @param html - The string containing HTML entities
 * @returns The decoded raw string
 */
export const decodeHtml = (html: string): string => {
    if (!html) return "";
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
};
