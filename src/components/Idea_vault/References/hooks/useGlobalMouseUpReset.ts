import { useEffect } from 'react';

interface Params {
  draggedReference: any;
  handleCustomDragEnd: () => void;
}

export const useGlobalMouseUpReset = ({ draggedReference, handleCustomDragEnd }: Params) => {
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (draggedReference) {
        const target = e.target as HTMLElement;
        const folderElement = target.closest('[id^="folder-"]');
        const backButton = target.closest('#back-button');
        if (!folderElement && !backButton) {
          handleCustomDragEnd();
          setTimeout(() => {
            if (draggedReference) {
              handleCustomDragEnd();
            }
          }, 100);
        }
      }
    };
    if (draggedReference) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [draggedReference, handleCustomDragEnd]);
};

export default useGlobalMouseUpReset;


