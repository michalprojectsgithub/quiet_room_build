import { useState, useEffect, useCallback } from 'react';
import type { Reference } from '../types';

interface NoteOverride {
  id: string;
  note: { text: string; updatedAt: number } | null;
}

interface TagsOverride {
  id: string;
  tags: string[];
}

interface RotationOverride {
  id: string;
  rotation: number;
}

interface CropOverride {
  id: string;
  crop: { x: number; y: number; w: number; h: number } | null;
}

interface UseViewerOverridesProps {
  viewerOpen: boolean;
  currentIndex: number;
  references: Reference[];
  folderReferences: Reference[];
  filteredReferences: Reference[];
  selectedTagsLength: number;
  activeFolderId: string | null;
  allRefsForFilter: any[] | null;
}

interface UseViewerOverridesReturn {
  viewerNoteOverride: NoteOverride | null;
  viewerTagsOverride: TagsOverride | null;
  viewerRotationOverride: RotationOverride | null;
  viewerCropOverride: CropOverride | null;
  setViewerNoteOverride: (override: NoteOverride | null) => void;
  setViewerTagsOverride: (override: TagsOverride | null) => void;
  setViewerRotationOverride: (override: RotationOverride | null) => void;
  setViewerCropOverride: (override: CropOverride | null) => void;
  applyOverridesToReference: (reference: Reference) => Reference;
}

export const useViewerOverrides = ({
  viewerOpen,
  currentIndex,
  references,
  folderReferences,
  filteredReferences,
  selectedTagsLength,
  activeFolderId,
  allRefsForFilter
}: UseViewerOverridesProps): UseViewerOverridesReturn => {
  const [viewerNoteOverride, setViewerNoteOverride] = useState<NoteOverride | null>(null);
  const [viewerTagsOverride, setViewerTagsOverride] = useState<TagsOverride | null>(null);
  const [viewerRotationOverride, setViewerRotationOverride] = useState<RotationOverride | null>(null);
  const [viewerCropOverride, setViewerCropOverride] = useState<CropOverride | null>(null);

  // Clear overrides only when the viewer fully closes
  useEffect(() => {
    if (!viewerOpen) {
      setViewerNoteOverride(null);
      setViewerTagsOverride(null);
      setViewerRotationOverride(null);
      setViewerCropOverride(null);
    }
  }, [viewerOpen]);

  // Recompute tag override when navigating between images
  useEffect(() => {
    if (!viewerOpen) return;
    const listForViewer = selectedTagsLength > 0 ? filteredReferences : (activeFolderId ? folderReferences : references);
    const ref = listForViewer[currentIndex];
    if (!ref) return;
    const byId = (arr: any[]) => Array.isArray(arr) ? arr.find(r => r.id === ref.id) : undefined;
    const freshest = byId(references as any) || byId(folderReferences as any) || byId(allRefsForFilter as any) || ref;
    const freshTags = Array.isArray(freshest?.tags) ? [...freshest.tags] : [];
    setViewerTagsOverride({ id: ref.id, tags: freshTags });
  }, [viewerOpen, currentIndex, references, folderReferences, filteredReferences, selectedTagsLength, activeFolderId, allRefsForFilter]);

  // Helper to apply all overrides to a reference
  const applyOverridesToReference = useCallback((reference: Reference): Reference => {
    let refWithOverrides = reference;
    
    if (viewerNoteOverride && viewerNoteOverride.id === reference.id) {
      refWithOverrides = { ...refWithOverrides, image_note: viewerNoteOverride.note } as Reference;
    }
    if (viewerTagsOverride && viewerTagsOverride.id === reference.id) {
      refWithOverrides = { ...refWithOverrides, tags: viewerTagsOverride.tags } as Reference;
    }
    if (viewerRotationOverride && viewerRotationOverride.id === reference.id) {
      refWithOverrides = { ...refWithOverrides, rotation: viewerRotationOverride.rotation } as Reference;
    }
    if (viewerCropOverride && viewerCropOverride.id === reference.id) {
      refWithOverrides = { ...refWithOverrides, crop: viewerCropOverride.crop } as Reference;
    }
    
    return refWithOverrides;
  }, [viewerNoteOverride, viewerTagsOverride, viewerRotationOverride, viewerCropOverride]);

  return {
    viewerNoteOverride,
    viewerTagsOverride,
    viewerRotationOverride,
    viewerCropOverride,
    setViewerNoteOverride,
    setViewerTagsOverride,
    setViewerRotationOverride,
    setViewerCropOverride,
    applyOverridesToReference
  };
};
