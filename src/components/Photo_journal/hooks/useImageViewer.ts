import { useCallback, useState } from 'react';

export const useImageViewer = () => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openViewer = useCallback((index: number) => {
    setCurrentIndex(index);
    setViewerOpen(true);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
  }, []);

  const nextImage = useCallback((totalImages: number) => {
    if (totalImages > 0) {
      setCurrentIndex(prev => (prev + 1) % totalImages);
    }
  }, []);

  const prevImage = useCallback((totalImages: number) => {
    if (totalImages > 0) {
      setCurrentIndex(prev => (prev - 1 + totalImages) % totalImages);
    }
  }, []);

  return {
    viewerOpen,
    currentIndex,
    openViewer,
    closeViewer,
    nextImage,
    prevImage
  };
};

export default useImageViewer;


