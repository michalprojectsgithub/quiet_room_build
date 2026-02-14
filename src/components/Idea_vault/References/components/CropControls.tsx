import React from 'react';

export type CropAspectMode =
  | 'free'
  | 'original'
  | 'a_series_landscape'
  | 'a_series_portrait'
  | 'canvas_portrait_4_5'
  | 'canvas_landscape_5_4'
  | 'canvas_classic_3_4'
  | 'canvas_classic_4_3'
  | 'print_photo_2_3'
  | 'print_photo_3_2'
  | 'square'
  | 'custom';

interface CropControlsProps {
  cropMode: boolean;
  cropAspectMode: CropAspectMode;
  customAspectW: string;
  customAspectH: string;
  cropRotateSigned: number;
  cropRotateInput: string;
  onAspectChange: (mode: CropAspectMode) => void;
  onCustomWidthChange: (value: string) => void;
  onCustomHeightChange: (value: string) => void;
  onCustomAspectBlur: () => void;
  onRotationSliderPointerDown: () => void;
  onRotationSliderChange: (value: number) => void;
  onRotationSliderPointerUp: () => void;
  onRotationInputFocus: () => void;
  onRotationInputBlur: () => void;
  onRotationInputChange: (value: string) => void;
  onRotationInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onApply: () => void;
  onCancel: () => void;
  onRestore: () => void;
}

const CropControls: React.FC<CropControlsProps> = ({
  cropMode,
  cropAspectMode,
  customAspectW,
  customAspectH,
  cropRotateSigned,
  cropRotateInput,
  onAspectChange,
  onCustomWidthChange,
  onCustomHeightChange,
  onCustomAspectBlur,
  onRotationSliderPointerDown,
  onRotationSliderChange,
  onRotationSliderPointerUp,
  onRotationInputFocus,
  onRotationInputBlur,
  onRotationInputChange,
  onRotationInputKeyDown,
  onApply,
  onCancel,
  onRestore
}) => {
  if (!cropMode) return null;

  return (
    <div className="references-crop-actions" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <div className="references-crop-aspect-row">
        <label className="references-crop-aspect-label">Aspect</label>
        <select
          className="references-crop-aspect-select"
          value={cropAspectMode}
          onChange={(e) => onAspectChange(e.currentTarget.value as CropAspectMode)}
        >
          <option value="a_series_landscape">ISO Paper (A-series) 1.414 : 1</option>
          <option value="a_series_portrait">ISO Paper (A-series) 1 : 1.414</option>
          <option value="canvas_portrait_4_5">Canvas – Portrait 4 : 5</option>
          <option value="canvas_landscape_5_4">Canvas – Landscape 5 : 4</option>
          <option value="canvas_classic_3_4">Canvas – Classic 3 : 4</option>
          <option value="canvas_classic_4_3">Canvas – Classic 4 : 3</option>
          <option value="print_photo_2_3">Print / Photography 2 : 3</option>
          <option value="print_photo_3_2">Print / Photography 3 : 2</option>
          <option value="square">Square 1 : 1</option>
          <option value="custom">Custom</option>
          <option value="original">Original</option>
          <option value="free">Free crop</option>
        </select>
      </div>
      <div className={`references-crop-custom-row ${cropAspectMode === 'custom' ? '' : 'hidden'}`}>
        <label className="references-crop-aspect-label">Custom</label>
        <input
          className="references-crop-custom-input"
          type="number"
          min={0.01}
          step={0.01}
          value={customAspectW}
          onChange={(e) => onCustomWidthChange(e.currentTarget.value)}
          onBlur={onCustomAspectBlur}
          aria-label="Custom aspect width"
          title="Custom aspect width"
        />
        <span className="references-crop-aspect-sep">:</span>
        <input
          className="references-crop-custom-input"
          type="number"
          min={0.01}
          step={0.01}
          value={customAspectH}
          onChange={(e) => onCustomHeightChange(e.currentTarget.value)}
          onBlur={onCustomAspectBlur}
          aria-label="Custom aspect height"
          title="Custom aspect height"
        />
      </div>
      <div className="references-crop-rotate-row">
        <label className="references-crop-rotate-label">Rotate</label>
        <input
          className="references-crop-rotate-slider"
          type="range"
          min={-180}
          max={180}
          step={1}
          value={cropRotateSigned}
          onPointerDown={onRotationSliderPointerDown}
          onChange={(e) => onRotationSliderChange(Number(e.currentTarget.value))}
          onPointerUp={onRotationSliderPointerUp}
        />
        <input
          className="references-crop-rotate-input"
          type="number"
          inputMode="numeric"
          min={-180}
          max={180}
          step={1}
          value={cropRotateInput}
          onFocus={onRotationInputFocus}
          onBlur={onRotationInputBlur}
          onChange={(e) => onRotationInputChange(e.currentTarget.value)}
          onKeyDown={onRotationInputKeyDown}
          aria-label="Rotation degrees"
          title="Type degrees and press Enter"
        />
        <div className="references-crop-rotate-value">°</div>
      </div>
      <div className="references-crop-action-buttons">
        <button className="references-icon-button references-crop-action-btn" onClick={onApply} title="Apply crop">Apply</button>
        <button className="references-icon-button references-crop-action-btn" onClick={onCancel} title="Cancel">Cancel</button>
        <button className="references-icon-button references-crop-action-btn" onClick={onRestore} title="Restore original">Restore</button>
      </div>
    </div>
  );
};

export default CropControls;

