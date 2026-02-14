import React from 'react';
import type { FolderModalProps } from '../types';

const FolderModal: React.FC<FolderModalProps> = ({
  folderName,
  setFolderName,
  onCreate,
  onCancel
}) => {
  return (
    <div className="references-modal-overlay">
      <div className="references-modal-content">
        <h3 className="references-modal-title">
          Create New Folder
        </h3>

        <div className="references-folder-input-container">
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Enter folder name..."
            className="references-folder-input"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && folderName.trim()) {
                onCreate();
              } else if (e.key === 'Escape') {
                onCancel();
              }
            }}
          />
        </div>

        <div className="references-modal-buttons">
          <button
            className="references-modal-cancel-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="references-modal-create-btn"
            onClick={onCreate}
            disabled={!folderName.trim()}
          >
            Create Folder
          </button>
        </div>

        <div className="references-modal-decoration-1" />
        <div className="references-modal-decoration-2" />
      </div>
    </div>
  );
};

export default FolderModal;
