import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    dataUrlToBlobUrl,
    getOpenableDocumentUrl,
    isPdfSource,
    openDocumentInNewTab,
} from '../src/features/documents/pdfPreviewUtils';

describe('pdfPreviewUtils', () => {
    const originalOpen = window.open;

    afterEach(() => {
        window.open = originalOpen;
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('detects PDF documents by MIME type and file name', () => {
        expect(isPdfSource({ type: 'application/pdf' })).toBe(true);
        expect(isPdfSource({ name: 'contract.PDF' })).toBe(true);
        expect(isPdfSource({ type: 'image/png', name: 'photo.png' })).toBe(false);
    });

    it('converts a data URL into a blob URL', () => {
        const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
        const url = dataUrlToBlobUrl('data:application/pdf;base64,SGVsbG8=', 'application/pdf');

        expect(url).toBe('blob:test');
        expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
        expect(createObjectURL.mock.calls[0][0]).toMatchObject({ type: 'application/pdf' });
    });

    it('keeps remote URLs openable without conversion', () => {
        expect(getOpenableDocumentUrl('https://example.com/file.pdf')).toBe('https://example.com/file.pdf');
    });

    it('opens data URLs as blob URLs and schedules cleanup', () => {
        vi.useFakeTimers();
        const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf');
        const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
        const open = vi.fn(() => ({ closed: false }) as Window);
        window.open = open;

        expect(openDocumentInNewTab('data:application/pdf;base64,SGVsbG8=')).toBe(true);
        expect(createObjectURL).toHaveBeenCalled();
        expect(open).toHaveBeenCalledWith('blob:pdf', '_blank', 'noopener,noreferrer');

        vi.advanceTimersByTime(60_000);
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:pdf');
    });
});
