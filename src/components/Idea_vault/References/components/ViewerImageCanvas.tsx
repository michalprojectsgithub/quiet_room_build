import React from 'react';
import ViewerGridLayer from './viewer/ViewerGridLayer';
import ViewerLoupeOverlay from './viewer/ViewerLoupeOverlay';
import ViewerMeasurementOverlay from './viewer/ViewerMeasurementOverlay';
import ViewerMeasurementPanel from './viewer/ViewerMeasurementPanel';
import ViewerZoomControls from './viewer/ViewerZoomControls';
import ViewerActionButtons from './viewer/ViewerActionButtons';

export interface ViewerImageCanvasProps {
  imageUrl: string;
  rotation?: number;
  crop?: { x: number; y: number; w: number; h: number } | null;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
}

const ViewerImageCanvas: React.FC<ViewerImageCanvasProps> = ({ imageUrl, rotation = 0, crop = null, onPrev, onNext, onExit }) => {
  const [isMonochrome, setIsMonochrome] = React.useState(false);
  const [showGrid, setShowGrid] = React.useState(false);
  const [gridColor, setGridColor] = React.useState<'white' | 'black' | 'red'>('white');
  const [gridHCount, setGridHCount] = React.useState<number>(1);
  const [gridVCount, setGridVCount] = React.useState<number>(1);
  const [naturalSize, setNaturalSize] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [loupeOn, setLoupeOn] = React.useState(false);
  // loupeStagePos: cursor position within the screen-aligned STAGE (0..1), used to pan the mini-stage under the loupe.
  const [loupeStagePos, setLoupeStagePos] = React.useState<{sx:number,sy:number}>({ sx: 0.5, sy: 0.5 });
  // loupeScreenPos: cursor position on screen (client coords), used for positioning the loupe circle
  const [loupeScreenPos, setLoupeScreenPos] = React.useState<{x:number,y:number}>({ x: 0, y: 0 });
  const [loupeReady, setLoupeReady] = React.useState(false);
  const [isHoveringImage, setIsHoveringImage] = React.useState(false);
	const [measureOn, setMeasureOn] = React.useState(false);
	// Measurement mode and calibration
	const [measurementMode, setMeasurementMode] = React.useState<'relative' | 'absolute'>('relative');
	const [absWidth, setAbsWidth] = React.useState<string>('');
	const [absHeight, setAbsHeight] = React.useState<string>('');
	const [showSideDistance, setShowSideDistance] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState<{x:number,y:number}>({ x: 0, y: 0 });
  const isPanningRef = React.useRef(false);
  const lastPosRef = React.useRef<{x:number,y:number}>({ x: 0, y: 0 });
  const fullscreenImgRef = React.useRef<HTMLImageElement | null>(null);
  const [measurePoints, setMeasurePoints] = React.useState<Array<{ nx: number; ny: number }>>([]);
  const [draggingMeasureIdx, setDraggingMeasureIdx] = React.useState<number | null>(null);
  const [sideCursor, setSideCursor] = React.useState<{ nx: number; ny: number } | null>(null);
  const [sideDistanceBox, setSideDistanceBox] = React.useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const fullscreenContainerRef = React.useRef<HTMLDivElement | null>(null);

	// Hover states for panel action buttons
	const [hoverUndo, setHoverUndo] = React.useState(false);
	const [hoverReset, setHoverReset] = React.useState(false);
	// Measure label column width to align helper text end with input end
	const widthLabelRef = React.useRef<HTMLSpanElement | null>(null);
	const [labelColWidth, setLabelColWidth] = React.useState(0);
	// Editing flags to prevent auto-sync overriding user input while backspacing
	const [isEditingWidth, setIsEditingWidth] = React.useState(false);
	const [isEditingHeight, setIsEditingHeight] = React.useState(false);
	// Compute a snug panel width: label column + gap + input width + horizontal padding
	const computedPanelWidth = React.useMemo(() => {
		const label = labelColWidth || 50; // fallback for first render
		const contentWidth = label + 8 + 160; // label + gap + input
		const total = contentWidth + 16; // add panel padding (8px left + 8px right)
		// Clamp to a reasonable range to avoid jitter
		return Math.max(240, Math.min(300, Math.round(total)));
	}, [labelColWidth]);

  const gridLineColor = React.useMemo(() => {
    switch (gridColor) {
      case 'black': return 'rgba(0,0,0,0.85)';
      case 'red': return 'rgba(255,0,0,0.85)';
      case 'white':
      default: return 'rgba(255,255,255,0.85)';
    }
  }, [gridColor]);

  const normalizedRotation = React.useMemo(() => {
    const r = ((rotation % 360) + 360) % 360;
    return r;
  }, [rotation]);
  const isRightAngle = normalizedRotation === 90 || normalizedRotation === 270;

  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = React.useState<{ w: number; h: number }>({ w: window.innerWidth, h: window.innerHeight });
  React.useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const stagePx = React.useMemo(() => {
    // Deterministic stage sizing to avoid 0x0 collapse: compute from natural image size + viewport.
    const nw = naturalSize.w;
    const nh = naturalSize.h;
    const vw = viewport.w;
    const vh = viewport.h;
    if (!(nw > 0 && nh > 0 && vw > 0 && vh > 0)) return { stageW: vw || 0, stageH: vh || 0, imgW: 0, imgH: 0 };

    const baseScale = Math.min(1, vw / nw, vh / nh); // no upscaling beyond 1 (matches max-width/height behavior)
    const imgW = nw * baseScale;
    const imgH = nh * baseScale;
    const t = (normalizedRotation * Math.PI) / 180;
    const c = Math.abs(Math.cos(t));
    const s = Math.abs(Math.sin(t));
    const stageW = imgW * c + imgH * s;
    const stageH = imgW * s + imgH * c;
    return { stageW: stageW || 0, stageH: stageH || 0, imgW: imgW || 0, imgH: imgH || 0 };
  }, [naturalSize.w, naturalSize.h, viewport.w, viewport.h, normalizedRotation]);

  const cropClipPath = React.useMemo(() => {
    const c = crop;
    if (!c || !(c.w > 0 && c.h > 0)) return undefined;
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
  // Crop is stored in normalized STAGE coords (stage is rotated AABB).
  const cropRect = React.useMemo(() => {
    const c = crop;
    if (!c || !(c.w > 0 && c.h > 0)) return null;
    const x = Math.max(0, Math.min(1, c.x));
    const y = Math.max(0, Math.min(1, c.y));
    const w = Math.max(0, Math.min(1 - x, c.w));
    const h = Math.max(0, Math.min(1 - y, c.h));
    return { x, y, w, h };
  }, [crop?.x, crop?.y, crop?.w, crop?.h]);

  // Many tools operate in unrotated image normalized coords. Convert stage-crop to an approximate
  // unrotated-image crop AABB by inverse-rotating the stage crop corners.
  const cropRectImage = React.useMemo(() => {
    if (!cropRect) return null;
    const { stageW, stageH, imgW, imgH } = stagePx;
    if (!(stageW > 0 && stageH > 0 && imgW > 0 && imgH > 0)) return null;

    const toImageNorm = (sx: number, sy: number) => {
      // Stage local coords (px) centered at 0,0
      const ux = (sx - 0.5) * stageW;
      const uy = (sy - 0.5) * stageH;
      // Undo rotation around center to get into unrotated image plane
      const theta = (-normalizedRotation * Math.PI) / 180;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const ix = ux * cos - uy * sin;
      const iy = ux * sin + uy * cos;
      const nx = (ix + imgW / 2) / imgW;
      const ny = (iy + imgH / 2) / imgH;
      return { nx, ny };
    };

    const corners = [
      toImageNorm(cropRect.x, cropRect.y),
      toImageNorm(cropRect.x + cropRect.w, cropRect.y),
      toImageNorm(cropRect.x, cropRect.y + cropRect.h),
      toImageNorm(cropRect.x + cropRect.w, cropRect.y + cropRect.h),
    ];
    const xs = corners.map(p => p.nx);
    const ys = corners.map(p => p.ny);
    let minX = Math.min(...xs);
    let maxX = Math.max(...xs);
    let minY = Math.min(...ys);
    let maxY = Math.max(...ys);
    minX = Math.max(0, Math.min(1, minX));
    maxX = Math.max(0, Math.min(1, maxX));
    minY = Math.max(0, Math.min(1, minY));
    maxY = Math.max(0, Math.min(1, maxY));
    const w = Math.max(0, maxX - minX);
    const h = Math.max(0, maxY - minY);
    if (!(w > 0 && h > 0)) return null;
    return { x: minX, y: minY, w, h };
  }, [cropRect, stagePx.stageW, stagePx.stageH, stagePx.imgW, stagePx.imgH, normalizedRotation]);
  const baseNatural = React.useMemo(() => {
    // Base pixel dimensions for the "canvas" the user is operating on.
    // Crop is defined in STAGE coords (stage = rotated AABB in pixel space),
    // so the effective canvas is a portion of that stage.
    const w = naturalSize.w;
    const h = naturalSize.h;
    if (!(w > 0 && h > 0)) return { w, h };
    const t = (normalizedRotation * Math.PI) / 180;
    const c = Math.abs(Math.cos(t));
    const s = Math.abs(Math.sin(t));
    const stageW = w * c + h * s;
    const stageH = w * s + h * c;
    if (!cropRect) return { w: stageW, h: stageH };
    return { w: stageW * cropRect.w, h: stageH * cropRect.h };
  }, [naturalSize.w, naturalSize.h, cropRect, normalizedRotation]);
  const effectiveNatural = React.useMemo(() => {
    // In rotated views (90/270), what the user perceives as width/height are swapped.
    return {
      w: isRightAngle ? baseNatural.h : baseNatural.w,
      h: isRightAngle ? baseNatural.w : baseNatural.h
    };
  }, [isRightAngle, baseNatural.w, baseNatural.h]);
  const effectiveAspect = React.useMemo(() => {
    const w = effectiveNatural.w;
    const h = effectiveNatural.h;
    if (!(w > 0 && h > 0)) return 0;
    return h / w;
  }, [effectiveNatural.w, effectiveNatural.h]);

  const aspectText = React.useMemo(() => {
    const w = effectiveNatural.w;
    const h = effectiveNatural.h;
    if (w > 0 && h > 0) {
      const ratio = w / h;
      if (isFinite(ratio) && ratio > 0) {
        if (ratio >= 1) return `${ratio.toFixed(2)}:1`;
        return `1:${(1 / ratio).toFixed(2)}`;
      }
    }
    return '';
  }, [effectiveNatural.w, effectiveNatural.h]);

	// Derived absolute width (in user units) used for absolute measurement mode.
	const derivedAbsWidth = React.useMemo(() => {
		const w = effectiveNatural.w;
		const h = effectiveNatural.h;
		if (!(w > 0 && h > 0)) return 0;
		const wNum = parseFloat(absWidth);
		const hNum = parseFloat(absHeight);
		if (Number.isFinite(wNum) && wNum > 0) return wNum;
		if (Number.isFinite(hNum) && hNum > 0 && effectiveAspect > 0) return hNum / effectiveAspect;
		return 0;
	}, [absWidth, absHeight, effectiveNatural.w, effectiveNatural.h, effectiveAspect]);

	const measurePairs = React.useMemo(() => {
    const wPx = naturalSize.w;
    const hPx = naturalSize.h;
    const effWpx = effectiveNatural.w;
    const pairs: Array<{ idx: number, a: { nx: number; ny: number }, b: { nx: number; ny: number }, len: number, midx: number, midy: number }>
      = [];
    for (let i = 0; i + 1 < measurePoints.length; i += 2) {
      const a = measurePoints[i];
      const b = measurePoints[i + 1];
      const dx = b.nx - a.nx;
      const dy = b.ny - a.ny;
      // Pixel distance is rotation-invariant; we then normalize by the effective "width" in pixels
      // so width-based units work even when the user rotates the view (90/270 swaps effective width).
      const pixelDist = (wPx > 0 && hPx > 0) ? Math.hypot(dx * wPx, dy * hPx) : Math.hypot(dx, dy);
      const len = (effWpx > 0) ? (pixelDist / effWpx) : pixelDist;
      const midx = (a.nx + b.nx) / 2;
      const midy = (a.ny + b.ny) / 2;
      pairs.push({ idx: i, a, b, len, midx, midy });
    }

		// Relative proportion mode (default): display X and multiples
		if (measurementMode === 'relative') {
			const positive = pairs.filter(p => p.len > 0);
			if (positive.length === 0) return pairs.map(p => ({ ...p, label: '' } as any));
			const minLen = Math.min(...positive.map(p => p.len));
			return pairs.map(p => {
				let label = '';
				if (p.len === minLen) {
					label = 'X';
				} else if (minLen > 0) {
					const ratio = p.len / minLen;
					const rounded = Math.round(ratio);
					const labelVal = Math.abs(rounded - ratio) < 0.1 ? `${rounded}x` : `${ratio.toFixed(1)}x`;
					label = labelVal;
				}
				return { ...p, label } as any;
			});
		}

		// Absolute mode: convert normalized width-units length to calibrated units using derivedAbsWidth
		const widthUnits = derivedAbsWidth;
		const fmt = (v: number) => {
			if (!Number.isFinite(v)) return '';
			// Use fewer decimals for larger numbers
			if (Math.abs(v) >= 100) return Math.round(v).toString();
			if (Math.abs(v) >= 10) return v.toFixed(1);
			return v.toFixed(2);
		};
		return pairs.map(p => {
			const value = widthUnits > 0 ? (p.len * widthUnits) : NaN;
			const label = Number.isFinite(value) && value > 0 ? fmt(value) : '';
			return { ...p, label } as any;
		});
	}, [measurePoints, naturalSize.w, naturalSize.h, effectiveNatural.w, measurementMode, derivedAbsWidth]);

  const mapClientToUnrotatedNormalized = React.useCallback((clientX: number, clientY: number) => {
    const imgEl = fullscreenImgRef.current;
    const stageEl = stageRef.current;
    if (!imgEl || !stageEl) return null;

    // If a crop is active, only allow interactions inside the cropped STAGE region (screen-aligned).
    if (cropRect) {
      const srect = stageEl.getBoundingClientRect();
      if (!(srect.width > 0 && srect.height > 0)) return null;
      const sx = (clientX - srect.left) / srect.width;
      const sy = (clientY - srect.top) / srect.height;
      if (sx < cropRect.x || sx > cropRect.x + cropRect.w || sy < cropRect.y || sy > cropRect.y + cropRect.h) {
        return null;
      }
    }

    const rect = imgEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;

    // Undo rotation around center
    const theta = (-normalizedRotation * Math.PI) / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const ux = dx * cos - dy * sin;
    const uy = dx * sin + dy * cos;

    // Convert to normalized coords in the *unrotated* image plane.
    // zoom is applied by an outer scale() transform, so account for it here.
    const w = (imgEl.clientWidth || 0) * zoom;
    const h = (imgEl.clientHeight || 0) * zoom;
    if (!(w > 0 && h > 0)) return null;

    let nx = (ux + w / 2) / w;
    let ny = (uy + h / 2) / h;
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) return null;

    // If a crop is active, also ensure the mapped point lies inside the (approximate) unrotated-image crop AABB.
    if (cropRectImage) {
      if (nx < cropRectImage.x || nx > cropRectImage.x + cropRectImage.w || ny < cropRectImage.y || ny > cropRectImage.y + cropRectImage.h) {
        return null;
      }
    }
    return { nx, ny };
  }, [normalizedRotation, zoom, cropRect, cropRectImage]);

	// Keep absolute width/height in sync with current image aspect ratio when the image changes or mode toggles.
	React.useEffect(() => {
		if (measurementMode !== 'absolute') return;
		// Update measured label column width for helper text alignment
		try {
			const w = widthLabelRef.current?.getBoundingClientRect().width || 0;
			if (w && Math.abs(w - labelColWidth) > 0.5) setLabelColWidth(w);
		} catch {}
		// Intentionally do not auto-write width/height here; syncing is handled only in onChange handlers.
	}, [measurementMode, labelColWidth]);

	// On image change, always reset absolute width/height defaults to this image's natural size
	React.useEffect(() => {
		// Re-measure label column
		try {
			const w = widthLabelRef.current?.getBoundingClientRect().width || 0;
			if (w && Math.abs(w - labelColWidth) > 0.5) setLabelColWidth(w);
		} catch {}
		if (isEditingWidth || isEditingHeight) return;
		const w = effectiveNatural.w;
		const h = effectiveNatural.h;
		if (!(w > 0 && h > 0)) return;
		const nextW = Math.max(1, Math.round(w));
		const nextH = Math.max(1, Math.round(h));
		setAbsWidth(String(nextW));
		setAbsHeight(String(nextH));
	}, [imageUrl, effectiveNatural.w, effectiveNatural.h]);

  return (
    <div
      className="references-viewer-fullscreen"
      ref={fullscreenContainerRef}
      onWheel={(e) => {
        e.preventDefault();
        const delta = -Math.sign(e.deltaY) * 0.1;
        const next = Math.min(8, Math.max(0.2, zoom + delta));
        setZoom(next);
      }}
      onMouseDown={(e) => {
        if (!measureOn) {
          isPanningRef.current = true;
          lastPosRef.current = { x: e.clientX, y: e.clientY };
        }
      }}
      onMouseMove={(e) => {
        if (!isPanningRef.current) return;
        const dx = e.clientX - lastPosRef.current.x;
        const dy = e.clientY - lastPosRef.current.y;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      }}
      onMouseUp={() => { isPanningRef.current = false; }}
      onMouseLeave={() => { isPanningRef.current = false; }}
    >
      <button
        className="references-viewer-close-x references-icon-button"
        onClick={onExit}
        title="Close"
        style={{ width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
      >
        ✕
      </button>

      <ViewerMeasurementPanel
        measureOn={measureOn}
        measurementMode={measurementMode}
        setMeasurementMode={setMeasurementMode}
        absWidth={absWidth}
        absHeight={absHeight}
        setAbsWidth={setAbsWidth}
        setAbsHeight={setAbsHeight}
        effectiveAspect={effectiveAspect}
        aspectText={aspectText}
        showSideDistance={showSideDistance}
        setShowSideDistance={setShowSideDistance}
        measurePoints={measurePoints}
        setMeasurePoints={setMeasurePoints}
        hoverUndo={hoverUndo}
        setHoverUndo={setHoverUndo}
        hoverReset={hoverReset}
        setHoverReset={setHoverReset}
        widthLabelRef={widthLabelRef}
        labelColWidth={labelColWidth}
        computedPanelWidth={computedPanelWidth}
        isEditingWidth={isEditingWidth}
        isEditingHeight={isEditingHeight}
        setIsEditingWidth={setIsEditingWidth}
        setIsEditingHeight={setIsEditingHeight}
      />


      <ViewerActionButtons
        measureOn={measureOn}
        setMeasureOn={setMeasureOn}
        loupeOn={loupeOn}
        setLoupeOn={setLoupeOn}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        gridColor={gridColor}
        setGridColor={setGridColor}
        gridHCount={gridHCount}
        gridVCount={gridVCount}
        setGridHCount={setGridHCount}
        setGridVCount={setGridVCount}
        aspectText={aspectText}
        isMonochrome={isMonochrome}
        setIsMonochrome={setIsMonochrome}
      />
      <button className="references-viewer-arrow left" onClick={onPrev} title="Previous (←)">❮</button>
      <button className="references-viewer-arrow right" onClick={onNext} title="Next (→)">❯</button>

      {imageUrl && (
        <div style={{ position: 'relative', transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}>
          {/* Stage is the rotated AABB (screen-aligned). Crop clips the stage; image/tools rotate underneath. */}
          <div
            ref={stageRef}
            style={{
              position: 'relative',
              width: stagePx.stageW ? `${stagePx.stageW}px` : 'auto',
              height: stagePx.stageH ? `${stagePx.stageH}px` : 'auto',
              clipPath: cropClipPath,
              WebkitClipPath: cropClipPath
            }}
          >
            {/* Screen-aligned grid (stage space): stays horizontal/vertical on screen even when image rotates */}
            <ViewerGridLayer
              showGrid={showGrid}
              gridVCount={gridVCount}
              gridHCount={gridHCount}
              gridLineColor={gridLineColor}
              cropRect={cropRect}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: stagePx.imgW ? `${stagePx.imgW}px` : 'auto',
                height: stagePx.imgH ? `${stagePx.imgH}px` : 'auto',
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                zIndex: 1
              }}
            >
              <img
                className="references-viewer-fullscreen-image"
                src={imageUrl}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  filter: isMonochrome ? 'grayscale(100%)' : 'none',
                  cursor: (loupeOn && isHoveringImage) ? 'none' : 'auto'
                }}
                draggable={false}
                onDoubleClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}
                onLoad={(e) => {
                  setLoupeReady(true);
                  try { const img = e.currentTarget as HTMLImageElement; setNaturalSize({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 }); } catch {}
                }}
                onMouseMove={(e) => {
                  if (!loupeOn) return;
                  const stageEl = stageRef.current;
                  if (!stageEl) return;
                  const srect = stageEl.getBoundingClientRect();
                  if (!(srect.width > 0 && srect.height > 0)) return;

                  // Stage-normalized cursor position (screen-aligned)
                  let sx = (e.clientX - srect.left) / srect.width;
                  let sy = (e.clientY - srect.top) / srect.height;
                  if (!Number.isFinite(sx) || !Number.isFinite(sy)) return;

                  // Clamp sampling to the cropped stage area so the loupe can't reveal hidden pixels
                  if (cropRect) {
                    const minX = cropRect.x;
                    const maxX = cropRect.x + cropRect.w;
                    const minY = cropRect.y;
                    const maxY = cropRect.y + cropRect.h;
                    sx = Math.max(minX, Math.min(maxX, sx));
                    sy = Math.max(minY, Math.min(maxY, sy));
                  }

                  setLoupeStagePos({ sx, sy });
                  setLoupeScreenPos({ x: e.clientX, y: e.clientY });
              }}
              onMouseEnter={() => setIsHoveringImage(true)}
              onMouseLeave={() => setIsHoveringImage(false)}
              ref={fullscreenImgRef}
            />
          <ViewerMeasurementOverlay
            measureOn={measureOn}
            measurementMode={measurementMode}
            showSideDistance={showSideDistance}
            mapClientToUnrotatedNormalized={mapClientToUnrotatedNormalized}
            draggingMeasureIdx={draggingMeasureIdx}
            setDraggingMeasureIdx={setDraggingMeasureIdx}
            measurePoints={measurePoints}
            setMeasurePoints={setMeasurePoints}
            measurePairs={measurePairs}
            normalizedRotation={normalizedRotation}
            setSideCursor={setSideCursor}
            setSideDistanceBox={setSideDistanceBox}
            sideCursor={sideCursor}
            sideDistanceBox={sideDistanceBox}
            cropRect={cropRect}
            stageRef={stageRef}
          imageRef={fullscreenImgRef}
          containerRef={fullscreenContainerRef}
            derivedAbsWidth={derivedAbsWidth}
            absHeight={absHeight}
            effectiveAspect={effectiveAspect}
          />
            </div>
          </div>
        </div>
      )}

      <ViewerLoupeOverlay
        imageUrl={imageUrl}
        loupeOn={loupeOn}
        loupeReady={loupeReady}
        isHoveringImage={isHoveringImage}
        stagePx={stagePx}
        zoom={zoom}
        loupeStagePos={loupeStagePos}
        loupeScreenPos={loupeScreenPos}
        cropClipPath={cropClipPath}
        normalizedRotation={normalizedRotation}
        isMonochrome={isMonochrome}
      />

      <ViewerZoomControls zoom={zoom} setZoom={setZoom} setOffset={setOffset} />
    </div>
  );
};

export default ViewerImageCanvas;


