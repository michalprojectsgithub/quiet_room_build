import React from 'react';
import { ReferencesService } from '../../../services/referencesService';
import { PhotoJournalService } from '../../../services/photoJournalService';
import type { Reference } from '../../../services/referencesService';
import TauriService from '../../../services/tauriService';

type UseReferenceLinkingParams = {
  sortedImages: any[];
  currentIndex: number;
  viewerOpen: boolean;
};

export const useReferenceLinking = ({ sortedImages, currentIndex, viewerOpen }: UseReferenceLinkingParams) => {
  // Reference picker
  const [showReferencePicker, setShowReferencePicker] = React.useState(false);
  const [referenceImages, setReferenceImages] = React.useState<Reference[]>([]);
  const [referenceThumbUrls, setReferenceThumbUrls] = React.useState<Map<string, string>>(new Map());
  const [loadingReferences, setLoadingReferences] = React.useState(false);

  // Linked reference state
  const [linkedRefThumbUrl, setLinkedRefThumbUrl] = React.useState<string>('');
  const [linkedRefs, setLinkedRefs] = React.useState<Map<string, string>>(new Map());
  const [unlinkedIds, setUnlinkedIds] = React.useState<Set<string>>(new Set());

  // Preview positioning
  const [previewHidden, setPreviewHidden] = React.useState<boolean>(false);
  const [previewPos, setPreviewPos] = React.useState<{ x: number; y: number }>({ x: 20, y: 110 });
  const [dragging, setDragging] = React.useState<boolean>(false);
  const previewSizeRef = React.useRef<{ width: number; height: number }>({ width: 200, height: 200 });
  const containerRectRef = React.useRef<DOMRect | null>(null);
  const pointerDownRef = React.useRef<boolean>(false);
  const startClientRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragOffsetRef = React.useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const isDraggingRef = React.useRef<boolean>(false);

  // Compare modal
  const [compareOpen, setCompareOpen] = React.useState<boolean>(false);
  const [compareRefUrl, setCompareRefUrl] = React.useState<string>('');

  const currentImage = viewerOpen && sortedImages.length > 0 ? sortedImages[currentIndex] : null;
  const currentLinked = React.useMemo(() => {
    if (!currentImage) return false;
    const linkedLocal = linkedRefs.has(currentImage.id);
    const linkedFromImage = Boolean((currentImage as any).referenceId);
    const wasUnlinked = unlinkedIds.has(currentImage.id);
    return linkedLocal || (linkedFromImage && !wasUnlinked);
  }, [currentImage, linkedRefs, unlinkedIds]);

  const openReferencePicker = React.useCallback(async () => {
    setShowReferencePicker(true);
    setLoadingReferences(true);
    try {
      const refs = await ReferencesService.getReferences();
      const main = refs.filter(r => r.location === 'main' || !r.location);
      setReferenceImages(main);
      const urlPromises = main.map(async (ref) => {
        try {
          const url = await ReferencesService.getReferenceThumbnailUrl(ref as any);
          return { id: ref.id, url };
        } catch (e) {
          console.error('Failed to load reference thumb', ref.id, e);
          return { id: ref.id, url: '' };
        }
      });
      const results = await Promise.all(urlPromises);
      setReferenceThumbUrls(new Map(results.map(r => [r.id, r.url])));
    } finally {
      setLoadingReferences(false);
    }
  }, []);

  const closeReferencePicker = React.useCallback(() => {
    setShowReferencePicker(false);
  }, []);

  const handleReferenceLinked = React.useCallback(async (referenceId: string, thumbUrl?: string) => {
    if (currentImage) {
      setLinkedRefs(prev => new Map(prev).set(currentImage.id, referenceId));
      setUnlinkedIds(prev => { const next = new Set(prev); next.delete(currentImage.id); return next; });
    }
    if (thumbUrl) {
      setLinkedRefThumbUrl(thumbUrl);
    } else {
      try {
        const refs = await ReferencesService.getReferences();
        const ref = refs.find(r => r.id === referenceId);
        if (ref) {
          const t = await ReferencesService.getReferenceThumbnailUrl(ref);
          setLinkedRefThumbUrl(t || '');
        }
      } catch {}
    }
  }, [currentImage]);

  const handleUnlinkReference = React.useCallback(async () => {
    try {
      if (!currentImage) return;
      await PhotoJournalService.unlinkReference(currentImage.id);
      setLinkedRefThumbUrl('');
      setLinkedRefs((prev: Map<string, string>) => {
        const map = new Map(prev);
        map.delete(currentImage.id);
        return map;
      });
      setUnlinkedIds((prev) => {
        const next = new Set(prev);
        next.add(currentImage.id);
        return next;
      });
    } catch (err) {
      console.error('Failed to unlink reference', err);
    }
  }, [currentImage]);

  React.useEffect(() => {
    const loadLinkedRefThumb = async () => {
      if (!currentImage) {
        setLinkedRefThumbUrl('');
        return;
      }
      const refId = linkedRefs.get(currentImage.id) || (currentImage as any).referenceId as string | undefined;
      if (!refId) {
        setLinkedRefThumbUrl('');
        return;
      }
      try {
        const refs = await ReferencesService.getReferences();
        const ref = refs.find(r => r.id === refId);
        if (!ref) {
          setLinkedRefThumbUrl('');
          return;
        }
        const thumb = await ReferencesService.getReferenceThumbnailUrl(ref);
        setLinkedRefThumbUrl(thumb || '');
      } catch (e) {
        console.error('Failed to load linked reference thumbnail', e);
        setLinkedRefThumbUrl('');
      }
    };
    loadLinkedRefThumb();
  }, [currentImage, linkedRefs]);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('photoJournal.refPreviewPos');
      if (saved) {
        const { x, y } = JSON.parse(saved);
        if (typeof x === 'number' && typeof y === 'number') {
          setPreviewPos({ x, y });
        }
      }
      const hidden = localStorage.getItem('photoJournal.refPreviewHidden');
      if (hidden === 'true') setPreviewHidden(true);
    } catch {}
  }, []);

  const savePreviewPos = React.useCallback((x: number, y: number) => {
    setPreviewPos({ x, y });
    try { localStorage.setItem('photoJournal.refPreviewPos', JSON.stringify({ x, y })); } catch {}
  }, []);

  const handleHidePreview = React.useCallback(() => {
    setPreviewHidden(true);
    try { localStorage.setItem('photoJournal.refPreviewHidden', 'true'); } catch {}
  }, []);

  const handleShowPreview = React.useCallback(() => {
    setPreviewHidden(false);
    try { localStorage.setItem('photoJournal.refPreviewHidden', 'false'); } catch {}
  }, []);

  const handlePreviewMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // only left click initiates drag
    e.preventDefault();
    e.stopPropagation();
    if ((e.target as HTMLElement).closest('.viewer-linked-ref-overlay')) return;
    const previewEl = e.currentTarget as HTMLDivElement;
    const rect = previewEl.getBoundingClientRect();
    previewSizeRef.current = { width: rect.width, height: rect.height };
    const container = document.querySelector('.image-viewer-modal') as HTMLElement | null;
    containerRectRef.current = container?.getBoundingClientRect() || null;
    pointerDownRef.current = true;
    isDraggingRef.current = false;
    setDragging(false);
    dragOffsetRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    startClientRef.current = { x: e.clientX, y: e.clientY };

    const onMove = (evt: MouseEvent) => {
      if (!containerRectRef.current || !pointerDownRef.current) return;
      const movedX = Math.abs(evt.clientX - startClientRef.current.x);
      const movedY = Math.abs(evt.clientY - startClientRef.current.y);
      const movedEnough = movedX + movedY > 4; // threshold to avoid click jitters
      if (!isDraggingRef.current) {
        if (!movedEnough) return; // do nothing until threshold passed
        isDraggingRef.current = true;
        setDragging(true);
      }
      const bounds = containerRectRef.current;
      const newX = evt.clientX - dragOffsetRef.current.dx - bounds.left;
      const newY = evt.clientY - dragOffsetRef.current.dy - bounds.top;
      const maxX = bounds.width - previewSizeRef.current.width - 20;
      const maxY = bounds.height - previewSizeRef.current.height - 20;
      savePreviewPos(Math.max(0, Math.min(newX, maxX)), Math.max(0, Math.min(newY, maxY)));
    };

    const onUp = () => {
      pointerDownRef.current = false;
      isDraggingRef.current = false;
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [savePreviewPos]);

  const openCompare = React.useCallback(async () => {
    try {
      if (!currentImage) return;
      const refId = linkedRefs.get(currentImage.id) || (currentImage as any).referenceId as string | undefined;
      if (!refId) return;
      const refs = await ReferencesService.getReferences();
      const ref = refs.find(r => r.id === refId);
      if (!ref) return;
      const url = await TauriService.getReferenceUrl(ref);
      setCompareRefUrl(url || '');
      setCompareOpen(true);
    } catch (e) {
      console.error('Failed to open compare view', e);
    }
  }, [currentImage, linkedRefs]);

  React.useEffect(() => {
    const updateCompareRef = async () => {
      if (!compareOpen) return;
      if (!currentImage) return;
      const refId = linkedRefs.get(currentImage.id) || (currentImage as any).referenceId as string | undefined;
      if (!refId) {
        setCompareRefUrl('');
        return;
      }
      try {
        const refs = await ReferencesService.getReferences();
        const ref = refs.find(r => r.id === refId);
        if (!ref) {
          setCompareRefUrl('');
          return;
        }
        const url = await TauriService.getReferenceUrl(ref);
        setCompareRefUrl(url || '');
      } catch (e) {
        console.error('Failed to refresh compare view reference', e);
        setCompareRefUrl('');
      }
    };
    updateCompareRef();
  }, [compareOpen, currentImage, linkedRefs]);

  return {
    // picker
    showReferencePicker,
    referenceImages,
    referenceThumbUrls,
    loadingReferences,
    openReferencePicker,
    closeReferencePicker,
    handleReferenceLinked,
    // linked state
    linkedRefThumbUrl,
    linkedRefs,
    unlinkedIds,
    currentLinked,
    handleUnlinkReference,
    // preview overlay
    previewHidden,
    previewPos,
    dragging,
    handlePreviewMouseDown,
    handleHidePreview,
    handleShowPreview,
    // compare
    compareOpen,
    compareRefUrl,
    openCompare,
    setCompareOpen,
  };
};

