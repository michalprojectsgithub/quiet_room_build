import React, { useState } from 'react';
import type { ReferenceViewerProps } from '../types';
import ViewerRightPanel from './ViewerRightPanel';
import ReferenceViewerLeftPane from './ReferenceViewerLeftPane';

const ReferenceViewer: React.FC<ReferenceViewerProps> = ({
  reference,
  imageUrl,
  isLoading,
  currentIndex,
  totalReferences,
  API_BASE,
  onClose,
  onNext,
  onPrev,
  formatDate,
  folderId,
  onDelete,
  onNoteChange,
  onSourceChange,
  onTagsChange,
  onToggleItemTag,
  onRotationChange,
  onCropChange
}) => {
  const [cropModeActive, setCropModeActive] = useState(false);

  // Silence unused prop warnings (kept for API compatibility)
  void currentIndex;
  void totalReferences;
  void API_BASE;
  void formatDate;
  void folderId;

  return (
    <div className="references-viewer">
      <button
        className="references-viewer-close-x references-icon-button"
        onClick={onClose}
        title="Close (Esc)"
        style={{ width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
      >
        ✕
      </button>
      <button className="references-viewer-arrow left" onClick={onPrev} title="Previous (←)">❮</button>
      <button className="references-viewer-arrow right" onClick={onNext} title="Next (→)">❯</button>

      <div className="references-viewer-split">
        <ReferenceViewerLeftPane
          reference={reference}
          imageUrl={imageUrl}
          isLoading={isLoading}
          onPrev={onPrev}
          onNext={onNext}
          onDelete={onDelete}
          onRotationChange={onRotationChange}
          onCropChange={onCropChange}
          onCropModeChange={setCropModeActive}
        />

        {!cropModeActive && (
          <ViewerRightPanel
            reference={reference as any}
            onNoteChange={onNoteChange}
            onSourceChange={onSourceChange}
            onTagsChange={onTagsChange}
            onToggleItemTag={onToggleItemTag as any}
          />
        )}
      </div>
    </div>
  );
};

export default ReferenceViewer;
