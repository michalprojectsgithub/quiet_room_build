import React from 'react';
import type { PhotoJournalImage } from '../../../services/photoJournalService';

interface DeleteModalProps {
  image: PhotoJournalImage;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ image, onConfirm, onCancel }) => {
  return (
    <div className="delete-modal-overlay">
      <div className="delete-modal-content">
        <h3 className="delete-modal-title">Delete Image</h3>
        <p className="delete-modal-description">
          This action cannot be undone. The image "{image.originalName}" will be permanently deleted from your photo journal.
        </p>
        <div className="delete-modal-buttons">
          <button onClick={onCancel} className="delete-modal-cancel-btn">Cancel</button>
          <button onClick={onConfirm} className="delete-modal-delete-btn">Delete Image</button>
        </div>
        <div className="delete-modal-decoration-1" />
        <div className="delete-modal-decoration-2" />
      </div>
    </div>
  );
};

export default DeleteModal;


