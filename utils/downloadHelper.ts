export const forceDownload = async (url: string, filename: string) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(objectUrl);
        }, 100);
    } catch (error) {
        console.error('Download failed:', error);
        // Fallback to opening in a new tab if fetch fails (e.g. CORS issues)
        window.open(url, '_blank', 'noopener,noreferrer');
    }
};
