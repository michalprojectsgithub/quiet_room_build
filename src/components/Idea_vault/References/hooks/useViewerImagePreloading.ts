import { useEffect, useRef } from 'react';
import type { Reference, Folder } from '../types';

interface UseViewerImagePreloadingProps {
  viewerOpen: boolean;
  currentIndex: number;
  activeFolderId: string | null;
  references: Reference[];
  folderReferences: Reference[];
  filteredReferences: Reference[];
  selectedTagsLength: number;
  folders: Folder[];
  fullImageUrls: Map<string, string>;
  loadFullImageUrl: (reference: Reference) => Promise<string>;
}

/**
 * Hook to handle preloading of full-resolution images when the viewer is open.
 * Preloads current, previous, and next images for smooth navigation.
 * Also includes a retry mechanism for failed loads.
 */
export const useViewerImagePreloading = ({
  viewerOpen,
  currentIndex,
  activeFolderId,
  references,
  folderReferences,
  filteredReferences,
  selectedTagsLength,
  folders,
  fullImageUrls,
  loadFullImageUrl
}: UseViewerImagePreloadingProps): void => {
  // Retry tracker for first-load full image URL
  const loadAttemptsRef = useRef(0);

  // Reset retry counter whenever viewer target changes
  useEffect(() => {
    if (!viewerOpen) return;
    loadAttemptsRef.current = 0;
  }, [viewerOpen, currentIndex, activeFolderId]);

  // Load full-resolution images when viewer opens or index changes
  useEffect(() => {
    const currentReferences = selectedTagsLength > 0 ? filteredReferences : (activeFolderId ? folderReferences : references);
    if (viewerOpen && currentReferences.length > 0) {
      const currentRef = currentReferences[currentIndex];
      if (currentRef) {
        // If missing or empty, load; if present but empty string, also retry
        const cached = fullImageUrls.get(currentRef.id);
        if (!cached) {
          loadFullImageUrl(currentRef);
        }
        
        // Preload adjacent images for smoother navigation
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentReferences.length - 1;
        const nextIndex = currentIndex < currentReferences.length - 1 ? currentIndex + 1 : 0;
        
        if (currentReferences[prevIndex]) {
          if (!fullImageUrls.get(currentReferences[prevIndex].id)) {
            loadFullImageUrl(currentReferences[prevIndex]);
          }
        }
        if (currentReferences[nextIndex]) {
          if (!fullImageUrls.get(currentReferences[nextIndex].id)) {
            loadFullImageUrl(currentReferences[nextIndex]);
          }
        }
      }
    }
  }, [viewerOpen, currentIndex, activeFolderId, folderReferences, references, filteredReferences, selectedTagsLength, loadFullImageUrl, fullImageUrls]);

  // Load full image URL when folders become available (fixes initial load race condition)
  useEffect(() => {
    const currentReferences = selectedTagsLength > 0 ? filteredReferences : (activeFolderId ? folderReferences : references);
    if (viewerOpen && currentReferences.length > 0 && folders.length > 0) {
      const currentRef = currentReferences[currentIndex];
      const cached = fullImageUrls.get(currentRef?.id || '');
      if (currentRef && !cached) {
        console.log('=== FOLDERS NOW AVAILABLE, LOADING FULL IMAGE ===');
        loadFullImageUrl(currentRef);
      }
    }
  }, [folders.length, viewerOpen, currentIndex, activeFolderId, folderReferences, references, filteredReferences, selectedTagsLength, fullImageUrls, loadFullImageUrl]);

  // Robust retry loop: if URL is still empty, retry a few times with backoff
  useEffect(() => {
    if (!viewerOpen) return;
    const currentReferences = selectedTagsLength > 0 ? filteredReferences : (activeFolderId ? folderReferences : references);
    const currentRef = currentReferences[currentIndex];
    if (!currentRef) return;

    let cancelled = false;
    const maxAttempts = 6;
    const cleanupFns: Array<() => void> = [];

    const scheduleNext = (delay: number) => {
      const id = setTimeout(async () => {
        if (cancelled) return;
        // If already have URL, stop
        if (fullImageUrls.get(currentRef.id)) return;
        loadAttemptsRef.current += 1;
        const url = await loadFullImageUrl(currentRef);
        if (!url && loadAttemptsRef.current < maxAttempts) {
          scheduleNext(250 * loadAttemptsRef.current); // small backoff
        }
      }, delay);
      // Cleanup helper
      cleanupFns.push(() => clearTimeout(id));
    };

    // Start retrying only if we don't have a URL yet
    if (!fullImageUrls.get(currentRef.id)) {
      scheduleNext(300);
    }

    return () => {
      cancelled = true;
      cleanupFns.forEach(fn => fn());
    };
  }, [viewerOpen, currentIndex, activeFolderId, folderReferences, references, filteredReferences, selectedTagsLength, fullImageUrls, loadFullImageUrl]);
};
