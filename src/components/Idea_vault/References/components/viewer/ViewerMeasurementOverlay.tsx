import React from 'react';

type Point = { nx: number; ny: number };
type Pair = { idx: number; a: Point; b: Point; len: number; midx: number; midy: number; label?: string };
type CropRect = { x: number; y: number; w: number; h: number } | null;
type DistanceBox = { left: number; top: number; width: number; height: number } | null;

type Props = {
  measureOn: boolean;
  measurementMode: 'relative' | 'absolute';
  showSideDistance: boolean;
  mapClientToUnrotatedNormalized: (x: number, y: number) => { nx: number; ny: number } | null;
  draggingMeasureIdx: number | null;
  setDraggingMeasureIdx: React.Dispatch<React.SetStateAction<number | null>>;
  measurePoints: Point[];
  setMeasurePoints: React.Dispatch<React.SetStateAction<Point[]>>;
  measurePairs: Pair[];
  normalizedRotation: number;
  setSideCursor: React.Dispatch<React.SetStateAction<Point | null>>;
  setSideDistanceBox: React.Dispatch<React.SetStateAction<DistanceBox>>;
  sideCursor: Point | null;
  sideDistanceBox: DistanceBox;
  cropRect: CropRect;
  stageRef: React.RefObject<HTMLDivElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  derivedAbsWidth: number;
  absHeight: string;
  effectiveAspect: number;
};

