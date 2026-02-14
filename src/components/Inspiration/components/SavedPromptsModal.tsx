import React, { useState } from 'react';

interface SavedPromptsModalProps {
  savedPrompts: string[];
  onRemovePrompt: (prompt: string) => void;
  onClose: () => void;
  onCreateMoodboard: (prompt: string) => void;
  onSearchReference: (prompt: string) => void;
}

const SavedPromptsModal: React.FC<SavedPromptsModalProps> = ({
  savedPrompts,
  onRemovePrompt,
  onClose,
  onCreateMoodboard,
  onSearchReference,
}) => {
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; prompt?: string }>({ open: false });

  const openConfirm = (prompt: string) => setConfirmDelete({ open: true, prompt });
  const closeConfirm = () => setConfirmDelete({ open: false, prompt: undefined });
  const confirmDeleteAction = () => {
    if (confirmDelete.prompt) onRemovePrompt(confirmDelete.prompt);
    closeConfirm();
  };

  return (
    <div className="inspiration-modal-overlay" onMouseDown={onClose}>
      <div className="inspiration-modal-content" onMouseDown={(e) => e.stopPropagation()}>
        <button
          className="inspiration-icon-button inspiration-modal-close"
          onClick={onClose}
          title="Close"
          aria-label="Close saved prompts"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        <h3 className="inspiration-saved-title">Saved Prompts ({savedPrompts.length})</h3>
        {savedPrompts.length === 0 ? (
          <p className="inspiration-muted">No saved prompts yet. Save some inspirations to see them here!</p>
        ) : (
          <div className="inspiration-saved-list">
            {savedPrompts.map((prompt, i) => (
              <div key={i} className="inspiration-saved-item">
                <span className="inspiration-saved-prompt">{prompt}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="inspiration-icon-button"
                    title="Create moodboard"
                    aria-label="Create moodboard"
                    onClick={() => onCreateMoodboard(prompt)}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="3" width="8" height="8" />
                      <rect x="13" y="3" width="8" height="8" />
                      <rect x="3" y="13" width="8" height="8" />
                      <rect x="13" y="13" width="8" height="8" />
                    </svg>
                  </button>
                  <button
                    className="inspiration-icon-button"
                    title="Search references"
                    aria-label="Search references"
                    onClick={() => onSearchReference(prompt)}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="11" cy="11" r="7" />
                      <line x1="16.5" y1="16.5" x2="21" y2="21" />
                    </svg>
                  </button>
                  <button
                    className="inspiration-icon-button"
                    onClick={() => openConfirm(prompt)}
                    title="Remove this prompt"
                    aria-label="Remove prompt"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <line x1="6" y1="6" x2="18" y2="18" />
                      <line x1="18" y1="6" x2="6" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDelete.open && (
        <div className="references-modal-overlay" onMouseDown={closeConfirm}>
          <div className="references-modal-content" onMouseDown={(e) => e.stopPropagation()}>
            <h3 className="references-modal-title">Delete saved prompt?</h3>
            <p className="inspiration-muted" style={{ marginBottom: 16 }}>{confirmDelete.prompt}</p>
            <div className="references-modal-buttons">
              <button className="references-modal-cancel-btn" onClick={closeConfirm}>Cancel</button>
              <button className="references-modal-delete-btn" onClick={confirmDeleteAction}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedPromptsModal;

