import { useEffect } from 'react';
import type { Reference } from '../types';

interface UseTagEventListenersProps {
  patchReference: (id: string, updates: Partial<Reference>) => void;
  setAllRefsForFilter: React.Dispatch<React.SetStateAction<any[] | null>>;
}

/**
 * Hook to handle global tag-related events dispatched from other components.
 * Listens for 'reference-tags-updated' and 'references-list-updated' events.
 */
export const useTagEventListeners = ({
  patchReference,
  setAllRefsForFilter
}: UseTagEventListenersProps): void => {
  useEffect(() => {
    const handleTagsUpdated = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail as any;
        if (detail && detail.id && Array.isArray(detail.tags)) {
          patchReference(detail.id, { tags: detail.tags } as any);
          setAllRefsForFilter(prev => {
            if (!prev) return prev;
            return prev.map(r => r.id === detail.id ? { ...r, tags: detail.tags } : r);
          });
        }
      } catch {
        // Silently ignore parsing errors
      }
    };

    const handleListUpdated = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail as any[] | undefined;
        if (Array.isArray(detail)) {
          setAllRefsForFilter(detail);
        }
      } catch {
        // Silently ignore parsing errors
      }
    };

    window.addEventListener('reference-tags-updated', handleTagsUpdated as EventListener);
    window.addEventListener('references-list-updated', handleListUpdated as EventListener);

    return () => {
      window.removeEventListener('reference-tags-updated', handleTagsUpdated as EventListener);
      window.removeEventListener('references-list-updated', handleListUpdated as EventListener);
    };
  }, [patchReference, setAllRefsForFilter]);
};
