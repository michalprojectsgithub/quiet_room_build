import React from 'react';
import CropControls, { type CropAspectMode } from './CropControls';

type RotationHandlers = {
  onRotateRight: () => void;
  onSliderPointerDown: () => void;
  onSliderChange: (signed: number) => void;
  onSliderPointerUp: () => void;
  onInputFocus: () => void;
  onInputBlur: () => void;
  onInputChange: (value: string) => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

type CropControlProps = {
  cropMode: boolean;
  cropAspectMode: CropAspectMode;
  customAspectW: string;
  customAspectH: string;
  cropRotateSigned: number;
  cropRotateInput: string;
  onAspectChange: (mode: CropAspectMode) => void;
  onCustomWidthChange: (val: string) => void;
  onCustomHeightChange: (val: string) => void;
  onCustomAspectBlur: () => void;
  onToggleCropMode: () => void;
  onApply: () => void;
  onCancel: () => void;
  onRestore: () => void;
};

type Props = {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenInNewWindow?: () => void;
  moreOpen: boolean;
  onToggleMore: () => void;
  onRequestDelete?: () => void;
  onExport: () => void;
  onPrint: () => void;
  moreRef: React.RefObject<HTMLDivElement | null>;
  rotationHandlers: RotationHandlers;
  cropControls: CropControlProps;
};

const ReferenceViewerActions: React.FC<Props> = ({
  isFullscreen,
  onToggleFullscreen,
  onOpenInNewWindow,
  moreOpen,
  onToggleMore,
  onRequestDelete,
  onExport,
  onPrint,
  moreRef,
  rotationHandlers,
  cropControls,
}) => {
  const {
    cropMode,
    onToggleCropMode,
    cropAspectMode,
    customAspectW,
    customAspectH,
    cropRotateSigned,
    cropRotateInput,
    onAspectChange,
    onCustomWidthChange,
    onCustomHeightChange,
    onCustomAspectBlur,
    onApply,
    onCancel,
    onRestore,
  } = cropControls;

  return (
    <>
      <button
        className="references-viewer-fullscreen-btn"
        title={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
        onClick={onToggleFullscreen}
      >
        {isFullscreen ? '⤢' : '⤢'}
      </button>
      {!isFullscreen && onOpenInNewWindow && (
        <button
          className="references-viewer-open-window-btn"
          title="Open in new window"
          onClick={onOpenInNewWindow}
        >
          ⧠
        </button>
      )}
      {!isFullscreen && (
        <div ref={moreRef} className="references-viewer-more-wrapper">
          <button
            className="references-viewer-open-window-btn references-viewer-more-btn"
            title="More"
            onClick={onToggleMore}
            style={{ right: 20 }}
          >
            ⋮
          </button>
          {moreOpen && (
            <div className="references-viewer-more-menu">
              <button className="references-viewer-more-item" onClick={onExport}>Export</button>
              <button className="references-viewer-more-item" onClick={onPrint}>Print</button>
              <button
                className="references-viewer-more-item"
                onClick={() => {
                  if (onRequestDelete) onRequestDelete();
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
      <button
        className="references-viewer-rotate-btn"
        title="Rotate right 90°"
        onClick={rotationHandlers.onRotateRight}
      >
        ↻
      </button>
      <button
        className={`references-viewer-crop-btn${cropMode ? ' crop-active' : ''}`}
        title={cropMode ? 'Exit crop mode' : 'Crop (display-only)'}
        onClick={onToggleCropMode}
      >
        ⧉
      </button>
      <CropControls
        cropMode={cropMode}
        cropAspectMode={cropAspectMode}
        customAspectW={customAspectW}
        customAspectH={customAspectH}
        cropRotateSigned={cropRotateSigned}
        cropRotateInput={cropRotateInput}
        onAspectChange={onAspectChange}
        onCustomWidthChange={onCustomWidthChange}
        onCustomHeightChange={onCustomHeightChange}
        onCustomAspectBlur={onCustomAspectBlur}
        onRotationSliderPointerDown={rotationHandlers.onSliderPointerDown}
        onRotationSliderChange={rotationHandlers.onSliderChange}
        onRotationSliderPointerUp={rotationHandlers.onSliderPointerUp}
        onRotationInputFocus={rotationHandlers.onInputFocus}
        onRotationInputBlur={rotationHandlers.onInputBlur}
        onRotationInputChange={rotationHandlers.onInputChange}
        onRotationInputKeyDown={rotationHandlers.onInputKeyDown}
        onApply={onApply}
        onCancel={onCancel}
        onRestore={onRestore}
      />
    </>
  );
};

export default ReferenceViewerActions;

