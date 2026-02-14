import React from 'react';

interface TextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  content: string;
  onContentChange: (content: string) => void;
}

const TextModal: React.FC<TextModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  content,
  onContentChange
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      onSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="moodboard-editor-modal">
      <div className="moodboard-editor-modal-content">
        <h3>Add Text Note</h3>
        
        <div className="moodboard-editor-modal-section">
          <label htmlFor="text-content">Enter your text:</label>
          <textarea
            id="text-content"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your text here..."
            className="moodboard-editor-textarea"
            autoFocus
            rows={6}
          />
          <small>Press Ctrl+Enter to save, or Escape to cancel</small>
        </div>

        <div className="moodboard-editor-modal-actions">
          <button
            className="moodboard-editor-button"
            onClick={onSubmit}
            disabled={!content.trim()}
          >
            Add Text Note
          </button>
          <button
            className="moodboard-editor-button moodboard-editor-button-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TextModal;
