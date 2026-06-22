import { describe, expect, it, vi } from 'vitest';
import { dataUrlToBlobUrl, getOpenableDocumentUrl, isPdfSource, openDocumentInNewTab } from '../src/features/documents/pdfPreviewUtils';

describe('pdfPreviewUtils', () => {
    it('detects PDFs by MIME type, data URL, or file name', () => {
        expect(isPdfSource({ type: 'application/pdf' })).toBe(true);
        expect(isPdfSource({ data: 'data:application/pdf;base64,JVBERi0x' })).toBe(true);
        expect(isPdfSource({ name: '337 sugurta.pdf' })).toBe(true);
        expect(isPdfSource({ name: '337 sugurta.jpg', type: 'image/jpeg' })).toBe(false);
    });

    it('turns a PDF data URL into an application/pdf object URL', () => {
        const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-pdf');
        const blobUrl = dataUrlToBlobUrl('data:application/pdf;base64,JVBERi0xLjQ=');

        expect(blobUrl).toBe('blob:test-pdf');
        const blob = createObjectURL.mock.calls[0][0] as Blob;
        expect(blob.type).toBe('application/pdf');

        createObjectURL.mockRestore();
    });

    it('keeps remote URLs unchanged when preparing a document URL', () => {
        expect(getOpenableDocumentUrl('https://example.com/file.pdf')).toBe('https://example.com/file.pdf');
    });

    it('opens a converted blob URL and later revokes it', () => {
        vi.useFakeTimers();
        const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-pdf');
        const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);

        expect(openDocumentInNewTab('data:application/pdf;base64,JVBERi0xLjQ=')).toBe(true);
        expect(open).toHaveBeenCalledWith('blob:test-pdf', '_blank', 'noopener,noreferrer');

        vi.advanceTimersByTime(60_000);
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-pdf');

        open.mockRestore();
        createObjectURL.mockRestore();
        revokeObjectURL.mockRestore();
        vi.useRealTimers();
    });
});
