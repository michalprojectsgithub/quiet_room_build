import React from 'react';
import type { DeleteModalProps } from '../types';

const DeleteModal: React.FC<DeleteModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="references-modal-overlay">
      <div className="references-modal-content">
        <h3 className="references-modal-title">
          Delete Reference
        </h3>

        <p className="references-modal-description">
          This action cannot be undone. The image reference will be permanently deleted from your collection.
        </p>

        <div className="references-modal-buttons">
          <button
            className="references-modal-cancel-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="references-modal-delete-btn"
            onClick={onConfirm}
          >
            Delete Reference
          </button>
        </div>

        <div className="references-modal-decoration-1" />
        <div className="references-modal-decoration-2" />
      </div>
    </div>
  );
};

export default DeleteModal;
