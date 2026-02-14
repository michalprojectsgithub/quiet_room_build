import React from 'react';

export interface FileUploadButtonProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  disabled?: boolean;
}

const FileUploadButton: React.FC<FileUploadButtonProps> = ({ onFileUpload, disabled = false }) => {
  return (
    <div className="references-upload-section">
      <input
        type="file"
        accept="image/*"
        onChange={onFileUpload}
        style={{ display: 'none' }}
        id="file-upload-input"
        disabled={disabled}
      />
      <label 
        htmlFor="file-upload-input" 
        className={`references-upload-button ${disabled ? 'disabled' : ''}`}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        Upload image
      </label>
    </div>
  );
};

export default FileUploadButton;
