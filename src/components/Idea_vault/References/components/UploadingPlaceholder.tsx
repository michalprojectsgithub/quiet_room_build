import React from 'react';

const UploadingPlaceholder: React.FC = () => (
  <div className="references-item uploading">
    <div className="references-uploading-placeholder">
      <div className="references-uploading-spinner">⏳</div>
      <div className="references-uploading-text">Uploading...</div>
    </div>
  </div>
);

export default UploadingPlaceholder;
