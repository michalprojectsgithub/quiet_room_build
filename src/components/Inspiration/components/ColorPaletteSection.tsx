import React from 'react';

interface ColorPaletteSectionProps {
  showPalette: boolean;
  colorPalette: string[];
  onGeneratePalette: () => void;
}

const ColorPaletteSection: React.FC<ColorPaletteSectionProps> = ({
  showPalette,
  colorPalette,
  onGeneratePalette
}) => {
  if (!showPalette) return null;

  return (
    <div className="inspiration-palette-toggle">
      <div className="inspiration-palette-display-inline">
        <div className="inspiration-palette-display">
          {colorPalette.map((color, i) => (
            <div key={i} className="inspiration-color-swatch">
              <div
                className="inspiration-color-box"
                style={{
                  backgroundColor: color,
                  border: color === '#FFFFFF' || color === '#F5DEB3' ? '1px solid #333333' : 'none'
                }}
              />
              <span className="inspiration-color-code">{color}</span>
            </div>
          ))}
          <button
            className="inspiration-small-btn inspiration-new-palette-btn"
            onClick={onGeneratePalette}
            title="Generate new palette"
          >
            New Palette
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorPaletteSection;

