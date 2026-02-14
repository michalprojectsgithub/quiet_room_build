// Image Cache Service - Manages caching of image data URLs to improve performance
import { invoke } from '@tauri-apps/api/tauri';

interface CacheEntry {
  dataUrl: string;
  timestamp: number;
  size: number;
}

interface ImageMetadata {
  originalWidth: number;
  originalHeight: number;
  aspectRatio: number;
}

class ImageCacheService {
  private cache = new Map<string, CacheEntry>();
  private metadataCache = new Map<string, ImageMetadata>();
  private maxCacheSize = 50 * 1024 * 1024; // 50MB max cache size
  private maxAge = 30 * 60 * 1000; // 30 minutes max age
  private currentCacheSize = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Set up automatic cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  // Get cached image data URL or fetch and cache it
  async getImageDataUrl(imagePath: string): Promise<string> {
    const cacheKey = this.getCacheKey(imagePath);
    
    // Check if we have a valid cached entry
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValidCacheEntry(cached)) {
      return cached.dataUrl;
    }

    // Remove expired entry if it exists
    if (cached) {
      this.removeFromCache(cacheKey);
    }

    // Fetch new image data
    try {
      const dataUrl = await invoke('get_image_data', { imagePath });
      
      // Cache the result
      this.addToCache(cacheKey, dataUrl);
      
      return dataUrl;
    } catch (error) {
      console.error(`Failed to get image data for ${imagePath}:`, error);
      throw error;
    }
  }

  // Get cached image metadata or calculate and cache it
  async getImageMetadata(imagePath: string, dataUrl: string): Promise<ImageMetadata> {
    const cacheKey = this.getCacheKey(imagePath);
    const metadataKey = `${cacheKey}_metadata`;
    
    // Check if we have cached metadata
    const cached = this.metadataCache.get(metadataKey);
    if (cached) {
      return cached;
    }

    // Calculate metadata
    const metadata = await this.calculateImageMetadata(dataUrl);
    
    // Cache the metadata
    this.metadataCache.set(metadataKey, metadata);
    
    return metadata;
  }

  // Calculate image metadata from data URL
  private calculateImageMetadata(dataUrl: string): Promise<ImageMetadata> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const metadata: ImageMetadata = {
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight
        };
        
        // Clean up
        img.onload = null;
        img.onerror = null;
        
        resolve(metadata);
      };
      
      img.onerror = () => {
        img.onload = null;
        img.onerror = null;
        reject(new Error('Failed to load image for metadata calculation'));
      };
      
      img.src = dataUrl;
    });
  }

  // Get cache key for image path
  private getCacheKey(imagePath: string): string {
    // Normalize path for consistent caching
    return imagePath.replace(/\\/g, '/').toLowerCase();
  }

  // Check if cache entry is still valid
  private isValidCacheEntry(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    return age < this.maxAge;
  }

  // Add entry to cache with size management
  private addToCache(key: string, dataUrl: string): void {
    const size = this.estimateDataUrlSize(dataUrl);
    
    // Remove old entries if we're over the size limit
    while (this.currentCacheSize + size > this.maxCacheSize && this.cache.size > 0) {
      this.evictOldestEntry();
    }
    
    const entry: CacheEntry = {
      dataUrl,
      timestamp: Date.now(),
      size
    };
    
    this.cache.set(key, entry);
    this.currentCacheSize += size;
  }

  // Remove entry from cache
  private removeFromCache(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.currentCacheSize -= entry.size;
    }
  }

  // Evict the oldest cache entry
  private evictOldestEntry(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.removeFromCache(oldestKey);
    }
  }

  // Estimate data URL size in bytes
  private estimateDataUrlSize(dataUrl: string): number {
    // Rough estimation: base64 is ~4/3 the size of original data
    // Plus overhead for data URL format
    const base64Length = dataUrl.indexOf(',') > -1 ? 
      dataUrl.substring(dataUrl.indexOf(',') + 1).length : 0;
    return Math.ceil((base64Length * 3) / 4) + 100; // Add 100 bytes overhead
  }

  // Clear all caches
  clearCache(): void {
    this.cache.clear();
    this.metadataCache.clear();
    this.currentCacheSize = 0;
  }

  // Dispose of the service and clean up resources
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clearCache();
  }

  // Clean up expired entries
  cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValidCacheEntry(entry)) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.removeFromCache(key);
    }
    
    // Also clean up metadata cache for expired entries
    const expiredMetadataKeys: string[] = [];
    for (const [key] of this.metadataCache.entries()) {
      const baseKey = key.replace('_metadata', '');
      if (!this.cache.has(baseKey)) {
        expiredMetadataKeys.push(key);
      }
    }
    
    for (const key of expiredMetadataKeys) {
      this.metadataCache.delete(key);
    }
  }

  // Get memory usage information
  getMemoryInfo(): { cacheSize: number; metadataSize: number; totalSize: string } {
    return {
      cacheSize: this.cache.size,
      metadataSize: this.metadataCache.size,
      totalSize: `${Math.round(this.currentCacheSize / 1024 / 1024 * 100) / 100}MB`
    };
  }

  // Get cache statistics
  getCacheStats(): { size: number; entries: number; memoryUsage: string } {
    return {
      size: this.cache.size,
      entries: this.cache.size,
      memoryUsage: `${Math.round(this.currentCacheSize / 1024 / 1024 * 100) / 100}MB`
    };
  }

  // Preload images for better performance
  async preloadImages(imagePaths: string[]): Promise<void> {
    const promises = imagePaths.map(async (path) => {
      try {
        await this.getImageDataUrl(path);
      } catch (error) {
        console.warn(`Failed to preload image ${path}:`, error);
      }
    });
    
    await Promise.all(promises);
  }
}

// Export singleton instance
export const imageCacheService = new ImageCacheService();
export default imageCacheService;
