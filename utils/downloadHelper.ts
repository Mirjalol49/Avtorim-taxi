export const forceDownload = async (url: string, filename: string) => {
    if (!url) return;

    // 1. If it's a Supabase URL, we can force download via query param natively!
    // This avoids CORS fetch issues and popup blocker issues.
    if (url.includes('supabase.co/storage')) {
        const downloadUrl = new URL(url);
        downloadUrl.searchParams.set('download', filename || 'true');
        
        const link = document.createElement('a');
        link.href = downloadUrl.toString();
        // Target blank helps if the browser still tries to render it, but `download` param should force it.
        link.target = '_blank';
        link.download = filename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }

    // 2. If it's a Data URL (base64)
    if (url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }

    // 3. Fallback: try fetching it as a Blob (might fail due to CORS)
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename || 'download';
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(objectUrl);
        }, 100);
    } catch (error) {
        console.error('Download failed (likely CORS). Falling back to direct navigation:', error);
        
        // Since we are now in an async catch block, window.open might be blocked by popup blockers.
        // The safest fallback is creating a temporary link to navigate.
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = filename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
