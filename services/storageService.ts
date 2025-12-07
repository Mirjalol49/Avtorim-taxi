/**
 * Simple, reliable image compression using canvas
 * Stores avatar as compressed base64 directly in Firestore
 */

/**
 * Compress an image to reduce its size
 * Uses a simpler approach that's more reliable
 */
export const compressImage = (dataUrl: string, maxSize: number = 150): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Set a short timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.warn('⚠️ Image compression timed out, using original');
      if (dataUrl.length < 500 * 1024) {
        resolve(dataUrl);
      } else {
        reject(new Error('Image too large and compression timed out'));
      }
    }, 2000);

    try {
      const img = new Image();

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');

          // Calculate new dimensions
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.warn('No canvas context, using original');
            resolve(dataUrl);
            return;
          }

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.6);

          console.log(`📦 Compressed: ${Math.round(dataUrl.length / 1024)}KB → ${Math.round(compressed.length / 1024)}KB`);
          resolve(compressed);
        } catch (canvasError) {
          console.warn('Canvas error, using original:', canvasError);
          resolve(dataUrl);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        console.warn('Image load error, using original');
        resolve(dataUrl); // Fallback to original if image fails to load
      };

      // Critical: Set crossOrigin before src
      img.crossOrigin = 'anonymous';
      img.src = dataUrl;

    } catch (error) {
      clearTimeout(timeout);
      console.warn('Compression setup error:', error);
      resolve(dataUrl);
    }
  });
};

/**
 * Process avatar for saving
 * Compresses the image and returns a base64 string suitable for Firestore
 */
export const uploadAdminAvatar = async (dataUrl: string, adminName: string): Promise<{
  url: string;
  backupPath: string | null;
  source: string;
}> => {
  console.log('🖼️ Processing avatar for:', adminName);
  console.log('📊 Original size:', Math.round(dataUrl.length / 1024), 'KB');

  try {
    // Compress the image
    const compressed = await compressImage(dataUrl, 150);
    const sizeKB = compressed.length / 1024;

    console.log('📊 Final size:', Math.round(sizeKB), 'KB');

    // Check if it's small enough for Firestore (under 500KB to be safe)
    if (sizeKB > 500) {
      // Try more aggressive compression
      console.log('🔄 Trying more aggressive compression...');
      const moreCompressed = await compressImage(dataUrl, 100);
      const newSize = moreCompressed.length / 1024;
      console.log('📊 After aggressive compression:', Math.round(newSize), 'KB');

      if (newSize > 500) {
        throw new Error('Image too large. Please use a smaller image (under 500KB).');
      }

      return {
        url: moreCompressed,
        backupPath: null,
        source: 'base64-compressed'
      };
    }

    console.log('✅ Avatar processed successfully');
    return {
      url: compressed,
      backupPath: null,
      source: 'base64'
    };

  } catch (error: any) {
    console.error('❌ Avatar processing failed:', error);
    throw error;
  }
};

/**
 * Get avatar URL with fallback
 */
export const getAvatarUrl = (avatar: string | undefined, fallbackName: string = 'User'): string => {
  if (avatar && avatar.length > 10) {
    return avatar;
  }
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fallbackName)}`;
};
