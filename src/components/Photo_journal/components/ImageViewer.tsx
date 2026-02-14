import React from 'react';
import type { PhotoJournalImage } from '../../../services/photoJournalService';

interface ImageViewerProps {
  image: PhotoJournalImage;
  imageUrl: string;
  isLoading: boolean;
  currentIndex: number;
  totalImages: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onLinkReference: () => void;
  linkedReferenceThumbUrl?: string;
  isLinked?: boolean;
  previewPos?: { x: number; y: number };
  dragging?: boolean;
  onPreviewMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onUnlinkReference?: () => void;
  previewHidden?: boolean;
  onHidePreview?: () => void;
  onShowPreview?: () => void;
  onCompare?: () => void;
  rotation?: number;
  onRotate?: (rotation: number) => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  image,
  imageUrl,
  isLoading,
  currentIndex,
  totalImages,
  onClose,
  onNext,
  onPrev,
  onLinkReference,
  linkedReferenceThumbUrl,
  isLinked,
  previewPos,
  dragging,
  onPreviewMouseDown,
  onUnlinkReference,
  previewHidden,
  onHidePreview,
  onShowPreview,
  onCompare,
  rotation: rotationProp = 0,
  onRotate
}) => {
  const previewRef = React.useRef<HTMLDivElement | null>(null);
  const toolbarRef = React.useRef<HTMLDivElement | null>(null);
  const [rotation, setRotation] = React.useState(rotationProp);

  const updatePreviewWidth = React.useCallback(() => {
    if (!previewRef.current || !toolbarRef.current) return;
    const width = Math.ceil(toolbarRef.current.getBoundingClientRect().width);
    if (width > 0) {
      previewRef.current.style.width = `${width}px`;
      previewRef.current.style.height = 'auto';
    }
  }, []);

  React.useEffect(() => {
    if (isLinked && !previewHidden) {
      updatePreviewWidth();
    }
  }, [isLinked, previewHidden, linkedReferenceThumbUrl, updatePreviewWidth]);

  // Reset rotation when image changes
  React.useEffect(() => {
    setRotation(rotationProp || 0);
  }, [image?.id, rotationProp]);

  React.useEffect(() => {
    const onResize = () => updatePreviewWidth();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updatePreviewWidth]);

  return (
    <div className="image-viewer-modal">
      <div className="viewer-actions">
        {!isLinked && (
          <button
            className="viewer-link-button viewer-icon-button"
            title="Link reference"
            aria-label="Link reference"
            onClick={onLinkReference}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.5 13.5L13.5 10.5" />
              <path d="M7 17a4.5 4.5 0 0 1 0-6.36l3.18-3.18a4.5 4.5 0 0 1 6.36 6.36l-1.07 1.07" />
              <path d="M17 7a4.5 4.5 0 0 1 0 6.36l-3.18 3.18a4.5 4.5 0 1 1-6.36-6.36l1.07-1.07" />
            </svg>
          </button>
        )}
        {isLinked && previewHidden && (
          <button
            className="viewer-link-button viewer-icon-button"
            title="Show reference"
            aria-label="Show reference"
            onClick={onShowPreview}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        )}
        <button
          className="viewer-icon-button"
          title="Rotate right (+90°)"
          aria-label="Rotate right"
          onClick={() => {
            const next = (rotation + 90) % 360;
            setRotation(next);
            onRotate?.(next);
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 11a8 8 0 1 1 8 8" />
            <polyline points="3 15 3 11 7 11" />
          </svg>
        </button>
        <button
          onClick={onClose}
          className="viewer-close-button viewer-icon-button"
          title="Close (Esc)"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {isLinked && previewPos && !previewHidden && (
        <div
          className={`viewer-linked-ref${dragging ? ' dragging' : ''}`}
          style={{ left: previewPos.x, top: previewPos.y, right: 'auto' as any }}
          onMouseDown={onPreviewMouseDown}
          onDragStart={(e) => e.preventDefault()}
          ref={previewRef}
        >
          <img src={linkedReferenceThumbUrl || ''} alt="Linked reference" draggable={false} />
          <div className="viewer-linked-ref-overlay">
            <div className="viewer-linked-ref-toolbar" ref={toolbarRef}>
              <button className="viewer-linked-ref-btn" title="Compare" onClick={(e) => { e.stopPropagation(); onCompare && onCompare(); }}>Compare</button>
              <button className="viewer-linked-ref-btn" title="Hide" onClick={(e) => { e.stopPropagation(); onHidePreview && onHidePreview(); }}>Hide</button>
              <button
                className="viewer-linked-ref-btn"
                title="Unlink"
                onClick={(e) => { e.stopPropagation(); onUnlinkReference && onUnlinkReference(); }}
              >
                Unlink
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="viewer-image-info">
        <p className="viewer-image-date">
          {new Date(image.uploadDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })}
        </p>
        {image.prompt && (
          <p className="viewer-image-prompt">
            "{image.prompt}"
          </p>
        )}
        <p className="viewer-image-counter">
          {currentIndex + 1} of {totalImages}
        </p>
      </div>

      <div className="viewer-main-image-container">
        {isLoading ? (
          <div className="viewer-loading-container">
            <div className="viewer-loading-spinner">Loading...</div>
          </div>
        ) : (
          <div className="viewer-main-image-wrapper" style={{ transform: `rotate(${rotation}deg)` }}>
            <img
              src={imageUrl}
              alt={image.originalName}
              className="viewer-main-image"
            />
          </div>
        )}
      </div>

      <div className="viewer-navigation">
        <button onClick={onPrev} className="viewer-nav-button" title="Previous (←)">← Previous</button>
        <button onClick={onNext} className="viewer-nav-button" title="Next (→ or Space)">Next →</button>
      </div>

      <div className="viewer-keyboard-hint">
        Use arrow keys or spacebar to navigate • Esc to close
      </div>
    </div>
  );
};

export default ImageViewer;


