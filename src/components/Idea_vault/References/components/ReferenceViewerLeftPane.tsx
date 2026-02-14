import React from 'react';
import ViewerImageCanvas from './ViewerImageCanvas';
import CropOverlay from './CropOverlay';
import ReferenceViewerActions from './ReferenceViewerActions';
import { useStageLayout, computeStageLayoutFor, type Size } from './hooks/useStageLayout';
import { useCropTool } from './hooks/useCropTool';
import type { ReferenceViewerProps } from '../types';

type Props = Pick<
  ReferenceViewerProps,
  | 'reference'
  | 'imageUrl'
  | 'isLoading'
  | 'onPrev'
  | 'onNext'
  | 'onDelete'
  | 'onRotationChange'
  | 'onCropChange'
> & {
  onCropModeChange?: (enabled: boolean) => void;
  initialFullscreen?: boolean;
};

const ReferenceViewerLeftPane: React.FC<Props> = ({
  reference,
  imageUrl,
  isLoading,
  onPrev,
  onNext,
  onDelete,
  onRotationChange,
  onCropChange,
  onCropModeChange,
  initialFullscreen = false,
}) => {
  const [imageLoading, setImageLoading] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);
  const [brokenSrcGuard, setBrokenSrcGuard] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(initialFullscreen);
  const [naturalSize, setNaturalSize] = React.useState<Size>({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = React.useState<Size>({ w: 0, h: 0 });
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement | null>(null);
  const leftContainerRef = React.useRef<HTMLDivElement | null>(null);
  const cropStageRef = React.useRef<HTMLDivElement | null>(null);

  const rotation = ((reference as any)?.rotation ?? 0) as number;
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const crop = ((reference as any)?.crop ?? null) as { x: number; y: number; w: number; h: number } | null;
  const hasCrop = !!(crop && crop.w > 0 && crop.h > 0 && (crop.w < 0.999 || crop.h < 0.999 || crop.x > 0.001 || crop.y > 0.001));

  const stageLayout = useStageLayout(containerSize, naturalSize, normalizedRotation);

  const getStageLayoutFor = React.useCallback(
    (rot: number) => computeStageLayoutFor(containerSize, naturalSize, rot),
    [containerSize.w, containerSize.h, naturalSize.w, naturalSize.h]
  );

  const cropClipPath = React.useMemo(() => {
    const c = crop;
    if (!c) return undefined;
    const x = Math.max(0, Math.min(1, c.x));
    const y = Math.max(0, Math.min(1, c.y));
    const w = Math.max(0, Math.min(1 - x, c.w));
    const h = Math.max(0, Math.min(1 - y, c.h));
    const top = y * 100;
    const left = x * 100;
    const right = (1 - x - w) * 100;
    const bottom = (1 - y - h) * 100;
    return `inset(${top}% ${right}% ${bottom}% ${left}%)`;
  }, [crop?.x, crop?.y, crop?.w, crop?.h]);

  const {
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
  } = useCropTool({
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
  });

  const handleExport = React.useCallback(async () => {
    setMoreOpen(false);
    if (!imageUrl) return;
    try {
      const img = new Image();
      const srcUrl = imageUrl.startsWith('data:') ? imageUrl : imageUrl;
      img.crossOrigin = 'anonymous';
      const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = reject;
      });
      img.src = srcUrl;
      await loadPromise;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        // Prefer the stored original filename; fall back to current filename
        a.download = reference.original_name || reference.filename || 'image';
        a.click();
        setTimeout(() => {
          try { document.body.removeChild(a); } catch {}
          try { URL.revokeObjectURL(downloadUrl); } catch {}
        }, 1000);
      }, 'image/png', 0.95);
    } catch (e) {
      console.error('Export failed', e);
    }
  }, [imageUrl, reference]);

  const handlePrint = React.useCallback(async () => {
    setMoreOpen(false);
    if (!imageUrl) return;
    let objectUrl = '';
    try {
      const blob = await fetch(imageUrl).then(r => r.blob());
      objectUrl = URL.createObjectURL(blob);
    } catch {}
    const srcToUse = objectUrl || imageUrl;
    const srcParam = encodeURIComponent(srcToUse);
    const rotParam = encodeURIComponent(String(normalizedRotation));
    const cropParam = crop ? encodeURIComponent(JSON.stringify(crop)) : '';
    const cropQuery = cropParam ? `&crop=${cropParam}` : '';
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/window');
      const label = `image-viewer-${Date.now()}`;
      new WebviewWindow(label, {
        url: `/image-viewer.html?src=${srcParam}&rot=${rotParam}${cropQuery}&print=1`,
        title: 'Print',
        width: 1280,
        height: 900,
        resizable: true,
      });
      return;
    } catch {}
    window.open(`/image-viewer.html?src=${srcParam}&rot=${rotParam}${cropQuery}&print=1`, '_blank');
  }, [crop, imageUrl, normalizedRotation]);

  React.useEffect(() => {
    const el = leftContainerRef.current;
    if (!el) return;
    const update = () => {
      try {
        const rect = el.getBoundingClientRect();
        setContainerSize({ w: Math.max(0, rect.width * 0.95), h: Math.max(0, rect.height * 0.9) });
      } catch {}
    };
    update();
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => update());
      ro.observe(el);
    } catch {
      window.addEventListener('resize', update);
    }
    return () => {
      try { ro?.disconnect(); } catch {}
      try { window.removeEventListener('resize', update); } catch {}
    };
  }, []);

  React.useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!moreRef.current) return;
      if (!moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [moreOpen]);

  React.useEffect(() => {
    const effectiveLoading = (!!isLoading) || !imageUrl;
    setImageLoading(effectiveLoading);
    setImageError(false);
    setBrokenSrcGuard(false);
  }, [imageUrl, reference.id, reference.filename, isLoading]);

  // Keep crop overlay box in sync with the stage when layout changes or crop mode toggles on.
  React.useEffect(() => {
    if (!cropMode) return;
    const id = requestAnimationFrame(() => {
      try { updateCropOverlayBox(); } catch {}
    });
    return () => cancelAnimationFrame(id);
  }, [cropMode, stageLayout.stageW, stageLayout.stageH, updateCropOverlayBox]);

  const toggleFullscreen = React.useCallback(() => setIsFullscreen(v => !v), []);

  const handleToggleMore = React.useCallback(() => setMoreOpen(o => !o), []);

  const handleDelete = React.useCallback(() => {
    setMoreOpen(false);
    if (onDelete) onDelete(reference.id);
  }, [onDelete, reference.id]);

  const handleOpenInNewWindow = React.useCallback(async () => {
    if (!imageUrl) return;
    let objectUrl = '';
    try {
      const blob = await fetch(imageUrl).then(r => r.blob());
      objectUrl = URL.createObjectURL(blob);
    } catch {}
    const srcToUse = objectUrl || imageUrl;
    const srcParam = encodeURIComponent(srcToUse);
    const rotParam = encodeURIComponent(String(normalizedRotation));
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/window');
      const label = `image-viewer-${Date.now()}`;
      new WebviewWindow(label, {
        url: `/image-viewer.html?src=${srcParam}&rot=${rotParam}`,
        title: 'Image Preview',
        width: 1280,
        height: 900,
        resizable: true,
      });
      return;
    } catch {}
    const opened = window.open(srcToUse, '_blank');
    if (opened) return;
    try {
      const html = `<!doctype html>
<meta charset='utf-8'>
<title>Image Preview</title>
<style>
  html,body{height:100%;margin:0;background:#000}
  body{display:flex;align-items:center;justify-content:center;overflow:hidden}
  img{max-width:100vw;max-height:100vh;object-fit:contain;will-change:transform;transform-origin:center center}
</style>
<img id='img' alt='' />
<script>
  const img=document.getElementById('img');
  img.src='${srcToUse}';
  const rot=${normalizedRotation};
  img.style.transform='rotate('+rot+'deg)';
</script>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {}
  }, [imageUrl, normalizedRotation]);

  return (
    <div className="references-viewer-left" ref={leftContainerRef}>
      <ReferenceViewerActions
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onOpenInNewWindow={handleOpenInNewWindow}
        moreOpen={moreOpen}
        onToggleMore={handleToggleMore}
        onRequestDelete={onDelete ? handleDelete : undefined}
        onExport={handleExport}
        onPrint={handlePrint}
        moreRef={moreRef}
        rotationHandlers={{
          onRotateRight: rotateRight,
          ...rotationHandlers,
        }}
        cropControls={{
          cropMode,
          cropAspectMode,
          customAspectW,
          customAspectH,
          cropRotateSigned,
          cropRotateInput,
          onAspectChange: handleAspectChange,
          onCustomWidthChange: setCustomAspectW,
          onCustomHeightChange: setCustomAspectH,
          onCustomAspectBlur: handleCustomAspectBlur,
          onToggleCropMode: handleCropToggle,
          onApply: applyCrop,
          onCancel: cancelCropMode,
          onRestore: restoreCrop,
        }}
      />
      {imageLoading && (
        <div className="references-viewer-loading">
          <div className="references-viewer-loading-spinner">Loading...</div>
        </div>
      )}
      {imageUrl && (
        <div
          className="references-viewer-image-wrap"
          style={{
            width: '100%',
            height: '100%',
            display: imageLoading ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          <div
            ref={cropStageRef}
            style={{
              position: 'relative',
              width: stageLayout.stageW ? `${stageLayout.stageW}px` : '100%',
              height: stageLayout.stageH ? `${stageLayout.stageH}px` : '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              clipPath: (!cropMode && hasCrop) ? cropClipPath : undefined,
              WebkitClipPath: (!cropMode && hasCrop) ? cropClipPath : undefined
            }}
          >
            <div
              style={{
                width: stageLayout.imgW ? `${stageLayout.imgW}px` : 'auto',
                height: stageLayout.imgH ? `${stageLayout.imgH}px` : 'auto',
                transform: `rotate(${normalizedRotation}deg)`,
                transformOrigin: 'center center'
              }}
            >
              <img
                className="references-viewer-image"
                src={imageUrl}
                alt=""
                style={{
                  width: stageLayout.imgW ? '100%' : 'auto',
                  height: stageLayout.imgH ? '100%' : 'auto',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  display: 'block',
                  transition: 'none'
                }}
                onLoad={(e) => {
                  try {
                    const img = e.currentTarget as HTMLImageElement;
                    setNaturalSize({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
                  } catch {}
                  setImageLoading(false);
                  try { updateCropOverlayBox(); } catch {}
                }}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
              />
            </div>
          </div>
        </div>
      )}
      {imageUrl && !imageLoading && !imageError && !brokenSrcGuard && (
        <span style={{ display: 'none' }} onLoadCapture={() => setBrokenSrcGuard(true)} />
      )}
      {imageError && (
        <div className="references-viewer-error">
          <div className="references-viewer-error-message">Failed to load image</div>
        </div>
      )}

      <CropOverlay
        cropMode={cropMode}
        cropDraft={cropDraft}
        cropOverlayBox={cropOverlayBox}
        onCropPointerDown={cropPointerHandlers.onCropPointerDown}
        onCropPointerMove={cropPointerHandlers.onCropPointerMove}
        onCropPointerUp={cropPointerHandlers.onCropPointerUp}
      />

      {isFullscreen && (
        <ViewerImageCanvas
          imageUrl={imageUrl}
          rotation={normalizedRotation}
          crop={crop}
          onPrev={onPrev}
          onNext={onNext}
          onExit={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
};

export default ReferenceViewerLeftPane;

