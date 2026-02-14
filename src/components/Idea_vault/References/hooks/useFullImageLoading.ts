import { useCallback, useState } from 'react';
import type { Reference, Folder } from '../types';
import TauriService from '../../../../services/tauriService';

export interface UseFullImageLoadingProps {
  folders: Folder[];
}

export interface UseFullImageLoadingReturn {
  fullImageUrls: Map<string, string>;
  loadingFullImages: Set<string>;
  loadFullImageUrl: (reference: Reference) => Promise<string>;
}

export const useFullImageLoading = ({
  folders
}: UseFullImageLoadingProps): UseFullImageLoadingReturn => {
  const [fullImageUrls, setFullImageUrls] = useState<Map<string, string>>(new Map());
  const [loadingFullImages, setLoadingFullImages] = useState<Set<string>>(new Set());

  const loadFullImageUrl = useCallback(async (reference: Reference): Promise<string> => {
    try {
      console.log('=== LOADING FULL IMAGE URL ===');
      console.log('Reference ID:', reference.id);
      console.log('Reference filename:', reference.filename);
      console.log('Folders available:', folders.length);

      // Serve cached non-empty URL first
      const cached = fullImageUrls.get(reference.id);
      if (cached) {
        return cached;
      }

      // Mark as loading
      setLoadingFullImages(prev => new Set(prev.add(reference.id)));

      // Retry helper: attempts up to 3 times with small backoff
      const attemptLoad = async (attempt: number): Promise<string> => {
        // Pass folders data to avoid multiple getFolders() calls
        const result = await TauriService.getReferenceUrl(reference, folders);
        console.log(`Full image URL attempt ${attempt}:`, result ? 'URL present' : 'No URL');
        if (result) return result;
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 200 * attempt));
          return attemptLoad(attempt + 1);
        }
        return '';
      };

      const url = await attemptLoad(1);
      // Only cache when we have a non-empty url to avoid sticky empty state on first load
      if (url) {
        setFullImageUrls(prev => new Map(prev.set(reference.id, url)));
      }
      // Clear loading state
      setLoadingFullImages(prev => {
        const next = new Set(prev);
        next.delete(reference.id);
        return next;
      });
      return url;
    } catch (error) {
      console.error('Failed to load full image URL:', error);
      // Clear loading state on error
      setLoadingFullImages(prev => {
        const next = new Set(prev);
        next.delete(reference.id);
        return next;
      });
      return '';
    }
  }, [folders, fullImageUrls]);

  return {
    fullImageUrls,
    loadingFullImages,
    loadFullImageUrl
  };
};
