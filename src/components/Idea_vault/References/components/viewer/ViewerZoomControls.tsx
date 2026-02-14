import React from 'react';

type Props = {
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
};

const ViewerZoomControls: React.FC<Props> = ({ zoom, setZoom, setOffset }) => {
  return (
    <div className="references-zoom-controls">
      <button onClick={() => setZoom(z => Math.max(0.2, +(z - 0.2).toFixed(2)))} title="Zoom out">–</button>
      <span>{Math.round(zoom * 100)}%</span>
      <button onClick={() => setZoom(z => Math.min(8, +(z + 0.2).toFixed(2)))} title="Zoom in">+</button>
      <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} title="Reset">Reset</button>
    </div>
  );
};

export default ViewerZoomControls;

