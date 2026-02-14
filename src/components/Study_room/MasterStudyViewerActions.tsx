import React from 'react';

type Props = {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenInNewWindow?: () => void;
  moreOpen: boolean;
  onToggleMore: () => void;
  onExport: () => void;
  onPrint: () => void;
  moreRef: React.RefObject<HTMLDivElement | null>;
};

/**
 * Simplified viewer actions for Master Studies (no rotation, no crop, no delete)
 */
const MasterStudyViewerActions: React.FC<Props> = ({
  isFullscreen,
  onToggleFullscreen,
  onOpenInNewWindow,
  moreOpen,
  onToggleMore,
  onExport,
  onPrint,
  moreRef,
}) => {
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
            ⋯
          </button>
          {moreOpen && (
            <div className="references-viewer-more-panel">
              <button className="references-viewer-more-item" onClick={onExport}>
                Export Image
              </button>
              <button className="references-viewer-more-item" onClick={onPrint}>
                Print
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default MasterStudyViewerActions;
