import React from 'react';

type CropCorner = 'move' | 'nw' | 'ne' | 'sw' | 'se';

export interface CropOverlayProps {
  cropMode: boolean;
  cropDraft: { x: number; y: number; w: number; h: number } | null;
  cropOverlayBox: { left: number; top: number; w: number; h: number } | null;
  onCropPointerDown: (e: React.PointerEvent<HTMLDivElement>, kind: CropCorner) => void;
  onCropPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onCropPointerUp: () => void;
}

const CropOverlay: React.FC<CropOverlayProps> = ({
  cropMode,
  cropDraft,
  cropOverlayBox,
  onCropPointerDown,
  onCropPointerMove,
  onCropPointerUp
}) => {
  if (!cropMode || !cropDraft || !cropOverlayBox) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: cropOverlayBox.left,
        top: cropOverlayBox.top,
        width: cropOverlayBox.w,
        height: cropOverlayBox.h,
        // Keep above the image, but below the toolbar/buttons so they remain clickable.
        zIndex: 1001,
        // Screen-aligned crop frame: image rotates under a fixed crop area.
      }}
      onPointerMove={onCropPointerMove}
      onPointerUp={onCropPointerUp}
      onPointerCancel={onCropPointerUp}
    >
      <div
        style={{
          position: 'absolute',
          left: `${cropDraft.x * 100}%`,
          top: `${cropDraft.y * 100}%`,
          width: `${cropDraft.w * 100}%`,
          height: `${cropDraft.h * 100}%`,
          border: '2px solid rgba(255,255,255,0.95)',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
          cursor: 'move'
        }}
        onPointerDown={(e) => onCropPointerDown(e, 'move')}
      >
        {(['nw','ne','sw','se'] as const).map(k => (
          <div
            key={k}
            onPointerDown={(e) => onCropPointerDown(e, k)}
            style={{
              position: 'absolute',
              width: 12,
              height: 12,
              background: '#fff',
              borderRadius: 2,
              border: '1px solid rgba(0,0,0,0.4)',
              left: k.includes('w') ? -6 : undefined,
              right: k.includes('e') ? -6 : undefined,
              top: k.includes('n') ? -6 : undefined,
              bottom: k.includes('s') ? -6 : undefined,
              cursor: `${k}-resize`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default CropOverlay;

