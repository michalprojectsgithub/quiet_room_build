import React from 'react';

/**
 * Loading state component for References
 */
const LoadingState: React.FC = () => {
  return (
    <div className="references-container">
      <div className="references-loading">
        <div className="references-loading-spinner">⏳</div>
        <div className="references-loading-text">Loading references...</div>
      </div>
    </div>
  );
};

export default LoadingState;
