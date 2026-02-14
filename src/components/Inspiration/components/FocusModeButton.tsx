import React from 'react';

interface FocusModeButtonProps {
  index: number | null;
  onStartFocusMode: () => void;
}

const FocusModeButton: React.FC<FocusModeButtonProps> = ({
  index,
  onStartFocusMode
}) => {
  return (
    <button
      className="inspiration-icon-button"
      onClick={onStartFocusMode}
      disabled={index === null}
      title={index === null ? "Pick an inspiration first" : "Enter focus mode"}
      aria-label="Focus mode"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="7" />
        <line x1="12" y1="3" x2="12" y2="7" />
        <line x1="12" y1="17" x2="12" y2="21" />
        <line x1="3" y1="12" x2="7" y2="12" />
        <line x1="17" y1="12" x2="21" y2="12" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
};

export default FocusModeButton;

