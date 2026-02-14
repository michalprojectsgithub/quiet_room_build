import { useState, useCallback } from 'react';

// Custom hook for drag and drop functionality
export const useDragAndDrop = (onDrop: (files: File[]) => void) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    console.log('useDragAndDrop handleDragOver called');
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    console.log('useDragAndDrop handleDragEnter called');
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    console.log('useDragAndDrop handleDragLeave called');
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    console.log('useDragAndDrop handleDrop called');
    console.log('DataTransfer types:', e.dataTransfer.types);
    console.log('DataTransfer files:', e.dataTransfer.files.length);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    console.log('All files:', files.length);
    console.log('Image files:', imageFiles.length);
    
    if (imageFiles.length > 0) {
      console.log('Calling onDrop with image files:', imageFiles.map(f => f.name));
      onDrop(imageFiles);
    } else {
      console.log('No image files found');
    }
  }, [onDrop]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  return {
    isDragOver,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDragEnd,
    handleDrop
  };
};
