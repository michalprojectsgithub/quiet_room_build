import React from 'react';
import ViewerImageCanvas from '../Idea_vault/References/components/ViewerImageCanvas';
import MasterStudyViewerActions from './MasterStudyViewerActions';
import type { Reference } from '../Idea_vault/References/types';

type Size = { w: number; h: number };

type Props = {
  reference: Reference;
  imageUrl: string;
  isLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
};

/**
 * Simplified left pane for Master Studies (no rotation, no crop, read-only)
 */
const MasterStudyViewerLeftPane: React.FC<Props> = ({
  reference,
  imageUrl,
  isLoading,
  onPrev,
  onNext,
}) => {
  const [imageLoading, setImageLoading] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement | null>(null);
  const leftContainerRef = React.useRef<HTMLDivElement | null>(null);

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
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/window');
      const label = `image-viewer-${Date.now()}`;
      new WebviewWindow(label, {
        url: `/image-viewer.html?src=${srcParam}&print=1`,
        title: 'Print',
        width: 1280,
        height: 900,
        resizable: true,
      });
      return;
    } catch {}
    window.open(`/image-viewer.html?src=${srcParam}&print=1`, '_blank');
  }, [imageUrl]);

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
  }, [imageUrl, reference.id, reference.filename, isLoading]);

  const toggleFullscreen = React.useCallback(() => setIsFullscreen(v => !v), []);

  const handleToggleMore = React.useCallback(() => setMoreOpen(o => !o), []);

  const handleOpenInNewWindow = React.useCallback(async () => {
    if (!imageUrl) return;
    let objectUrl = '';
    try {
      const blob = await fetch(imageUrl).then(r => r.blob());
      objectUrl = URL.createObjectURL(blob);
    } catch {}
    const srcToUse = objectUrl || imageUrl;
    const srcParam = encodeURIComponent(srcToUse);
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/window');
      const label = `image-viewer-${Date.now()}`;
      new WebviewWindow(label, {
        url: `/image-viewer.html?src=${srcParam}`,
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
  img{max-width:100vw;max-height:100vh;object-fit:contain}
</style>
<img id='img' alt='' />
<script>
  const img=document.getElementById('img');
  img.src='${srcToUse}';
</script>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {}
  }, [imageUrl]);

  return (
    <div className="references-viewer-left" ref={leftContainerRef}>
      <MasterStudyViewerActions
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onOpenInNewWindow={handleOpenInNewWindow}
        moreOpen={moreOpen}
        onToggleMore={handleToggleMore}
        onExport={handleExport}
        onPrint={handlePrint}
        moreRef={moreRef}
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
          <img
            className="references-viewer-image"
            src={imageUrl}
            alt={reference.original_name}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              display: 'block',
              objectFit: 'contain'
            }}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />
        </div>
      )}
      {imageError && (
        <div className="references-viewer-error">
          <div className="references-viewer-error-message">Failed to load image</div>
        </div>
      )}

      {isFullscreen && (
        <ViewerImageCanvas
          imageUrl={imageUrl}
          rotation={0}
          crop={null}
          onPrev={onPrev}
          onNext={onNext}
          onExit={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
};

export default MasterStudyViewerLeftPane;
