import { useEffect } from 'react';

interface Params {
  viewerOpen: boolean;
  ideaVaultTab: 'moodboards' | 'notes' | 'references';
  currentListLength: number;
  closeViewer: () => void;
  prevReference: (total: number) => void;
  nextReference: (total: number) => void;
}

export const useViewerKeyboardShortcuts = ({
  viewerOpen,
  ideaVaultTab,
  currentListLength,
  closeViewer,
  prevReference,
  nextReference
}: Params) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.ctrlKey && e.key === 'v' && ideaVaultTab === 'references') {
        return;
      }
      if (!viewerOpen) return;
      if (e.key === 'Escape') {
        closeViewer();
      } else if (e.key === 'ArrowLeft') {
        prevReference(currentListLength);
      } else if (e.key === 'ArrowRight') {
        nextReference(currentListLength);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [viewerOpen, ideaVaultTab, currentListLength, closeViewer, prevReference, nextReference]);
};

export default useViewerKeyboardShortcuts;


