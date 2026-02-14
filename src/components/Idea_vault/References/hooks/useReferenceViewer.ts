import { useState, useCallback } from 'react';

// Custom hook for reference viewer management
export const useReferenceViewer = () => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openViewer = useCallback((index: number) => {
    setCurrentIndex(index);
    setViewerOpen(true);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
  }, []);

  const nextReference = useCallback((totalReferences: number) => {
    if (totalReferences > 0) {
      setCurrentIndex(prev => (prev + 1) % totalReferences);
    }
  }, []);

  const prevReference = useCallback((totalReferences: number) => {
    if (totalReferences > 0) {
      setCurrentIndex(prev => (prev - 1 + totalReferences) % totalReferences);
    }
  }, []);

  return {
    viewerOpen,
    currentIndex,
    openViewer,
    closeViewer,
    nextReference,
    prevReference
  };
};
