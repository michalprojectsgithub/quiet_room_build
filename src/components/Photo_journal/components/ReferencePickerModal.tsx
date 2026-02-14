import React, { useCallback } from 'react';
import type { Reference } from '../../../services/referencesService';
import { PhotoJournalService } from '../../../services/photoJournalService';

interface ReferencePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  references: Reference[];
  thumbUrls: Map<string, string>;
  loading: boolean;
  photoId?: string;
  onLinked?: (referenceId: string, thumbUrl?: string) => void;
}

const ReferencePickerModal: React.FC<ReferencePickerModalProps> = ({
  isOpen,
  onClose,
  references,
  thumbUrls,
  loading,
  photoId,
  onLinked
}) => {
  if (!isOpen) return null;
  return (
    <div className="ref-picker-overlay">
      <div className="ref-picker-container">
        <div className="ref-picker-header">
          <h2>Select a reference</h2>
          <button className="ref-picker-close" onClick={onClose}>✕</button>
        </div>
        <div className="ref-picker-content">
          {loading ? (
            <div className="ref-picker-loading">Loading references...</div>
          ) : references.length > 0 ? (
            <div className="ref-picker-grid">
              {references.map((ref) => (
                <ReferencePickerItem key={ref.id} reference={ref} thumbUrl={thumbUrls.get(ref.id) || ''} onClose={onClose} photoId={photoId} onLinked={onLinked} />
              ))}
            </div>
          ) : (
            <div className="ref-picker-empty">No references found</div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ReferencePickerItemProps {
  reference: Reference;
  thumbUrl: string;
  onClose: () => void;
  photoId?: string;
  onLinked?: (referenceId: string, thumbUrl?: string) => void;
}

const ReferencePickerItem: React.FC<ReferencePickerItemProps> = ({ reference, thumbUrl, onClose, photoId, onLinked }) => {
  const handleClick = useCallback(async () => {
    try {
      if (!photoId) {
        console.error('No photoId provided for linking');
        return;
      }
      await PhotoJournalService.linkReference(photoId, reference.id);
      if (onLinked) onLinked(reference.id, thumbUrl);
      onClose();
    } catch (e) {
      console.error('Failed to link reference', e);
    }
  }, [reference.id, photoId, onLinked, onClose, thumbUrl]);

  return (
    <div className="ref-picker-item" onClick={handleClick}>
      <img src={thumbUrl} alt={reference.original_name} loading="lazy" />
      <div className="ref-picker-name">{reference.original_name}</div>
    </div>
  );
};

export default ReferencePickerModal;


