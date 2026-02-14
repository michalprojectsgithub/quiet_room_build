import React from 'react';

interface CompareModalProps {
  photoUrl: string;
  referenceUrl: string;
  onClose: () => void;
}

const CompareModal: React.FC<CompareModalProps> = ({ photoUrl, referenceUrl, onClose }) => {
  return (
    <div className="compare-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <button className="compare-close-button viewer-icon-button" onClick={onClose} title="Close" aria-label="Close">×</button>
      <div className="compare-modal-content">
        <div className="compare-pane left">
          {photoUrl ? <img src={photoUrl} alt="Photo" /> : <div className="compare-empty">No photo</div>}
        </div>
        <div className="compare-pane right">
          {referenceUrl ? <img src={referenceUrl} alt="Reference" /> : <div className="compare-empty">No reference</div>}
        </div>
      </div>
    </div>
  );
};

export default CompareModal;


