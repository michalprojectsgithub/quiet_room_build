import React from 'react';

/**
 * Loading state component for Photo Journal.
 * Displays a loading spinner and message.
 */
const LoadingState: React.FC = () => {
  return (
    <div className="photo-journal-loading">
      <div className="photo-journal-loading-spinner">Loading artwork journal...</div>
    </div>
  );
};

export default LoadingState;
