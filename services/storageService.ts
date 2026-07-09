/**
 * Avatar Storage Service
 *
 * NEW APPROACH: Avatars are uploaded to Supabase Storage ('avatars' bucket)
 * and only the public CDN URL is stored in the database.
 *
 * WHY: Storing base64 blobs in Postgres rows means every subscription fetch
 * downloads the full image binary for every row. With 10+ drivers this was
 * the #1 egress culprit (20–100 KB per driver per fetch).
 *
 * HOW: File → canvas compress → JPEG blob → Storage upload → CDN URL saved in DB.
 */

import { supabase } from '../supabase';

const AVATAR_BUCKET = 'avatars';

// ─── Core image compression ───────────────────────────────────────────────────

/**
 * Compress a File or Blob to a smaller JPEG Blob via canvas.
 */
async function compressToBlob(
    input: File | Blob | string,
    maxDim = 400,
    quality = 0.82,
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            let { width: w, height: h } = img;
            if (w > maxDim || h > maxDim) {
                if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
                else       { w = Math.round(w * maxDim / h); h = maxDim; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('No canvas context')); return; }
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('canvas.toBlob failed'));
            }, 'image/jpeg', quality);
        };

        img.onerror = () => reject(new Error('Image load failed'));

        if (typeof input === 'string') {
            img.src = input; // data URL or http URL
        } else {
            const url = URL.createObjectURL(input);
            img.onload = function () {
                URL.revokeObjectURL(url);
                let { width: w, height: h } = img;
                if (w > maxDim || h > maxDim) {
                    if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
                    else       { w = Math.round(w * maxDim / h); h = maxDim; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error('No canvas context')); return; }
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('canvas.toBlob failed'));
                }, 'image/jpeg', quality);
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
            img.src = url;
        }
    });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upload a driver/car/admin avatar to Supabase Storage.
 * Returns the public CDN URL — this is what gets saved in the database.
 *
 * @param input  File, Blob, or data-URL string
 * @param folder e.g. 'drivers', 'cars', 'admins'
 * @param id     Entity ID used in the filename for deduplication/upsert
 */
export async function uploadAvatarToStorage(
    input: File | Blob | string,
    folder: 'drivers' | 'cars' | 'admins',
    id: string,
): Promise<string> {
    const blob = await compressToBlob(input, 400, 0.82);
    const path = `${folder}/${id}.jpg`;

    const { error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

    if (error) throw error;

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    // Append cache-buster so UI reflects the new upload immediately
    return `${data.publicUrl}?t=${Date.now()}`;
}

// ─── Legacy compatibility (admin profile — kept for existing callers) ──────────

/**
 * @deprecated Use uploadAvatarToStorage('admins', id) instead.
 * Kept for backward compatibility with useAdminProfile.ts.
 * Falls back to old base64 if storage upload fails.
 */
export const uploadAdminAvatar = async (
    dataUrl: string,
    adminName: string,
): Promise<{ url: string; backupPath: string | null; source: string }> => {
    // Try Storage first
    try {
        const id = `admin_${adminName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;
        const url = await uploadAvatarToStorage(dataUrl, 'admins', id);
        return { url, backupPath: null, source: 'storage' };
    } catch {
        // Fallback: compress to base64 (old behaviour) so profile save doesn't fail
        const blob = await compressToBlob(dataUrl, 150, 0.6);
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({
                url: reader.result as string,
                backupPath: null,
                source: 'base64-fallback',
            });
            reader.readAsDataURL(blob);
        });
    }
};

// ─── Kept for any remaining callers ───────────────────────────────────────────

export const compressImage = (dataUrl: string, maxSize = 150): Promise<string> =>
    compressToBlob(dataUrl, maxSize, 0.6).then(blob =>
        new Promise<string>(resolve => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result as string);
            r.readAsDataURL(blob);
        })
    );

export const getAvatarUrl = (avatar: string | undefined, fallbackName = 'User'): string => {
    if (avatar && avatar.length > 10) return avatar;
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fallbackName)}`;
};
