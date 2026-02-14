import React, { useState } from 'react';
import type { FolderItemProps } from '../types';

const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  onDelete,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFileDragOver, setIsFileDragOver] = useState(false);


  // Keep web drag events for file uploads (Tauri native drag and drop)
  const handleWebDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if this is a file drag
    const hasFiles = e.dataTransfer.types.includes('Files') || 
                    e.dataTransfer.types.includes('application/x-moz-file') ||
                    e.dataTransfer.files.length > 0;
    
    if (hasFiles) {
      setIsFileDragOver(true);
    }
  };

  const handleWebDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragOver(false);
  };

  const handleWebDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragOver(false);
  };

  const handleWebDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragOver(false);
  };

  return (
    <div 
      className={`references-folder-item ${isDragOver ? 'drag-over' : ''} ${isFileDragOver ? 'file-drag-over' : ''}`}
      onClick={() => onClick(folder.id)}
      data-folder-id={folder.id}
      id={`folder-${folder.id}`}
      onMouseOver={(e) => onDragOver?.(e, `folder-${folder.id}`)}
      onMouseUp={(e) => onDrop?.(e, `folder-${folder.id}`)}
      onDragOver={handleWebDragOver}
      onDragLeave={handleWebDragLeave}
      onDrop={handleWebDrop}
      onDragEnd={handleWebDragEnd}
      onMouseEnter={(e) => {
        const deleteButton = e.currentTarget.querySelector('button');
        if (deleteButton) {
          deleteButton.style.opacity = "1";
        }
      }}
      onMouseLeave={(e) => {
        // Keep both behaviors: notify parent drag-leave and hide the delete button
        onDragLeave?.(e);
        const deleteButton = e.currentTarget.querySelector('button');
        if (deleteButton) {
          deleteButton.style.opacity = "0";
        }
      }}
    >
      <div 
        className="references-folder-icon"
        style={{ pointerEvents: 'none' }}
      >
        <svg viewBox="0 0 24 24" width="40" height="40" fill={folder.color || 'currentColor'} stroke="none">
          <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
        </svg>
      </div>
      <div 
        className="references-folder-name"
        style={{ pointerEvents: 'none' }}
      >
        {folder.name}
      </div>
      <button
        className="references-folder-delete-button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(folder);
        }}
        onMouseUp={(e) => e.stopPropagation()}
        title="Delete folder"
        draggable={false}
      >
        ×
      </button>
    </div>
  );
};

export default FolderItem;
