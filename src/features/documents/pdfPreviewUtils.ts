export function isPdfSource(file: { name?: string; type?: string; data?: string }) {
    return Boolean(
        file.type?.toLowerCase().includes('pdf')
        || file.data?.startsWith('data:application/pdf')
        || file.name?.toLowerCase().endsWith('.pdf')
    );
}

export function dataUrlToBlobUrl(dataUrl: string, mimeOverride?: string) {
    const [meta, payload] = dataUrl.split(',');
    if (!payload) return dataUrl;

    const mime = mimeOverride || meta.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
    const isBase64 = meta.includes(';base64');
    const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

    return URL.createObjectURL(new Blob([bytes], { type: mime }));
}
