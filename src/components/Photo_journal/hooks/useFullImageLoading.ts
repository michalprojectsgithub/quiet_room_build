import { useCallback, useState } from 'react';
import type { PhotoJournalImage } from '../../../services/photoJournalService';
import { PhotoJournalService } from '../../../services/photoJournalService';

export interface UseFullImageLoadingReturn {
  fullImageUrls: Map<string, string>;
  loadingImages: Set<string>;
  loadFullImageUrl: (image: PhotoJournalImage) => Promise<string>;
}

export const useFullImageLoading = (): UseFullImageLoadingReturn => {
  const [fullImageUrls, setFullImageUrls] = useState<Map<string, string>>(new Map());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  const loadFullImageUrl = useCallback(async (image: PhotoJournalImage): Promise<string> => {
    try {
      // Check if we already have the full image URL cached
      if (fullImageUrls.has(image.id)) {
        return fullImageUrls.get(image.id) || '';
      }

      // Mark as loading
      setLoadingImages(prev => new Set(prev.add(image.id)));

      // Load the full-resolution image URL
      const url = await PhotoJournalService.getImageUrl(image);
      
      // Update the URLs and remove from loading
      setFullImageUrls(prev => new Map(prev.set(image.id, url)));
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(image.id);
        return newSet;
      });
      
      return url;
    } catch (error) {
      console.error('Failed to load full image URL:', error);
      // Remove from loading on error
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(image.id);
        return newSet;
      });
      return '';
    }
  }, [fullImageUrls]);

  return {
    fullImageUrls,
    loadingImages,
    loadFullImageUrl
  };
};
