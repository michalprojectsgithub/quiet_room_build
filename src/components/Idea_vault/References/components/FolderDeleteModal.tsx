import React from 'react';
import type { FolderDeleteModalProps } from '../types';

const FolderDeleteModal: React.FC<FolderDeleteModalProps> = ({
  folder,
  onConfirm,
  onCancel
}) => {
  return (
    <div className="references-modal-overlay">
      <div className="references-modal-content">
        <h3 className="references-modal-title">
          Delete Folder
        </h3>

        <p className="references-modal-description">
          This action cannot be undone. The folder "{folder.name}" will be permanently deleted.
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
            Delete Folder
          </button>
        </div>

        <div className="references-modal-decoration-1" />
        <div className="references-modal-decoration-2" />
      </div>
    </div>
  );
};

export default FolderDeleteModal;
