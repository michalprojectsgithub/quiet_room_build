import React from 'react';

interface InspirationDisplayProps {
  index: number | null;
  filteredInspirations: string[];
  onSearchReference: () => void;
  onCreateMoodboard: () => void;
  onTogglePalette: () => void;
  isPaletteActive: boolean;
  onNavPrev: () => void;
  onNavNext: () => void;
  canNavPrev: boolean;
  canNavNext: boolean;
  onSavePrompt: () => void;
  isSaved: boolean;
}

const InspirationDisplay: React.FC<InspirationDisplayProps> = ({
  index,
  filteredInspirations,
  onSearchReference,
  onCreateMoodboard,
  onTogglePalette,
  isPaletteActive,
  onNavPrev,
  onNavNext,
  canNavPrev,
  canNavNext,
  onSavePrompt,
  isSaved,
}) => {
  return (
    <>
      <div className="inspiration-inspo">
        {index !== null && (
          <>
            <button
              className={`inspiration-icon-button inspiration-inspo-action-tl ${canNavPrev ? '' : 'disabled'}`}
              onClick={onNavPrev}
              disabled={!canNavPrev}
              title="Previous"
              aria-label="Previous prompt"
            >
              ❮
            </button>
            <button
              className={`inspiration-icon-button inspiration-inspo-action-tl2 ${canNavNext ? '' : 'disabled'}`}
              onClick={onNavNext}
              disabled={!canNavNext}
              title="Next"
              aria-label="Next prompt"
            >
              ❯
            </button>
            <button
              className="inspiration-icon-button inspiration-inspo-action inspiration-inspo-action-left"
              onClick={onCreateMoodboard}
              disabled={index === null}
              title={index === null ? "Pick an inspiration first" : "Create moodboard from this prompt"}
              aria-label="Create moodboard"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="3" width="8" height="8" />
                <rect x="13" y="3" width="8" height="8" />
                <rect x="3" y="13" width="8" height="8" />
                <rect x="13" y="13" width="8" height="8" />
              </svg>
            </button>
            <button
              className="inspiration-icon-button inspiration-inspo-action"
              onClick={onSearchReference}
              disabled={index === null}
              title={index === null ? "Pick an inspiration first" : "Search references for this prompt"}
              aria-label="Search references"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" />
              </svg>
            </button>
            <button
              className={`inspiration-icon-button inspiration-inspo-action-bl ${isPaletteActive ? 'active' : ''}`}
              onClick={onTogglePalette}
              title="Toggle color palette"
              aria-label="Toggle color palette"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 0-5H13a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h1a2 2 0 1 0 0-4 1 1 0 0 1-1-1V7a4 4 0 0 0-1-4z" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="7.5" cy="10" r="1.2" />
                <circle cx="9.5" cy="6.5" r="1.2" />
                <circle cx="12.5" cy="5.5" r="1.2" />
                <circle cx="16" cy="9" r="1.2" />
              </svg>
            </button>
            <button
              className={`inspiration-icon-button inspiration-inspo-action-br ${isSaved ? 'active' : ''}`}
              onClick={onSavePrompt}
              disabled={index === null}
              title={isSaved ? 'Already saved' : 'Save for later'}
              aria-label="Save for later"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1z" />
              </svg>
            </button>
          </>
        )}
        {index === null ? (
          <em>Ready when you are. Generate your first inspiration!</em>
        ) : (
          filteredInspirations[index]
        )}
      </div>
    </>
  );
};

export default InspirationDisplay;

