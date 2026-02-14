import React from 'react';
import type { Reference } from '../Idea_vault/References/types';
import MasterStudyViewerLeftPane from './MasterStudyViewerLeftPane';
import '../Idea_vault/References/References.css';
import './Study_room.css';

export interface MasterStudyViewerProps {
  reference: Reference;
  imageUrl: string;
  isLoading: boolean;
  currentIndex: number;
  totalReferences: number;
  artist?: string;
  year?: number | null;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

const MasterStudyViewer: React.FC<MasterStudyViewerProps> = ({
  reference,
  imageUrl,
  isLoading,
  currentIndex,
  totalReferences,
  artist,
  year,
  onClose,
  onNext,
  onPrev,
}) => {
  return (
    <div className="references-viewer master-study-viewer">
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
        <MasterStudyViewerLeftPane
          reference={reference}
          imageUrl={imageUrl}
          isLoading={isLoading}
          onPrev={onPrev}
          onNext={onNext}
        />

        {/* Right panel for Master Study information */}
        <div className="references-viewer-right">
          <div className="master-study-info-panel">
            <div className="references-note-section">
              <div className="references-note-header">Artwork Details</div>
              <div className="references-note-body">
                <div className="master-study-detail-row">
                  <span className="master-study-detail-label">Title:</span>
                  <span className="master-study-detail-value">{reference.original_name || 'Untitled'}</span>
                </div>
                {artist && (
                  <div className="master-study-detail-row">
                    <span className="master-study-detail-label">Artist:</span>
                    <span className="master-study-detail-value">{artist}</span>
                  </div>
                )}
                {year && (
                  <div className="master-study-detail-row">
                    <span className="master-study-detail-label">Year:</span>
                    <span className="master-study-detail-value">{year}</span>
                  </div>
                )}
                <div className="master-study-detail-row">
                  <span className="master-study-detail-label">Index:</span>
                  <span className="master-study-detail-value">{currentIndex + 1} of {totalReferences}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterStudyViewer;
