import React from 'react';

type Props = {
  measureOn: boolean;
  measurementMode: 'relative' | 'absolute';
  setMeasurementMode: React.Dispatch<React.SetStateAction<'relative' | 'absolute'>>;
  absWidth: string;
  absHeight: string;
  setAbsWidth: React.Dispatch<React.SetStateAction<string>>;
  setAbsHeight: React.Dispatch<React.SetStateAction<string>>;
  effectiveAspect: number;
  aspectText: string;
  showSideDistance: boolean;
  setShowSideDistance: React.Dispatch<React.SetStateAction<boolean>>;
  measurePoints: Array<{ nx: number; ny: number }>;
  setMeasurePoints: React.Dispatch<React.SetStateAction<Array<{ nx: number; ny: number }>>>;
  hoverUndo: boolean;
  setHoverUndo: React.Dispatch<React.SetStateAction<boolean>>;
  hoverReset: boolean;
  setHoverReset: React.Dispatch<React.SetStateAction<boolean>>;
  widthLabelRef: React.RefObject<HTMLSpanElement | null>;
  labelColWidth: number;
  computedPanelWidth: number;
  isEditingWidth: boolean;
  isEditingHeight: boolean;
  setIsEditingWidth: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEditingHeight: React.Dispatch<React.SetStateAction<boolean>>;
};

const ViewerMeasurementPanel: React.FC<Props> = ({
  measureOn,
  measurementMode,
  setMeasurementMode,
  absWidth,
  absHeight,
  setAbsWidth,
  setAbsHeight,
  effectiveAspect,
  aspectText,
  showSideDistance,
  setShowSideDistance,
  measurePoints,
  setMeasurePoints,
  hoverUndo,
  setHoverUndo,
  hoverReset,
  setHoverReset,
  widthLabelRef,
  labelColWidth,
  computedPanelWidth,
  isEditingWidth,
  isEditingHeight,
  setIsEditingWidth,
  setIsEditingHeight,
}) => {
  if (!measureOn) return null;

  return (
    <div
      className="references-measure-mode-panel"
      style={{
        position: 'absolute',
        right: 20,
        top: 60,
        background: '#000',
        border: '1px solid #333',
        borderRadius: 8,
        padding: 8,
        color: '#fff',
        fontSize: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 1102,
        width: computedPanelWidth,
        boxSizing: 'border-box'
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ fontWeight: 600, color: '#ddd' }}>Measurement</div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input
          type="radio"
          name="measure-mode"
          checked={measurementMode === 'relative'}
          onChange={() => setMeasurementMode('relative')}
        />
        <span>Relative proportion (X and multiples)</span>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input
          type="radio"
          name="measure-mode"
          checked={measurementMode === 'absolute'}
          onChange={() => setMeasurementMode('absolute')}
        />
        <span>Values based on canvas</span>
      </label>

      {measurementMode === 'absolute' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 8, rowGap: 6, alignItems: 'center' }}>
            <span ref={widthLabelRef} style={{ color: '#bbb' }}>Width</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={absWidth}
              onChange={(e) => {
                const val = e.target.value;
                setAbsWidth(val);
                if (val !== '') {
                  const w = parseFloat(val);
                  if (Number.isFinite(w) && w > 0 && effectiveAspect > 0) {
                    setAbsHeight((w * effectiveAspect).toFixed(2));
                  }
                } else {
                  setAbsHeight(absHeight);
                }
              }}
              onFocus={() => setIsEditingWidth(true)}
              onBlur={() => setIsEditingWidth(false)}
              style={{ background: '#111', color: '#fff', border: '1px solid #444', borderRadius: 6, padding: '6px 8px', width: '160px' }}
            />
            <span style={{ color: '#bbb' }}>Height</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={absHeight}
              onChange={(e) => {
                const val = e.target.value;
                setAbsHeight(val);
                if (val !== '') {
                  const h = parseFloat(val);
                  if (Number.isFinite(h) && h > 0 && effectiveAspect > 0) {
                    setAbsWidth((h / effectiveAspect).toFixed(2));
                  }
                } else {
                  setAbsWidth(absWidth);
                }
              }}
              onFocus={() => setIsEditingHeight(true)}
              onBlur={() => setIsEditingHeight(false)}
              style={{ background: '#111', color: '#fff', border: '1px solid #444', borderRadius: 6, padding: '6px 8px', width: '160px' }}
            />
            <div style={{ gridColumn: '1 / 3', color: '#888', marginTop: 2, width: `${Math.min((labelColWidth || 0) + 8 + 160, computedPanelWidth - 16)}px` }}>
              Type either width or height; the other updates by image aspect ratio{aspectText ? `: ${aspectText.replace(/\./g, ',')}` : ''}.
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
            <input
              type="checkbox"
              checked={showSideDistance}
              onChange={(e) => setShowSideDistance(e.currentTarget.checked)}
            />
            <span>Show side distance</span>
          </label>
        </>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button
          disabled={measurePoints.length === 0}
          onClick={() => setMeasurePoints(prev => prev.slice(0, -1))}
          title="Undo last point"
          aria-label="Undo last point"
          style={{
            background: measurePoints.length === 0 ? '#1a1a1a' : (hoverUndo ? '#181818' : '#111'),
            color: measurePoints.length === 0 ? '#777' : '#fff',
            border: `1px solid ${measurePoints.length === 0 ? '#2a2a2a' : (hoverUndo ? '#555' : '#444')}`,
            borderRadius: 6,
            padding: '6px 10px',
            cursor: measurePoints.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'background 120ms ease, border-color 120ms ease'
          }}
          onMouseEnter={() => { if (measurePoints.length !== 0) setHoverUndo(true); }}
          onMouseLeave={() => setHoverUndo(false)}
        >
          Undo
        </button>
        <button
          disabled={measurePoints.length === 0}
          onClick={() => setMeasurePoints([])}
          title="Reset measurements"
          aria-label="Reset measurements"
          style={{
            background: measurePoints.length === 0 ? '#1a1a1a' : (hoverReset ? '#181818' : '#111'),
            color: measurePoints.length === 0 ? '#777' : '#fff',
            border: `1px solid ${measurePoints.length === 0 ? '#2a2a2a' : (hoverReset ? '#555' : '#444')}`,
            borderRadius: 6,
            padding: '6px 10px',
            cursor: measurePoints.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'background 120ms ease, border-color 120ms ease'
          }}
          onMouseEnter={() => { if (measurePoints.length !== 0) setHoverReset(true); }}
          onMouseLeave={() => setHoverReset(false)}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default ViewerMeasurementPanel;

