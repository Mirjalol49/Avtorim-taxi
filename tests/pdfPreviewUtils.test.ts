import { describe, expect, it, vi } from 'vitest';
import { dataUrlToBlobUrl, isPdfSource } from '../src/features/documents/pdfPreviewUtils';

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
});
