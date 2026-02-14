import { useCallback, useState } from 'react';

export const useColorPalette = () => {
  const [colorPalette, setColorPalette] = useState<string[]>([]);
  const [showPalette, setShowPalette] = useState(false);

  const generateColorPalette = useCallback(() => {
    const paletteSizes = [3, 4, 5];
    const size = paletteSizes[Math.floor(Math.random() * paletteSizes.length)];

    const colorSchemes = [
      ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96CEB4'],
      ['#A8E6CF', '#DCEDC1', '#FFD3B6', '#FFAAA5', '#FF8B94'],
      ['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F5DEB3'],
      ['#1E3A8A', '#3B82F6', '#06B6D4', '#0891B2', '#0EA5E9'],
      ['#FF6B35', '#F7931E', '#FFD23F', '#F4A261', '#E76F51'],
      ['#2D5016', '#4A7C59', '#6B8E23', '#9ACD32', '#ADFF2F'],
      ['#8B0000', '#DC143C', '#FF1493', '#FF69B4', '#FFB6C1'],
      ['#D2B48C', '#F4A460', '#DEB887', '#DAA520', '#BDB76B'],
      ['#191970', '#483D8B', '#6A5ACD', '#9370DB', '#BA55D3'],
      ['#98FB98', '#90EE90', '#32CD32', '#228B22', '#006400'],
    ];

    const selectedScheme = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];
    const palette = selectedScheme.slice(0, size);

    setColorPalette(palette);
    setShowPalette(true);
  }, []);

  const togglePalette = useCallback(() => {
    if (!showPalette) {
      generateColorPalette();
    } else {
      setShowPalette(false);
    }
  }, [showPalette, generateColorPalette]);

  return {
    colorPalette,
    showPalette,
    generateColorPalette,
    togglePalette,
  };
};