const ViewerMeasurementOverlay: React.FC<Props> = ({
  measureOn,
  measurementMode,
  showSideDistance,
  mapClientToUnrotatedNormalized,
  draggingMeasureIdx,
  setDraggingMeasureIdx,
  measurePoints,
  setMeasurePoints,
  measurePairs,
  normalizedRotation,
  setSideCursor,
  setSideDistanceBox,
  sideCursor,
  sideDistanceBox,
  cropRect,
  stageRef,
  imageRef,
  containerRef,
  derivedAbsWidth,
  absHeight,
  effectiveAspect,
}) => {
  const handleMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!measureOn) return;
    if (draggingMeasureIdx !== null) return;
    if (e.button !== 0) return;
    const mapped = mapClientToUnrotatedNormalized(e.clientX, e.clientY);
    if (!mapped) return;
    const { nx, ny } = mapped;
    if (!isFinite(nx) || !isFinite(ny)) return;
    if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return;
    setMeasurePoints(prev => [...prev, { nx, ny }]);
  }, [draggingMeasureIdx, mapClientToUnrotatedNormalized, measureOn, setMeasurePoints]);

  if (!measureOn) return null;

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        const mapped = mapClientToUnrotatedNormalized(e.clientX, e.clientY);
        if (!mapped) return;
        const clampedX = Math.max(0, Math.min(1, mapped.nx));
        const clampedY = Math.max(0, Math.min(1, mapped.ny));

        if (measurementMode === 'absolute' && showSideDistance) {
          try {
            const stageEl = stageRef.current;
            const rect = stageEl?.getBoundingClientRect();
            const localW = stageEl?.offsetWidth || 0;
            const localH = stageEl?.offsetHeight || 0;
            if (stageEl && rect && rect.width > 0 && rect.height > 0 && localW > 0 && localH > 0) {
              const scaleX = rect.width / localW;
              const scaleY = rect.height / localH;
              const localX = (e.clientX - rect.left) / scaleX;
              const localY = (e.clientY - rect.top) / scaleY;
              let sx = localX / localW;
              let sy = localY / localH;
              if (!Number.isFinite(sx) || !Number.isFinite(sy)) return;
              sx = Math.max(0, Math.min(1, sx));
              sy = Math.max(0, Math.min(1, sy));

              if (cropRect) {
                const minX = cropRect.x;
                const maxX = cropRect.x + cropRect.w;
                const minY = cropRect.y;
                const maxY = cropRect.y + cropRect.h;
                sx = Math.max(minX, Math.min(maxX, sx));
                sy = Math.max(minY, Math.min(maxY, sy));

                setSideDistanceBox({
                  left: cropRect.x * localW,
                  top: cropRect.y * localH,
                  width: cropRect.w * localW,
                  height: cropRect.h * localH
                });

                const nx = cropRect.w > 0 ? (sx - cropRect.x) / cropRect.w : 0;
                const ny = cropRect.h > 0 ? (sy - cropRect.y) / cropRect.h : 0;
                setSideCursor({ nx: Math.max(0, Math.min(1, nx)), ny: Math.max(0, Math.min(1, ny)) });
              } else {
                setSideCursor({ nx: sx, ny: sy });
                setSideDistanceBox({ left: 0, top: 0, width: localW, height: localH });
              }
            }
          } catch {}
        }

        if (draggingMeasureIdx !== null) {
          setMeasurePoints(prev => {
            const next = prev.slice();
            if (draggingMeasureIdx >= 0 && draggingMeasureIdx < next.length) {
              next[draggingMeasureIdx] = { nx: clampedX, ny: clampedY };
            }
            return next;
          });
        }
      }}
      onMouseUp={() => setDraggingMeasureIdx(null)}
      onMouseLeave={() => { setDraggingMeasureIdx(null); setSideCursor(null); setSideDistanceBox(null); }}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        zIndex: 1101,
        cursor: 'crosshair',
      }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {measurePairs.map(p => (
          <line key={`ml-${p.idx}`} x1={p.a.nx * 100} y1={p.a.ny * 100} x2={p.b.nx * 100} y2={p.b.ny * 100} stroke="#00e0ff" strokeWidth={1.5} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" opacity={0.9} />
        ))}
        {measurePairs.map(p => (
          p.label ? (
            <text
              key={`ml-label-${p.idx}`}
              x={p.midx * 100}
              y={p.midy * 100}
              fill="#ffffff"
              fontSize="3"
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${-normalizedRotation} ${p.midx * 100} ${p.midy * 100})`}
              style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.7)', strokeWidth: 1 }}
            >
              {p.label}
            </text>
          ) : null
        ))}
      </svg>
      {measurePoints.map((pt, idx) => (
        <div
          key={`mp-${idx}`}
          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setDraggingMeasureIdx(idx); }}
          style={{
            position: 'absolute',
            left: `${(pt.nx * 100).toFixed(4)}%`,
            top: `${(pt.ny * 100).toFixed(4)}%`,
            transform: 'translate(-50%, -50%)',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#00e0ff',
            border: '2px solid #00343d',
            boxShadow: '0 0 0 2px rgba(0,224,255,0.25)',
            cursor: draggingMeasureIdx === idx ? 'grabbing' : 'grab'
          }}
        />
      ))}

      {measurementMode === 'absolute' && showSideDistance && sideCursor && sideDistanceBox && (() => {
        const widthUnits = derivedAbsWidth;
        const heightUnits = (() => {
          const hNum = parseFloat(absHeight);
          if (Number.isFinite(hNum) && hNum > 0) return hNum;
          if (widthUnits > 0 && effectiveAspect > 0) return widthUnits * effectiveAspect;
          return 0;
        })();

        const fmt = (v: number) => {
          if (!Number.isFinite(v)) return '';
          if (Math.abs(v) >= 100) return Math.round(v).toString();
          if (Math.abs(v) >= 10) return v.toFixed(1);
          return v.toFixed(2);
        };

        const xDist = widthUnits > 0 ? sideCursor.nx * widthUnits : NaN;
        const yDist = heightUnits > 0 ? sideCursor.ny * heightUnits : NaN;

        const cx = sideCursor.nx * 100;
        const cy = sideCursor.ny * 100;

        return (
          <div
            style={{
              position: 'absolute',
              left: sideDistanceBox.left,
              top: sideDistanceBox.top,
              width: sideDistanceBox.width,
              height: sideDistanceBox.height,
              pointerEvents: 'none',
              zIndex: 1102
            }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              <line x1={0} y1={cy} x2={cx} y2={cy} stroke="#FFCC00" strokeWidth={1.5} vectorEffect="non-scaling-stroke" opacity={0.95} />
              {Number.isFinite(xDist) && xDist > 0 && (
                <text x={cx / 2} y={Math.max(2, cy - 2)} fill="#ffffff" fontSize="3" textAnchor="middle" dominantBaseline="ideographic" style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.7)', strokeWidth: 1 }}>
                  {fmt(xDist)}
                </text>
              )}
              <line x1={cx} y1={0} x2={cx} y2={cy} stroke="#FFCC00" strokeWidth={1.5} vectorEffect="non-scaling-stroke" opacity={0.95} />
              {Number.isFinite(yDist) && yDist > 0 && (
                <text x={Math.min(98, cx + 2)} y={cy / 2} fill="#ffffff" fontSize="3" textAnchor="start" dominantBaseline="middle" style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.7)', strokeWidth: 1 }}>
                  {fmt(yDist)}
                </text>
              )}
            </svg>
          </div>
        );
      })()}
    </div>
  );
};

export default ViewerMeasurementOverlay;

