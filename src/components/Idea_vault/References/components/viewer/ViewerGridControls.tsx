import React from 'react';

type GridColor = 'white' | 'black' | 'red';

type Props = {
  showGrid: boolean;
  gridColor: GridColor;
  setGridColor: (c: GridColor) => void;
  gridHCount: number;
  gridVCount: number;
  setGridHCount: React.Dispatch<React.SetStateAction<number>>;
  setGridVCount: React.Dispatch<React.SetStateAction<number>>;
  aspectText: string;
};

const ViewerGridControls: React.FC<Props> = ({
  showGrid,
  gridColor,
  setGridColor,
  gridHCount,
  gridVCount,
  setGridHCount,
  setGridVCount,
  aspectText,
}) => {
  if (!showGrid) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        right: 120,
        background: '#000',
        border: '1px solid #333',
        borderRadius: 8,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 1102
      }}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        {([
          { key: 'white', color: '#ffffff' },
          { key: 'black', color: '#000000' },
          { key: 'red', color: '#ff0000' }
        ] as Array<{ key: GridColor; color: string }>).map(opt => (
          <button
            key={opt.key}
            onClick={(e) => { e.stopPropagation(); setGridColor(opt.key); }}
            title={`${opt.key} grid`}
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              background: opt.color,
              border: opt.key === 'black' ? '1px solid #666' : '1px solid #222',
              boxShadow: gridColor === opt.key ? '0 0 0 2px #fff inset' : 'none',
              cursor: 'pointer'
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
        <span style={{ color: '#ccc', fontSize: 12, minWidth: 10, textAlign: 'center' }}>H</span>
        <button onClick={(e) => { e.stopPropagation(); setGridHCount(c => Math.max(1, c - 1)); }} title="Less horizontal lines" style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #444', background: '#111', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: 1, padding: 0 }}>−</button>
        <span style={{ color: '#fff', fontSize: 12, minWidth: 14, textAlign: 'center' }}>{gridHCount}</span>
        <button onClick={(e) => { e.stopPropagation(); setGridHCount(c => Math.min(12, c + 1)); }} title="More horizontal lines" style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #444', background: '#111', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: 1, padding: 0 }}>+</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
        <span style={{ color: '#ccc', fontSize: 12, minWidth: 10, textAlign: 'center' }}>V</span>
        <button onClick={(e) => { e.stopPropagation(); setGridVCount(c => Math.max(1, c - 1)); }} title="Less vertical lines" style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #444', background: '#111', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: 1, padding: 0 }}>−</button>
        <span style={{ color: '#fff', fontSize: 12, minWidth: 14, textAlign: 'center' }}>{gridVCount}</span>
        <button onClick={(e) => { e.stopPropagation(); setGridVCount(c => Math.min(12, c + 1)); }} title="More vertical lines" style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #444', background: '#111', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: 1, padding: 0 }}>+</button>
      </div>
      <div style={{ color: '#ccc', fontSize: 12, textAlign: 'center', paddingTop: 2 }}>
        {aspectText ? `Aspect: ${aspectText}` : ''}
      </div>
    </div>
  );
};

export default ViewerGridControls;

