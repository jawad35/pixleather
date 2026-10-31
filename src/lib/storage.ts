// lib/storage.ts - Add these functions

import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageUrl, IMAGE_SIZES } from "./imageOptimizer";

export const BUCKETS = ["product-images", "category-images", "story-images"] as const;
export type Bucket = (typeof BUCKETS)[number];

const SIGN_TTL = 60 * 60 * 24 * 7; // 7 days
const BATCH_SIZE = 50; // Process in batches to avoid timeouts
const CACHE_DURATION = 3600000; // 1 hour

// Image cache
interface CacheEntry {
  url: string;
  timestamp: number;
  optimizedUrls: Record<string, string>;
}

const imageCache = new Map<string, CacheEntry>();

function isStoragePath(value: string): boolean {
  if (!value) return false;
  if (value.startsWith("http") || value.startsWith("/")) return false;
  const seg = value.split("/")[0];
  return (BUCKETS as readonly string[]).includes(seg) && value.includes("/");
}

/** Sign images with caching and optimization */
export async function signImages(
  values: string[], 
  options?: { width?: number; height?: number; quality?: number }
): Promise<Record<string, string>> {
  if (!values.length) return {};
  
  const out: Record<string, string> = {};
  const toSign: string[] = [];
  
  // Check cache first
  for (const v of values) {
    if (!v) continue;
    
    if (isStoragePath(v)) {
      const cached = imageCache.get(v);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        out[v] = cached.url;
      } else {
        toSign.push(v);
      }
    } else {
      out[v] = v;
    }
  }
  
  if (toSign.length === 0) return out;
  
  // Group by bucket for batch processing
  const byBucket: Record<string, string[]> = {};
  for (const v of toSign) {
    const [bucket, ...rest] = v.split("/");
    (byBucket[bucket] ||= []).push(rest.join("/"));
  }
  
  // Process each bucket
  await Promise.all(
    Object.entries(byBucket).map(async ([bucket, paths]) => {
      if (!paths.length) return;
      
      // Process in batches to avoid timeouts
      for (let i = 0; i < paths.length; i += BATCH_SIZE) {
        const batch = paths.slice(i, i + BATCH_SIZE);
        const { data } = await supabase.storage.from(bucket).createSignedUrls(batch, SIGN_TTL);
        
        (data ?? []).forEach((d, idx) => {
          if (d.signedUrl) {
            const fullPath = `${bucket}/${batch[idx]}`;
            
            // Apply optimizations
            const sizeConfig = options?.width ? 
              { width: options.width, height: options.height || options.width, quality: options.quality || 80 } :
              IMAGE_SIZES.product;
            
            const optimizedUrl = getOptimizedImageUrl(d.signedUrl, {
              width: sizeConfig.width,
              height: sizeConfig.height,
              quality: sizeConfig.quality,
              format: 'webp'
            });
            
            out[fullPath] = optimizedUrl;
            
            // Cache the optimized URL
            imageCache.set(fullPath, {
              url: optimizedUrl,
              timestamp: Date.now(),
              optimizedUrls: {}
            });
          }
        });
        
        // Small delay between batches
        if (i + BATCH_SIZE < paths.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }),
  );
  
  return out;
}

export async function signOne(value?: string | null): Promise<string | null> {
  if (!value) return null;
  
  // Check cache
  const cached = imageCache.get(value);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.url;
  }
  
  const map = await signImages([value]);
  const result = map[value] ?? value;
  
  if (result && result !== value) {
    imageCache.set(value, {
      url: result,
      timestamp: Date.now(),
      optimizedUrls: {}
    });
  }
  
  return result;
}

/** Clear image cache */
export function clearImageCache() {
  imageCache.clear();
}

/** Upload a file with compression */
export async function uploadImage(bucket: Bucket, file: File): Promise<string> {
  // Compress image before upload
  const { compressImage } = await import('./imageOptimizer');
  const compressedFile = await compressImage(file);
  
  const ext = compressedFile.name.split(".").pop() || "webp";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, compressedFile, {
    cacheControl: "31536000, immutable",
    upsert: false,
    contentType: 'image/webp'
  });
  if (error) throw error;
  
  clearImageCache(); // Clear cache after upload
  return `${bucket}/${path}`;
}

/** Delete images from storage */
export async function deleteImages(paths: string[]): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];
  
  const byBucket: Record<string, string[]> = {};
  for (const path of paths) {
    if (!path || !isStoragePath(path)) continue;
    const [bucket, ...rest] = path.split("/");
    const objectPath = rest.join("/");
    if (!byBucket[bucket]) byBucket[bucket] = [];
    byBucket[bucket].push(objectPath);
  }
  
  await Promise.all(
    Object.entries(byBucket).map(async ([bucket, objectPaths]) => {
      if (!objectPaths.length) return;
      const { error } = await supabase.storage.from(bucket).remove(objectPaths);
      if (error) {
        console.error(`Error deleting from ${bucket}:`, error);
        failed.push(...objectPaths.map(p => `${bucket}/${p}`));
      } else {
        success.push(...objectPaths.map(p => `${bucket}/${p}`));
        // Remove from cache
        objectPaths.forEach(p => imageCache.delete(`${bucket}/${p}`));
      }
    })
  );
  
  return { success, failed };
}