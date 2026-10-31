// components/OptimizedImage.tsx

import { useState, useEffect, useRef, memo } from 'react';
import { Loader2 } from 'lucide-react';
import { signOne } from '@/lib/storage';
import { IMAGE_SIZES } from '@/lib/imageOptimizer';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: keyof typeof IMAGE_SIZES;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  onLoad?: () => void;
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  sizes = 'product',
  loading = 'lazy',
  priority = false,
  placeholder = 'blur',
  onLoad,
}: OptimizedImageProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isVisible, setIsVisible] = useState(priority);
  const loadTriggeredRef = useRef(false);

  const sizeConfig = IMAGE_SIZES[sizes] || IMAGE_SIZES.product;

  // Handle visibility with Intersection Observer
  useEffect(() => {
    if (priority || !imgRef.current) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before visible
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  // Load image when visible
  useEffect(() => {
    if (!isVisible || loadTriggeredRef.current) return;
    loadTriggeredRef.current = true;

    const loadImage = async () => {
      if (!src) {
        setIsLoading(false);
        return;
      }

      try {
        // If it's already a URL, use it directly
        if (src.startsWith('http')) {
          setImageUrl(src);
          setIsLoading(false);
          return;
        }

        // Get signed URL
        const signed = await signOne(src);
        if (signed) {
          setImageUrl(signed);
          setIsLoading(false);
        } else {
          setError(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading image:', err);
        setError(true);
        setIsLoading(false);
      }
    };

    loadImage();
  }, [src, isVisible]);

  // Preload priority images
  useEffect(() => {
    if (priority && imageUrl) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = imageUrl;
      document.head.appendChild(link);
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [priority, imageUrl]);

  // Determine if we should show loading state
  const showLoading = isLoading && !imageUrl;

  // Show loading state
  if (showLoading) {
    return (
      <div 
        className={`flex items-center justify-center bg-secondary/50 ${className}`}
        style={{ 
          width: width || '100%', 
          height: height || 'auto', 
          aspectRatio: width && height ? `${width}/${height}` : 'auto',
          minHeight: '50px'
        }}
      >
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show error state
  if (error || !imageUrl) {
    return (
      <div 
        className={`flex items-center justify-center bg-secondary/50 text-muted-foreground ${className}`}
        style={{ 
          width: width || '100%', 
          height: height || 'auto',
          minHeight: '50px'
        }}
      >
        <span className="text-sm">No image</span>
      </div>
    );
  }

  // Show optimized image
  return (
    <img
      ref={imgRef}
      src={imageUrl}
      alt={alt}
      loading={priority ? 'eager' : loading}
      className={`${className} transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      width={width || sizeConfig.width}
      height={height || sizeConfig.height}
      decoding="async"
      onLoad={() => {
        setIsLoading(false);
        onLoad?.();
      }}
      onError={() => {
        setError(true);
        setIsLoading(false);
      }}
    />
  );
});