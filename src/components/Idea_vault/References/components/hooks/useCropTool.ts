import React from 'react';
import { ReferencesService } from '../../../../../services/referencesService';
import { imageRectToStageCrop, stageToImageRect, type StageLayout } from './useStageLayout';
import type { ReferenceViewerProps } from '../../types';
import type { CropAspectMode } from '../CropControls';

export const MIN_CROP_SIZE = 0.03;

type CropRect = { x: number; y: number; w: number; h: number };

type UseCropToolArgs = {
  reference: ReferenceViewerProps['reference'];
  crop: CropRect | null;
  normalizedRotation: number;
  imageUrl?: string;
  isLoading?: boolean;
  stageLayout: StageLayout;
  getStageLayoutFor: (rot: number) => StageLayout;
  cropStageRef: React.RefObject<HTMLDivElement | null>;
  onCropChange?: (id: string, crop: CropRect | null) => void;
  onCropModeChange?: (enabled: boolean) => void;
  onRotationChange?: (id: string, rotation: number) => void;
};

type RotationHandlers = {
  onSliderPointerDown: () => void;
  onSliderPointerUp: () => void;
  onSliderChange: (signed: number) => void;
  onInputFocus: () => void;
  onInputBlur: () => void;
  onInputChange: (value: string) => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

type CropPointerHandlers = {
  onCropPointerDown: (e: React.PointerEvent<HTMLDivElement>, kind: 'move' | 'nw' | 'ne' | 'sw' | 'se') => void;
  onCropPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onCropPointerUp: () => void;
};

export const useCropTool = ({
  reference,
  crop,
  normalizedRotation,
  imageUrl,
  isLoading,
  stageLayout,
  getStageLayoutFor,
  cropStageRef,
  onCropChange,
  onCropModeChange,
  onRotationChange,
}: UseCropToolArgs) => {
  const [cropMode, setCropMode] = React.useState(false);
  const [cropDraft, setCropDraft] = React.useState<CropRect | null>(null);
  const [cropOverlayBox, setCropOverlayBox] = React.useState<{
    left: number; top: number; w: number; h: number; cx: number; cy: number;
  } | null>(null);
  const cropDragRef = React.useRef<null | {
    kind: 'move' | 'nw' | 'ne' | 'sw' | 'se';
    start: { x: number; y: number };
    rect: CropRect;
  }>(null);
  const desiredCropScreenRef = React.useRef<null | { left: number; top: number; w: number; h: number }>(null);
  const suppressDesiredUpdateRef = React.useRef(false);

  const [cropAspectMode, setCropAspectMode] = React.useState<CropAspectMode>('free');
  const [customAspectW, setCustomAspectW] = React.useState<string>('1');
  const [customAspectH, setCustomAspectH] = React.useState<string>('1');

  const toSignedDeg = React.useCallback((deg: number) => {
    const n = ((deg % 360) + 360) % 360;
    return n > 180 ? n - 360 : n;
  }, []);
  const fromSignedDeg = React.useCallback((signed: number) => {
    const n = ((signed % 360) + 360) % 360;
    return n;
  }, []);
  const clampSignedDeg = React.useCallback((v: number) => {
    if (!Number.isFinite(v)) return 0;
    return Math.max(-180, Math.min(180, Math.round(v)));
  }, []);

  const [cropRotateSigned, setCropRotateSigned] = React.useState<number>(() => toSignedDeg(normalizedRotation));
  const [cropRotateInput, setCropRotateInput] = React.useState<string>(() => String(toSignedDeg(normalizedRotation)));
  const isRotationSliderDraggingRef = React.useRef(false);
  const isRotationInputEditingRef = React.useRef(false);

  React.useEffect(() => {
    if (isRotationSliderDraggingRef.current) return;
    if (isRotationInputEditingRef.current) return;
    setCropRotateSigned(toSignedDeg(normalizedRotation));
    setCropRotateInput(String(toSignedDeg(normalizedRotation)));
  }, [normalizedRotation, toSignedDeg]);

  const computeAspectRatioForMode = React.useCallback((mode: CropAspectMode): number | null => {
    const stageW = cropOverlayBox?.w ?? stageLayout.stageW;
    const stageH = cropOverlayBox?.h ?? stageLayout.stageH;
    if (!(stageW > 0 && stageH > 0)) return null;
    if (mode === 'original') {
      const imgW = stageLayout.imgW;
      const imgH = stageLayout.imgH;
      if (!(imgW > 0 && imgH > 0)) return null;
      const R = imgW / imgH;
      return R * (stageH / stageW);
    }
    if (mode === 'a_series_landscape') return 1.414 * (stageH / stageW);
    if (mode === 'a_series_portrait') return (1 / 1.414) * (stageH / stageW);
    if (mode === 'canvas_portrait_4_5') return (4 / 5) * (stageH / stageW);
    if (mode === 'canvas_landscape_5_4') return (5 / 4) * (stageH / stageW);
    if (mode === 'canvas_classic_3_4') return (3 / 4) * (stageH / stageW);
    if (mode === 'canvas_classic_4_3') return (4 / 3) * (stageH / stageW);
    if (mode === 'print_photo_2_3') return (2 / 3) * (stageH / stageW);
    if (mode === 'print_photo_3_2') return (3 / 2) * (stageH / stageW);
    if (mode === 'square') return 1 * (stageH / stageW);
    if (mode === 'custom') {
      const aw = parseFloat(customAspectW);
      const ah = parseFloat(customAspectH);
      if (!(Number.isFinite(aw) && Number.isFinite(ah) && aw > 0 && ah > 0)) return null;
      const R = aw / ah;
      return R * (stageH / stageW);
    }
    return null;
  }, [cropOverlayBox?.h, cropOverlayBox?.w, customAspectH, customAspectW, stageLayout.imgH, stageLayout.imgW, stageLayout.stageH, stageLayout.stageW]);

  const refitCropToRatio = React.useCallback((ratio: number) => {
    setCropDraft(prev => {
      if (!prev) return prev;
      let w = prev.w;
      let h = prev.h;
      if (w / h > ratio) {
        w = h * ratio;
      } else {
        h = w / ratio;
      }
      w = Math.max(MIN_CROP_SIZE, Math.min(1, w));
      h = Math.max(MIN_CROP_SIZE, Math.min(1, h));
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      let x = cx - w / 2;
      let y = cy - h / 2;
      x = Math.max(0, Math.min(1 - w, x));
      y = Math.max(0, Math.min(1 - h, y));
      return { x, y, w, h };
    });
  }, []);

  const handleAspectChange = React.useCallback((nextMode: CropAspectMode) => {
    setCropAspectMode(nextMode);
    if (nextMode === 'free') return;
    const ratio = computeAspectRatioForMode(nextMode);
    if (ratio && cropDraft) {
      refitCropToRatio(ratio);
    }
  }, [computeAspectRatioForMode, cropDraft, refitCropToRatio]);

  const handleCustomAspectBlur = React.useCallback(() => {
    if (cropAspectMode !== 'custom') return;
    const ratio = computeAspectRatioForMode('custom');
    if (ratio && cropDraft) {
      refitCropToRatio(ratio);
    }
  }, [computeAspectRatioForMode, cropAspectMode, cropDraft, refitCropToRatio]);

  const persistRotation = React.useCallback(async (next: number) => {
    if (onRotationChange) onRotationChange(reference.id, next);
    try {
      const updated = await ReferencesService.setRotation(reference.id, next);
      const persisted = ((updated as any)?.rotation ?? next) as number;
      if (onRotationChange) onRotationChange(reference.id, persisted);
    } catch {
      if (onRotationChange) onRotationChange(reference.id, normalizedRotation);
    }
  }, [onRotationChange, reference.id, normalizedRotation]);

  const commitCropRotation = React.useCallback((signed: number) => {
    const clamped = clampSignedDeg(signed);
    setCropRotateSigned(clamped);
    setCropRotateInput(String(clamped));
    const next = fromSignedDeg(clamped);
    if (cropMode) {
      if (onRotationChange) onRotationChange(reference.id, next);
      return;
    }
    persistRotation(next);
  }, [clampSignedDeg, cropMode, fromSignedDeg, onRotationChange, persistRotation, reference.id]);

  const handleRotationSliderPointerDown = React.useCallback(() => {
    isRotationSliderDraggingRef.current = true;
  }, []);

  const handleRotationSliderPointerUp = React.useCallback(() => {
    isRotationSliderDraggingRef.current = false;
  }, []);

  const handleRotationSliderChange = React.useCallback((signed: number) => {
    setCropRotateSigned(signed);
    setCropRotateInput(String(signed));
    const next = fromSignedDeg(signed);
    if (onRotationChange) onRotationChange(reference.id, next);
  }, [fromSignedDeg, onRotationChange, reference.id]);

  const handleRotationInputFocus = React.useCallback(() => {
    isRotationInputEditingRef.current = true;
  }, []);

  const handleRotationInputBlur = React.useCallback(() => {
    isRotationInputEditingRef.current = false;
    const v = Number(cropRotateInput);
    if (Number.isFinite(v)) {
      commitCropRotation(v);
    } else {
      setCropRotateInput(String(cropRotateSigned));
    }
  }, [commitCropRotation, cropRotateInput, cropRotateSigned]);

  const handleRotationInputChange = React.useCallback((value: string) => {
    setCropRotateInput(value);
    const v = Number(value);
    if (Number.isFinite(v)) {
      const clamped = clampSignedDeg(v);
      setCropRotateSigned(clamped);
      const next = fromSignedDeg(clamped);
      if (onRotationChange) onRotationChange(reference.id, next);
    }
  }, [clampSignedDeg, fromSignedDeg, onRotationChange, reference.id]);

  const handleRotationInputKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      isRotationInputEditingRef.current = false;
      const v = Number(cropRotateInput);
      if (Number.isFinite(v)) commitCropRotation(v);
      (e.currentTarget as HTMLInputElement).blur();
    }
  }, [commitCropRotation, cropRotateInput]);

  const rotateRight = React.useCallback(async () => {
    const next = (normalizedRotation + 90) % 360;
    let nextCrop = crop;
    if (!cropMode && crop && crop.w > 0 && crop.h > 0) {
      const imgRect = stageToImageRect(crop, normalizedRotation, stageLayout);
      const nextLayout = getStageLayoutFor(next);
      if (imgRect && nextLayout.stageW > 0 && nextLayout.stageH > 0) {
        const mapped = imageRectToStageCrop(imgRect, next, nextLayout);
        if (mapped) {
          let { x, y, w, h } = mapped;
          w = Math.max(MIN_CROP_SIZE, Math.min(1, w));
          h = Math.max(MIN_CROP_SIZE, Math.min(1, h));
          x = Math.max(0, Math.min(1 - w, x));
          y = Math.max(0, Math.min(1 - h, y));
          nextCrop = { x, y, w, h };
        }
      }
    }
    await persistRotation(next);
    if (onCropChange && nextCrop) {
      onCropChange(reference.id, nextCrop);
    }
  }, [crop, cropMode, getStageLayoutFor, normalizedRotation, onCropChange, persistRotation, reference.id, stageLayout]);

  const applyCrop = React.useCallback(() => {
    if (!cropDraft) return;
    const { x, y, w, h } = cropDraft;
    const minSize = MIN_CROP_SIZE;
    if (!(w >= minSize && h >= minSize)) return;
    if (onCropChange) {
      onCropChange(reference.id, { x, y, w, h });
    }
    setCropMode(false);
    onCropModeChange?.(false);
  }, [cropDraft, onCropChange, onCropModeChange, reference.id]);

  const enterCropMode = React.useCallback(() => {
    setCropMode(true);
    onCropModeChange?.(true);
    const draft = crop && crop.w > 0 && crop.h > 0 ? { ...crop } : { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
    setCropDraft(draft);
    desiredCropScreenRef.current = null;
    suppressDesiredUpdateRef.current = false;
  }, [crop, onCropModeChange]);

  const exitCropMode = React.useCallback(() => {
    setCropMode(false);
    onCropModeChange?.(false);
    setCropDraft(null);
    setCropOverlayBox(null);
    desiredCropScreenRef.current = null;
    suppressDesiredUpdateRef.current = false;
  }, [onCropModeChange]);

  const cancelCropMode = React.useCallback(() => {
    setCropMode(false);
    onCropModeChange?.(false);
    setCropDraft(null);
    setCropOverlayBox(null);
    desiredCropScreenRef.current = null;
    suppressDesiredUpdateRef.current = false;
  }, [onCropModeChange]);

  const restoreCrop = React.useCallback(() => {
    // Reset to original (no crop)
    setCropDraft(null);
    setCropOverlayBox(null);
    desiredCropScreenRef.current = null;
    suppressDesiredUpdateRef.current = false;
    setCropMode(false);
    onCropModeChange?.(false);
    if (onCropChange) onCropChange(reference.id, null);
  }, [onCropChange, onCropModeChange, reference.id]);

  const handleCropToggle = React.useCallback(() => {
    if (cropMode) {
      exitCropMode();
    } else {
      enterCropMode();
    }
  }, [cropMode, enterCropMode, exitCropMode]);

  const clientToCropNorm = React.useCallback((clientX: number, clientY: number) => {
    if (!cropOverlayBox) return { x: 0, y: 0 };
    const x = (clientX - cropOverlayBox.left) / cropOverlayBox.w;
    const y = (clientY - cropOverlayBox.top) / cropOverlayBox.h;
    return { x, y };
  }, [cropOverlayBox]);

  const onCropPointerDown = React.useCallback((e: React.PointerEvent<HTMLDivElement>, kind: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
    e.preventDefault();
    e.stopPropagation();
    if (!cropOverlayBox || !cropDraft) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startRect = { ...cropDraft };
    cropDragRef.current = { kind, start: { x: startX, y: startY }, rect: startRect };
  }, [cropDraft, cropOverlayBox]);

  const onCropPointerMove = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!cropDragRef.current || !cropDraft || !cropOverlayBox) return;
    e.preventDefault();
    const kind = cropDragRef.current.kind;
    const start = cropDragRef.current.start;
    const startRect = cropDragRef.current.rect;
    const { x: cx, y: cy } = clientToCropNorm(e.clientX, e.clientY);
    const { x: sx, y: sy } = clientToCropNorm(start.x, start.y);
    const dx = cx - sx;
    const dy = cy - sy;

    let x = startRect.x;
    let y = startRect.y;
    let w = startRect.w;
    let h = startRect.h;

    if (kind === 'move') {
      x = startRect.x + dx;
      y = startRect.y + dy;
    } else {
      // Resize from the dragged corner, keeping the opposite corner fixed.
      const opp = (() => {
        switch (kind) {
          case 'nw': return { x: startRect.x + startRect.w, y: startRect.y + startRect.h };
          case 'ne': return { x: startRect.x, y: startRect.y + startRect.h };
          case 'sw': return { x: startRect.x + startRect.w, y: startRect.y };
          case 'se': return { x: startRect.x, y: startRect.y };
          default: return { x: startRect.x + startRect.w, y: startRect.y + startRect.h };
        }
      })();
      const targetX = cx;
      const targetY = cy;
      const nxMin = Math.min(opp.x, targetX);
      const nyMin = Math.min(opp.y, targetY);
      const nxMax = Math.max(opp.x, targetX);
      const nyMax = Math.max(opp.y, targetY);
      x = nxMin;
      y = nyMin;
      w = nxMax - nxMin;
      h = nyMax - nyMin;
    }

    const ratio = (() => {
      const boxW = cropOverlayBox?.w ?? stageLayout.stageW;
      const boxH = cropOverlayBox?.h ?? stageLayout.stageH;
      if (!(boxW > 0 && boxH > 0)) return null;
      switch (cropAspectMode) {
        case 'free': return null;
        case 'custom': {
          const aw = parseFloat(customAspectW);
          const ah = parseFloat(customAspectH);
          if (!(Number.isFinite(aw) && Number.isFinite(ah) && aw > 0 && ah > 0)) return null;
          return (aw / ah) * (boxH / boxW);
        }
        case 'original': {
          const imgW = stageLayout.imgW;
          const imgH = stageLayout.imgH;
          if (!(imgW > 0 && imgH > 0)) return null;
          return (imgW / imgH) * (boxH / boxW);
        }
        case 'a_series_landscape': return 1.414 * (boxH / boxW);
        case 'a_series_portrait': return (1 / 1.414) * (boxH / boxW);
        case 'canvas_portrait_4_5': return (4 / 5) * (boxH / boxW);
        case 'canvas_landscape_5_4': return (5 / 4) * (boxH / boxW);
        case 'canvas_classic_3_4': return (3 / 4) * (boxH / boxW);
        case 'canvas_classic_4_3': return (4 / 3) * (boxH / boxW);
        case 'print_photo_2_3': return (2 / 3) * (boxH / boxW);
        case 'print_photo_3_2': return (3 / 2) * (boxH / boxW);
        case 'square': return 1 * (boxH / boxW);
        default: return null;
      }
    })();

    if (ratio && ratio > 0) {
      if (w > 0 && h > 0) {
        const current = w / h;
        if (current > ratio) {
          w = h * ratio;
        } else {
          h = w / ratio;
        }
      }
      const minH = ratio >= 1 ? MIN_CROP_SIZE : (MIN_CROP_SIZE / ratio);
      const minW = ratio >= 1 ? (MIN_CROP_SIZE * ratio) : MIN_CROP_SIZE;
      if (h < minH) { h = minH; w = h * ratio; }
      if (w < minW) { w = minW; h = w / ratio; }
      if (w > 1) { w = 1; h = w / ratio; }
      if (h > 1) { h = 1; w = h * ratio; }
      x = Math.max(0, Math.min(1 - w, x));
      y = Math.max(0, Math.min(1 - h, y));
    } else {
      w = Math.max(MIN_CROP_SIZE, Math.min(1, w));
      h = Math.max(MIN_CROP_SIZE, Math.min(1, h));
      x = Math.max(0, Math.min(1 - w, x));
      y = Math.max(0, Math.min(1 - h, y));
    }
    setCropDraft({ x, y, w, h });
  }, [clientToCropNorm, cropAspectMode, cropDraft, cropOverlayBox, customAspectH, customAspectW, stageLayout.imgH, stageLayout.imgW, stageLayout.stageH, stageLayout.stageW]);

  const onCropPointerUp = React.useCallback(() => {
    cropDragRef.current = null;
  }, []);

  React.useEffect(() => {
    if (!cropMode || !cropDraft || !cropOverlayBox) return;
    if (suppressDesiredUpdateRef.current) {
      suppressDesiredUpdateRef.current = false;
      return;
    }
    desiredCropScreenRef.current = {
      left: cropOverlayBox.left + cropDraft.x * cropOverlayBox.w,
      top: cropOverlayBox.top + cropDraft.y * cropOverlayBox.h,
      w: cropDraft.w * cropOverlayBox.w,
      h: cropDraft.h * cropOverlayBox.h
    };
  }, [cropMode, cropDraft, cropOverlayBox]);

  React.useEffect(() => {
    if (!cropMode || !cropDraft || !cropOverlayBox) return;
    const desired = desiredCropScreenRef.current;
    if (!desired) return;
    const wN = desired.w / cropOverlayBox.w;
    const hN = desired.h / cropOverlayBox.h;
    if (!(wN > 0 && hN > 0)) return;
    let w = Math.max(MIN_CROP_SIZE, Math.min(1, wN));
    let h = Math.max(MIN_CROP_SIZE, Math.min(1, hN));
    let x = (desired.left - cropOverlayBox.left) / cropOverlayBox.w;
    let y = (desired.top - cropOverlayBox.top) / cropOverlayBox.h;
    x = Math.max(0, Math.min(1 - w, x));
    y = Math.max(0, Math.min(1 - h, y));
    const close = (a: number, b: number) => Math.abs(a - b) < 1e-4;
    if (close(x, cropDraft.x) && close(y, cropDraft.y) && close(w, cropDraft.w) && close(h, cropDraft.h)) return;
    suppressDesiredUpdateRef.current = true;
    setCropDraft({ x, y, w, h });
  }, [cropOverlayBox?.left, cropOverlayBox?.top, cropOverlayBox?.w, cropOverlayBox?.h, cropMode, cropAspectMode, cropDraft]);

  React.useEffect(() => {
    setCropMode(false);
    onCropModeChange?.(false);
    setCropDraft(null);
    setCropOverlayBox(null);
    desiredCropScreenRef.current = null;
    suppressDesiredUpdateRef.current = false;
    const effectiveLoading = (!!isLoading) || !imageUrl;
    if (effectiveLoading) return;
  }, [imageUrl, reference.id, reference.filename, isLoading, onCropModeChange]);

  const updateCropOverlayBox = React.useCallback(() => {
    const el = cropStageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCropOverlayBox({
      left: rect.left,
      top: rect.top,
      w: rect.width,
      h: rect.height,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    });
  }, [cropStageRef]);

  const rotationHandlers: RotationHandlers = {
    onSliderPointerDown: handleRotationSliderPointerDown,
    onSliderPointerUp: handleRotationSliderPointerUp,
    onSliderChange: handleRotationSliderChange,
    onInputFocus: handleRotationInputFocus,
    onInputBlur: handleRotationInputBlur,
    onInputChange: handleRotationInputChange,
    onInputKeyDown: handleRotationInputKeyDown,
  };

  const cropPointerHandlers: CropPointerHandlers = {
    onCropPointerDown,
    onCropPointerMove,
    onCropPointerUp,
  };

  return {
    cropMode,
    cropDraft,
    cropOverlayBox,
    cropAspectMode,
    customAspectW,
    customAspectH,
    cropRotateSigned,
    cropRotateInput,
    setCustomAspectW,
    setCustomAspectH,
    handleAspectChange,
    handleCustomAspectBlur,
    rotationHandlers,
    rotateRight,
    applyCrop,
    cancelCropMode,
    restoreCrop,
    handleCropToggle,
    cropPointerHandlers,
    updateCropOverlayBox,
  };
};

