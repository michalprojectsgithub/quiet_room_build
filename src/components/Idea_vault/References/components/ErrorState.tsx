import React from 'react';

interface ErrorStateProps {
  error: string;
}

/**
 * Error state component for References
 */
const ErrorState: React.FC<ErrorStateProps> = ({ error }) => {
  return (
    <div className="references-container">
      <div className="references-error">
        <div className="references-error-icon">❌</div>
        <div className="references-error-text">Error loading references</div>
        <div className="references-error-details">{error}</div>
      </div>
    </div>
  );
};

export default ErrorState;
