import { useEffect } from 'react';

interface UseKeyboardNavigationProps {
  viewerOpen: boolean;
  totalImages: number;
  nextImage: (total: number) => void;
  prevImage: (total: number) => void;
  closeViewer: () => void;
}

/**
 * Hook to handle keyboard navigation for the image viewer.
 * Supports arrow keys for navigation and Escape to close.
 */
export const useKeyboardNavigation = ({
  viewerOpen,
  totalImages,
  nextImage,
  prevImage,
  closeViewer
}: UseKeyboardNavigationProps): void => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!viewerOpen) return;
      
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          nextImage(totalImages);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevImage(totalImages);
          break;
        case 'Escape':
          closeViewer();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [viewerOpen, totalImages, nextImage, prevImage, closeViewer]);
};
