import { useEffect } from 'react';

interface PhotoImage {
  id: string;
  [key: string]: any;
}

interface UseImagePreloadingProps<T extends PhotoImage> {
  viewerOpen: boolean;
  currentIndex: number;
  sortedImages: T[];
  loadFullImageUrl: (image: T) => void;
}

/**
 * Hook to handle preloading of full-resolution images when the viewer is open.
 * Preloads current, previous, and next images for smooth navigation.
 */
export const useImagePreloading = <T extends PhotoImage>({
  viewerOpen,
  currentIndex,
  sortedImages,
  loadFullImageUrl
}: UseImagePreloadingProps<T>): void => {
  useEffect(() => {
    if (viewerOpen && sortedImages.length > 0) {
      const currentImage = sortedImages[currentIndex];
      if (currentImage) {
        loadFullImageUrl(currentImage);
        
        // Preload adjacent images for smoother navigation
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : sortedImages.length - 1;
        const nextIndex = currentIndex < sortedImages.length - 1 ? currentIndex + 1 : 0;
        
        if (sortedImages[prevIndex]) {
          loadFullImageUrl(sortedImages[prevIndex]);
        }
        if (sortedImages[nextIndex]) {
          loadFullImageUrl(sortedImages[nextIndex]);
        }
      }
    }
  }, [viewerOpen, currentIndex, sortedImages, loadFullImageUrl]);
};
