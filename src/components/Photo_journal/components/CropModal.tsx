import React, { useEffect, useRef } from 'react';

interface CropModalProps {
  imageUrl: string;
  cropRect: { x: number; y: number; w: number; h: number } | null;
  setCropRect: (rect: { x: number; y: number; w: number; h: number } | null) => void;
  isSelecting: boolean;
  setIsSelecting: (v: boolean) => void;
  selectStart: { x: number; y: number };
  setSelectStart: (p: { x: number; y: number }) => void;
  cropNaturalSize: { w: number; h: number };
  setCropNaturalSize: (s: { w: number; h: number }) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const CropModal: React.FC<CropModalProps> = ({
  imageUrl,
  cropRect,
  setCropRect,
  isSelecting,
  setIsSelecting,
  selectStart,
  setSelectStart,
  cropNaturalSize: _cropNaturalSize,
  setCropNaturalSize,
  onCancel,
  onConfirm
}) => {
  // _cropNaturalSize is available via props if needed for display/debugging
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imageBox, setImageBox] = React.useState<{ left: number; top: number; width: number; height: number }>({ left: 0, top: 0, width: 0, height: 0 });

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const onLoad = () => {
      setCropNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setCropRect({ x: 0, y: 0, w: 1, h: 1 });
      requestAnimationFrame(() => {
        if (!imgRef.current || !containerRef.current) return;
        const imgRect = imgRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        setImageBox({
          left: imgRect.left - containerRect.left,
          top: imgRect.top - containerRect.top,
          width: imgRect.width,
          height: imgRect.height
        });
      });
    };
    img.addEventListener('load', onLoad);
    return () => {
      img.removeEventListener('load', onLoad);
    };
  }, [imageUrl, setCropNaturalSize, setCropRect]);

  useEffect(() => {
    const updateBox = () => {
      if (!imgRef.current || !containerRef.current) return;
      const imgRect = imgRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      setImageBox({
        left: imgRect.left - containerRect.left,
        top: imgRect.top - containerRect.top,
        width: imgRect.width,
        height: imgRect.height
      });
    };
    updateBox();
    window.addEventListener('resize', updateBox);
    return () => window.removeEventListener('resize', updateBox);
  }, [imageUrl]);

  const dragRef = useRef<null | { kind: 'new' | 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se'; startX: number; startY: number; startRect: { x: number; y: number; w: number; h: number } | null }>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current || imageBox.width <= 0 || imageBox.height <= 0) return;
    const bounds = containerRef.current.getBoundingClientRect();
    const withinX = e.clientX >= bounds.left + imageBox.left && e.clientX <= bounds.left + imageBox.left + imageBox.width;
    const withinY = e.clientY >= bounds.top + imageBox.top && e.clientY <= bounds.top + imageBox.top + imageBox.height;
    if (!withinX || !withinY) return;
    const p = {
      x: (e.clientX - (bounds.left + imageBox.left)) / imageBox.width,
      y: (e.clientY - (bounds.top + imageBox.top)) / imageBox.height
    };
    const r = normalizedRect;
    const handleSize = 12;

    // Detect handle hit
    let kind: 'new' | 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' = 'new';
    if (r) {
      const px = r.x * imageBox.width;
      const py = r.y * imageBox.height;
      const pw = r.w * imageBox.width;
      const ph = r.h * imageBox.height;
      const relX = e.clientX - (bounds.left + imageBox.left);
      const relY = e.clientY - (bounds.top + imageBox.top);
      const onNW = Math.abs(relX - px) < handleSize && Math.abs(relY - py) < handleSize;
      const onNE = Math.abs(relX - (px + pw)) < handleSize && Math.abs(relY - py) < handleSize;
      const onSW = Math.abs(relX - px) < handleSize && Math.abs(relY - (py + ph)) < handleSize;
      const onSE = Math.abs(relX - (px + pw)) < handleSize && Math.abs(relY - (py + ph)) < handleSize;
      if (onNW) kind = 'resize-nw';
      else if (onNE) kind = 'resize-ne';
      else if (onSW) kind = 'resize-sw';
      else if (onSE) kind = 'resize-se';
      else if (
        relX >= px &&
        relX <= px + pw &&
        relY >= py &&
        relY <= py + ph
      ) {
        kind = 'move';
      }
    }

    dragRef.current = { kind, startX: p.x, startY: p.y, startRect: normalizedRect };
    setIsSelecting(true);
    if (kind === 'new' || !normalizedRect) {
      setSelectStart(p);
      setCropRect({ x: p.x, y: p.y, w: 0, h: 0 });
    }
  };

  const clampRect = (rect: { x: number; y: number; w: number; h: number }) => {
    const minSize = 0.01;
    let { x, y, w, h } = rect;
    w = Math.max(minSize, w);
    h = Math.max(minSize, h);
    x = Math.max(0, Math.min(1 - w, x));
    y = Math.max(0, Math.min(1 - h, y));
    return { x, y, w, h };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !containerRef.current || !dragRef.current || imageBox.width <= 0 || imageBox.height <= 0) return;
    const bounds = containerRef.current.getBoundingClientRect();
    const p = {
      x: (e.clientX - (bounds.left + imageBox.left)) / imageBox.width,
      y: (e.clientY - (bounds.top + imageBox.top)) / imageBox.height
    };
    const start = dragRef.current;

    if (start.kind === 'new') {
      const w = p.x - selectStart.x;
      const h = p.y - selectStart.y;
      setCropRect(clampRect({
        x: Math.min(selectStart.x, selectStart.x + w),
        y: Math.min(selectStart.y, selectStart.y + h),
        w: Math.abs(w),
        h: Math.abs(h)
      }));
      return;
    }

    const base = start.startRect || { x: 0, y: 0, w: 1, h: 1 };
    let { x, y, w, h } = base;
    const dx = p.x - start.startX;
    const dy = p.y - start.startY;

    if (start.kind === 'move') {
      x += dx;
      y += dy;
      setCropRect(clampRect({ x, y, w, h }));
      return;
    }

    // resize corners
    if (start.kind === 'resize-nw') {
      const newX = x + dx;
      const newY = y + dy;
      const newW = w - dx;
      const newH = h - dy;
      setCropRect(clampRect({ x: newX, y: newY, w: newW, h: newH }));
      return;
    }
    if (start.kind === 'resize-ne') {
      const newY = y + dy;
      const newW = w + dx;
      const newH = h - dy;
      setCropRect(clampRect({ x, y: newY, w: newW, h: newH }));
      return;
    }
    if (start.kind === 'resize-sw') {
      const newX = x + dx;
      const newW = w - dx;
      const newH = h + dy;
      setCropRect(clampRect({ x: newX, y, w: newW, h: newH }));
      return;
    }
    if (start.kind === 'resize-se') {
      const newW = w + dx;
      const newH = h + dy;
      setCropRect(clampRect({ x, y, w: newW, h: newH }));
      return;
    }
  };

  const handleMouseUp = () => {
    if (isSelecting) {
      setIsSelecting(false);
      dragRef.current = null;
    }
  };

  const normalizedRect = cropRect
    ? {
        x: Math.max(0, Math.min(cropRect.x, 1)),
        y: Math.max(0, Math.min(cropRect.y, 1)),
        w: Math.max(0, Math.min(cropRect.w, 1 - Math.max(0, Math.min(cropRect.x, 1)))),
        h: Math.max(0, Math.min(cropRect.h, 1 - Math.max(0, Math.min(cropRect.y, 1))))
      }
    : null;

  return (
    <div className="crop-modal-overlay" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="crop-modal">
        <div className="crop-modal-header">
          <h3>Crop Scan</h3>
          <button className="crop-modal-close" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>
        <div
          className="crop-modal-body"
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          <img ref={imgRef} src={imageUrl} alt="Scanned" className="crop-modal-image" />
          {normalizedRect && imageBox.width > 0 && imageBox.height > 0 && (
            <div
              className="crop-layer"
              style={{
                left: `${imageBox.left}px`,
                top: `${imageBox.top}px`,
                width: `${imageBox.width}px`,
                height: `${imageBox.height}px`
              }}
            >
              <div
                className="crop-rect"
                style={{
                  left: `${normalizedRect.x * 100}%`,
                  top: `${normalizedRect.y * 100}%`,
                  width: `${normalizedRect.w * 100}%`,
                  height: `${normalizedRect.h * 100}%`
                }}
              />
              <div className="crop-handle nw" style={{ left: `${normalizedRect.x * 100}%`, top: `${normalizedRect.y * 100}%` }} />
              <div className="crop-handle ne" style={{ left: `${(normalizedRect.x + normalizedRect.w) * 100}%`, top: `${normalizedRect.y * 100}%` }} />
              <div className="crop-handle sw" style={{ left: `${normalizedRect.x * 100}%`, top: `${(normalizedRect.y + normalizedRect.h) * 100}%` }} />
              <div className="crop-handle se" style={{ left: `${(normalizedRect.x + normalizedRect.w) * 100}%`, top: `${(normalizedRect.y + normalizedRect.h) * 100}%` }} />
            </div>
          )}
        </div>
        <div className="crop-modal-footer">
          <button className="crop-modal-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="crop-modal-button primary" onClick={onConfirm}>
            Confirm Crop
          </button>
        </div>
      </div>
    </div>
  );
};

export default CropModal;

