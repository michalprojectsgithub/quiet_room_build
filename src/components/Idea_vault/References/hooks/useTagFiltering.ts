import { useCallback, useEffect, useMemo, useState } from 'react';
import { ReferencesService } from '../../../../services/referencesService';

interface UseTagFilteringParams<TRef = any> {
  references: TRef[];
  folderReferences: TRef[];
  activeFolderId: string | null;
  patchReference: (id: string, patch: Partial<any>) => void;
}

export const useTagFiltering = <TRef = any>({
  references,
  folderReferences,
  activeFolderId,
  patchReference
}: UseTagFilteringParams<TRef>) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<'any' | 'all'>('all');
  const [allRefsForFilter, setAllRefsForFilter] = useState<any[] | null>(null);
  const [tagsRefreshTick, setTagsRefreshTick] = useState(0);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => {
      const exists = prev.some(t => t.toLowerCase() === tag.toLowerCase());
      if (exists) return prev.filter(t => t.toLowerCase() !== tag.toLowerCase());
      return [...prev, tag];
    });
  }, []);

  const clearTags = useCallback(() => setSelectedTags([]), []);

  const filteredReferences = useMemo(() => {
    const baseList = selectedTags.length > 0
      ? (allRefsForFilter || (activeFolderId ? folderReferences : references))
      : (activeFolderId ? folderReferences : references);
    if (selectedTags.length === 0) return baseList as any[];
    const lower = selectedTags.map(t => t.toLowerCase());
    return (baseList as any[]).filter(ref => {
      const tags = (ref as any).tags as string[] | undefined;
      if (!tags || tags.length === 0) return false;
      const refLower = tags.map(t => t.toLowerCase());
      return filterMode === 'all'
        ? lower.every(t => refLower.includes(t))
        : lower.some(t => refLower.includes(t));
    });
  }, [activeFolderId, references, folderReferences, selectedTags, allRefsForFilter, filterMode, tagsRefreshTick]);

  // Load all references only when filtering across all
  useEffect(() => {
    const loadAll = async () => {
      try {
        const all = await ReferencesService.getReferences();
        setAllRefsForFilter(all as any[]);
      } catch (e) {
        console.error('Failed to load all references for filtering', e);
      }
    };
    if (selectedTags.length > 0 && !allRefsForFilter) {
      loadAll();
    }
  }, [selectedTags.length, allRefsForFilter]);

  const handleTagChanged = useCallback(async (ref: any, tag: string, op: 'add' | 'remove') => {
    // 1) Persist first
    try {
      const byId = (arr: any[] | null | undefined) => Array.isArray(arr) ? arr.find(r => r.id === ref.id) : undefined;
      const currentInMain = byId(references as any);
      const currentInFolder = byId(folderReferences as any);
      const currentInFilter = byId(allRefsForFilter as any);
      const sourceObj = currentInMain || currentInFolder || currentInFilter || ref;
      const currentTags = Array.isArray(sourceObj?.tags) ? [...sourceObj.tags] : [];
      const exists = currentTags.some((t: string) => t.toLowerCase() === tag.toLowerCase());
      if (op === 'add' && !exists) {
        await ReferencesService.addTag(ref.id, tag);
      } else if (op === 'remove' && exists) {
        await ReferencesService.removeTag(ref.id, tag);
      }
    } catch (e) {
      console.error('Failed to persist tag change', e);
      // proceed optimistically anyway
    }

    // 2) Optimistic update in cached list
    setAllRefsForFilter(prev => {
      const updateOne = (r: any) => {
        const tags = Array.isArray(r.tags) ? [...r.tags] : [];
        const exists = tags.some((t: string) => t.toLowerCase() === tag.toLowerCase());
        if (op === 'add' && !exists) return { ...r, tags: [...tags, tag] };
        if (op === 'remove' && exists) return { ...r, tags: tags.filter((t: string) => t.toLowerCase() !== tag.toLowerCase()) };
        return r;
      };
      if (prev && prev.length) {
        return prev.map(r => (r.id === ref.id ? updateOne(r) : r));
      }
      return [updateOne(ref)];
    });

    // 3) Patch currently loaded arrays used by viewer/grid
    try {
      const byId = (arr: any[] | null | undefined) => Array.isArray(arr) ? arr.find(r => r.id === ref.id) : undefined;
      const currentInMain = byId(references as any);
      const currentInFolder = byId(folderReferences as any);
      const currentInFilter = byId(allRefsForFilter as any);
      const sourceObj = currentInMain || currentInFolder || currentInFilter || ref;
      const currentTags = Array.isArray(sourceObj?.tags) ? [...sourceObj.tags] : [];
      const exists = currentTags.some((t: string) => t.toLowerCase() === tag.toLowerCase());
      let nextTags = currentTags;
      if (op === 'add' && !exists) nextTags = [...currentTags, tag];
      if (op === 'remove' && exists) nextTags = currentTags.filter(t => t.toLowerCase() !== tag.toLowerCase());
      patchReference(ref.id, { tags: nextTags } as any);
      try { window.dispatchEvent(new CustomEvent('reference-tags-updated', { detail: { id: ref.id, tags: nextTags } } as any)); } catch {}
    } catch {}

    // 4) Soft background refresh to reconcile with disk
    try {
      const all = await ReferencesService.getReferences();
      setAllRefsForFilter(all as any[]);
    } catch {}
  }, [references, folderReferences, allRefsForFilter, patchReference]);

  return {
    selectedTags,
    setSelectedTags,
    filterMode,
    setFilterMode,
    allRefsForFilter,
    setAllRefsForFilter,
    tagsRefreshTick,
    setTagsRefreshTick,
    toggleTag,
    clearTags,
    filteredReferences,
    handleTagChanged
  };
};

export default useTagFiltering;


