// lib/imageOptimizer.ts

/**
 * Full image optimization solution
 * Balances quality and performance
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill';
}

// Supabase Storage transformation parameters
export function getOptimizedImageUrl(
  path: string,
  options: ImageOptimizationOptions = {}
): string {
  if (!path) return '';
  
  // If it's already a full URL or not a storage path
  if (path.startsWith('http') || !path.includes('/')) {
    return path;
  }

  const {
    width = 800,
    height = 800,
    quality = 80,
    format = 'webp',
    fit = 'cover'
  } = options;

  // Check if browser supports WebP
  const supportsWebP = typeof document !== 'undefined' && 
    document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
  
  const finalFormat = supportsWebP ? format : 'jpeg';

  // If it's a signed URL (contains ?), add params
  if (path.includes('?')) {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}width=${width}&height=${height}&quality=${quality}&format=${finalFormat}&fit=${fit}`;
  }
  
  return path;
}

// Optimized sizes for different use cases
export const IMAGE_SIZES = {
  product: { width: 1200, height: 1200, quality: 85, format: 'webp' as const },
  thumbnail: { width: 400, height: 400, quality: 75, format: 'webp' as const },
  category: { width: 600, height: 600, quality: 80, format: 'webp' as const },
  story: { width: 1000, height: 800, quality: 85, format: 'webp' as const },
  hero: { width: 1600, height: 900, quality: 90, format: 'webp' as const },
  admin: { width: 200, height: 200, quality: 70, format: 'webp' as const }
};

// Image compression utility
export async function compressImage(file: File, maxSizeMB = 0.5): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        const maxWidth = 1200;
        const maxHeight = 1200;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Determine quality based on file size
        let quality = 0.85;
        if (file.size > 2 * 1024 * 1024) quality = 0.75;
        if (file.size > 5 * 1024 * 1024) quality = 0.65;
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const optimizedFile = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, '.webp'),
              { type: 'image/webp' }
            );
            resolve(optimizedFile);
          },
          'image/webp',
          quality
        );
      };
      
      img.onerror = () => resolve(file);
    };
    
    reader.onerror = () => resolve(file);
  });
}   