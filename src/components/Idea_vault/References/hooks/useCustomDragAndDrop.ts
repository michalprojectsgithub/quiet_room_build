import { useCallback, useState, useEffect } from 'react';
import type { Reference } from '../types';

export interface UseCustomDragAndDropProps {
  moveReference: (referenceId: string, targetFolderId: string) => Promise<any>;
  activeFolderId: string | null;
}

export interface UseCustomDragAndDropReturn {
  draggedReference: Reference | null;
  dragPosition: { x: number; y: number } | null;
  handleCustomDragStart: (reference: Reference) => void;
  handleCustomDragOver: (e: React.MouseEvent, elementId: string) => void;
  handleCustomDragLeave: (e: React.MouseEvent) => void;
  handleCustomDrop: (e: React.MouseEvent, elementId: string) => void;
  handleCustomDragEnd: () => void;
  handleGlobalMouseUp: () => void;
}

export const useCustomDragAndDrop = ({
  moveReference,
  activeFolderId
}: UseCustomDragAndDropProps): UseCustomDragAndDropReturn => {
  const [draggedReference, setDraggedReference] = useState<Reference | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  const handleCustomDragStart = useCallback((reference: Reference) => {
    setDraggedReference(reference);
    // Set initial drag position to current mouse position
    setDragPosition({ x: 0, y: 0 }); // Will be updated by mouse move
  }, []);

  const handleCustomDragOver = useCallback((e: React.MouseEvent, elementId: string) => {
    if (!draggedReference) return;
    
    e.preventDefault();
    setDragPosition({ x: e.clientX, y: e.clientY });
    
    // Add visual feedback for drop zones (throttled)
    requestAnimationFrame(() => {
      const element = document.getElementById(elementId);
      if (element && !element.classList.contains('drag-over')) {
        element.classList.add('drag-over');
      }
    });
  }, [draggedReference]);

  const handleCustomDragLeave = useCallback((e: React.MouseEvent) => {
    if (!draggedReference) return;
    
    // Remove visual feedback from all elements (throttled)
    requestAnimationFrame(() => {
      document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });
    });
  }, [draggedReference]);

  const handleCustomDrop = useCallback(async (e: React.MouseEvent, elementId: string) => {
    if (!draggedReference) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Determine target folder based on element ID
      let targetFolderId: string | undefined;
      
      if (elementId === 'back-button') {
        // Dropping on back button means moving to main gallery
        targetFolderId = undefined;
      } else if (elementId.startsWith('folder-')) {
        // Dropping on a folder
        targetFolderId = elementId.replace('folder-', '');
      } else {
        return;
      }
      
      // Don't move if already in the target location
      if (targetFolderId === activeFolderId) {
        return;
      }
      
      await moveReference(draggedReference.id, targetFolderId || 'main');
      
    } catch (error) {
      console.error('Error moving reference:', error);
    } finally {
      // Clean up
      setDraggedReference(null);
      setDragPosition(null);
      
      // Remove all drag-over classes (throttled)
      requestAnimationFrame(() => {
        document.querySelectorAll('.drag-over').forEach(el => {
          el.classList.remove('drag-over');
        });
      });
    }
  }, [draggedReference, moveReference, activeFolderId]);

  const handleCustomDragEnd = useCallback(() => {
    setDraggedReference(null);
    setDragPosition(null);
    
    // Remove all drag-over classes (throttled)
    requestAnimationFrame(() => {
      document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });
    });
  }, []);

  const handleGlobalMouseUp = useCallback(() => {
    if (draggedReference) {
      handleCustomDragEnd();
    }
  }, [draggedReference, handleCustomDragEnd]);

  // Global mouse move handler to track drag position
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggedReference) {
        setDragPosition({ x: e.clientX, y: e.clientY });
      }
    };

    if (draggedReference) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
      };
    }
  }, [draggedReference]);


  return {
    draggedReference,
    dragPosition,
    handleCustomDragStart,
    handleCustomDragOver,
    handleCustomDragLeave,
    handleCustomDrop,
    handleCustomDragEnd
  };
};
