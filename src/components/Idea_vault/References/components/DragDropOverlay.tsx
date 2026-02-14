import React from 'react';

export interface DragDropOverlayProps {
  isFileDragOver: boolean;
  draggedReference: any;
  dragPosition: { x: number; y: number } | null;
  referenceUrls: Map<string, string>;
}

const DragDropOverlay: React.FC<DragDropOverlayProps> = ({
  isFileDragOver,
  draggedReference,
  dragPosition,
  referenceUrls
}) => {
  if (!isFileDragOver && !draggedReference) return null;

  return (
    <>
      {/* File drag overlay */}
      {isFileDragOver && (
        <div className="drag-drop-message">
          📁 Drop images here
        </div>
      )}
      
      {/* Custom drag overlay */}
      {draggedReference && dragPosition && (
        <>
          <div
            className="custom-drag-overlay"
            style={{
              position: 'fixed',
              left: dragPosition.x - 50,
              top: dragPosition.y - 50,
              zIndex: 1000,
              pointerEvents: 'none',
              opacity: 0.8,
              transform: 'rotate(-5deg)',
              width: '100px',
              height: '100px',
              border: '2px dashed #8b5cf6',
              borderRadius: '8px',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#8b5cf6',
              fontWeight: 'bold',
              textAlign: 'center',
              padding: '4px',
              boxSizing: 'border-box'
            }}
          >
            {referenceUrls.get(draggedReference.id) ? (
              <img
                src={referenceUrls.get(draggedReference.id) || draggedReference.url}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '6px'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `Image<br/>${draggedReference.filename}`;
                  }
                }}
              />
            ) : (
              `Image<br/>${draggedReference.filename}`
            )}
          </div>
        </>
      )}
    </>
  );
};

export default DragDropOverlay;
