export function isPdfSource(file: { type?: string; name?: string }) {
    return file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf') === true;
}

export function dataUrlToBlobUrl(dataUrl: string, mimeOverride?: string) {
    const [header, body] = dataUrl.split(',');
    if (!body) throw new Error('Invalid data URL');

    const mime = mimeOverride ?? header.match(/^data:([^;]+)/)?.[1] ?? 'application/octet-stream';
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

export function getOpenableDocumentUrl(data: string, mimeOverride = 'application/pdf') {
    return data.startsWith('data:') ? dataUrlToBlobUrl(data, mimeOverride) : data;
}

export function openDocumentInNewTab(data: string, mimeOverride = 'application/pdf') {
    const url = getOpenableDocumentUrl(data, mimeOverride);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (url !== data) {
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
    return Boolean(opened);
}
