import React from 'react';

type CropRect = { x: number; y: number; w: number; h: number } | null;

type Props = {
  showGrid: boolean;
  gridVCount: number;
  gridHCount: number;
  gridLineColor: string;
  cropRect: CropRect;
};

const ViewerGridLayer: React.FC<Props> = ({
  showGrid,
  gridVCount,
  gridHCount,
  gridLineColor,
  cropRect,
}) => {
  if (!showGrid) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 2
      }}
    >
      {Array.from({ length: gridVCount }).map((_, i) => {
        const base = cropRect ? cropRect.x : 0;
        const span = cropRect ? cropRect.w : 1;
        const pct = (base + span * ((i + 1) / (gridVCount + 1))) * 100;
        return (
          <div
            key={`gv-${i}`}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${pct}%`,
              width: 2,
              transform: 'translateX(-50%)',
              background: gridLineColor
            }}
          />
        );
      })}
      {Array.from({ length: gridHCount }).map((_, i) => {
        const base = cropRect ? cropRect.y : 0;
        const span = cropRect ? cropRect.h : 1;
        const pct = (base + span * ((i + 1) / (gridHCount + 1))) * 100;
        return (
          <div
            key={`gh-${i}`}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${pct}%`,
              height: 2,
              transform: 'translateY(-50%)',
              background: gridLineColor
            }}
          />
        );
      })}
    </div>
  );
};

export default ViewerGridLayer;

