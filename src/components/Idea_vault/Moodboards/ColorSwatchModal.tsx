import React from 'react';

interface ColorSwatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  onAddColorSwatch: () => void;
}

const ColorSwatchModal: React.FC<ColorSwatchModalProps> = ({
  isOpen,
  onClose,
  selectedColor,
  onColorChange,
  onAddColorSwatch
}) => {
  const handleHexChange = (hex: string) => {
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
      onColorChange(hex);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="moodboard-editor-modal">
      <div className="moodboard-editor-modal-content simple-color-picker">
        <h3>Add Color Swatch</h3>
        
        <div className="color-picker-main">
          {/* Native Color Picker */}
          <div className="color-picker-section">
            <label htmlFor="color-picker">Choose Color:</label>
            <input
              id="color-picker"
              type="color"
              value={selectedColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="native-color-picker"
            />
          </div>

          {/* Color Preview and Hex Input */}
          <div className="color-preview-section">
            <div 
              className="color-preview"
              style={{ backgroundColor: selectedColor }}
            />
            <div className="color-info">
              <input
                type="text"
                value={selectedColor}
                onChange={(e) => handleHexChange(e.target.value)}
                className="hex-input"
                placeholder="#000000"
              />
            </div>
          </div>
        </div>

        <div className="moodboard-editor-modal-actions">
          <button
            className="moodboard-editor-button"
            onClick={onAddColorSwatch}
          >
            Add Color Swatch
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

export default ColorSwatchModal;
