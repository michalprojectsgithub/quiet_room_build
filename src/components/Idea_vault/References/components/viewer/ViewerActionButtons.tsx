import React from 'react';
import ViewerGridControls from './ViewerGridControls';

type GridColor = 'white' | 'black' | 'red';

type Props = {
  measureOn: boolean;
  setMeasureOn: React.Dispatch<React.SetStateAction<boolean>>;
  loupeOn: boolean;
  setLoupeOn: React.Dispatch<React.SetStateAction<boolean>>;
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  gridColor: GridColor;
  setGridColor: React.Dispatch<React.SetStateAction<GridColor>>;
  gridHCount: number;
  gridVCount: number;
  setGridHCount: React.Dispatch<React.SetStateAction<number>>;
  setGridVCount: React.Dispatch<React.SetStateAction<number>>;
  aspectText: string;
  isMonochrome: boolean;
  setIsMonochrome: React.Dispatch<React.SetStateAction<boolean>>;
};

const ViewerActionButtons: React.FC<Props> = ({
  measureOn,
  setMeasureOn,
  loupeOn,
  setLoupeOn,
  showGrid,
  setShowGrid,
  gridColor,
  setGridColor,
  gridHCount,
  gridVCount,
  setGridHCount,
  setGridVCount,
  aspectText,
  isMonochrome,
  setIsMonochrome,
}) => {
  return (
    <>
      <button
        className={`references-viewer-close-x references-icon-button ${measureOn ? 'active' : ''}`}
        style={{ right: 220, width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => setMeasureOn(v => !v)}
        title={measureOn ? 'Disable measure mode' : 'Enable measure mode'}
        aria-label="Toggle measure mode"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
          <rect x="3" y="10" width="18" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M6 10V8 M9 10V7 M12 10V8 M15 10V7 M18 10V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>
      <button
        className={`references-viewer-close-x references-icon-button ${loupeOn ? 'active' : ''}`}
        style={{ right: 170, width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => setLoupeOn(v => !v)}
        title={loupeOn ? 'Disable magnifier' : 'Enable magnifier'}
        aria-label="Toggle magnifier"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      <button
        className={`references-viewer-close-x references-icon-button ${showGrid ? 'active' : ''}`}
        style={{ right: 120, width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => setShowGrid(v => !v)}
        title={showGrid ? 'Hide grid' : 'Show grid'}
        aria-label="Toggle grid"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 3L12 21" />
          <path d="M3 12L21 12" />
        </svg>
      </button>
      <ViewerGridControls
        showGrid={showGrid}
        gridColor={gridColor}
        setGridColor={setGridColor}
        gridHCount={gridHCount}
        gridVCount={gridVCount}
        setGridHCount={setGridHCount}
        setGridVCount={setGridVCount}
        aspectText={aspectText}
      />
      <button
        className={`references-viewer-close-x references-icon-button ${isMonochrome ? 'active' : ''}`}
        style={{ right: 70, width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => setIsMonochrome(v => !v)}
        title={isMonochrome ? 'Disable monochrome' : 'Enable monochrome'}
        aria-label="Toggle monochrome"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12 3 A 9 9 0 0 0 12 21 Z" />
        </svg>
      </button>
    </>
  );
};

export default ViewerActionButtons;

