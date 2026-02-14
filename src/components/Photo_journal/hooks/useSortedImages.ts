import { useState, useMemo } from 'react';

interface PhotoImage {
  id: string;
  uploadDate: string;
  [key: string]: any;
}

interface UseSortedImagesReturn<T extends PhotoImage> {
  sortOrder: 'newest' | 'oldest';
  setSortOrder: (order: 'newest' | 'oldest') => void;
  sortedImages: T[];
}

/**
 * Hook to manage image sorting by upload date.
 * Supports newest-first and oldest-first ordering.
 */
export const useSortedImages = <T extends PhotoImage>(
  images: T[]
): UseSortedImagesReturn<T> => {
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const sortedImages = useMemo(() => {
    if (sortOrder === 'newest') {
      return [...images].sort((a, b) =>
        new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
      );
    } else {
      return [...images].sort((a, b) =>
        new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime()
      );
    }
  }, [images, sortOrder]);

  return {
    sortOrder,
    setSortOrder,
    sortedImages
  };
};
