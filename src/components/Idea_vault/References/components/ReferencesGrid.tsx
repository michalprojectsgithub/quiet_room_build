import React from 'react';
import type { Reference, Folder } from '../types';
import { ReferenceItem, FolderItem, UploadingPlaceholder } from './';

export interface ReferencesGridProps {
  references: Reference[];
  folders: Folder[];
  referenceUrls: Map<string, string>;
  uploadingImages: Set<string>;
  activeFolderId: string | null;
  draggedReference: Reference | null;
  onReferenceClick: (reference: Reference, index: number) => void;
  onReferenceDelete: (reference: Reference) => void;
  onReferenceDragStart: (reference: Reference) => void;
  onFolderClick: (folder: Folder) => void;
  onFolderDelete: (folder: Folder) => void;
  onFolderDragOver: (e: React.MouseEvent, folderId: string) => void;
  onFolderDragLeave: (e: React.MouseEvent) => void;
  onFolderDrop: (e: React.MouseEvent, folderId: string) => void;
  API_BASE: string;
  isFiltering?: boolean;
  onItemTagChange?: (reference: Reference, tag: string, op: 'add' | 'remove') => void;
}

const ReferencesGrid: React.FC<ReferencesGridProps> = ({
  references,
  folders,
  referenceUrls,
  uploadingImages,
  activeFolderId,
  draggedReference,
  onReferenceClick,
  onReferenceDelete,
  onReferenceDragStart,
  onFolderClick,
  onFolderDelete,
  onFolderDragOver,
  onFolderDragLeave,
  onFolderDrop,
  API_BASE,
  isFiltering = false,
  onItemTagChange
}) => {
  // In main gallery, show both folders and main references
  // In folder view, show only folder references
  const showMainGallery = !activeFolderId;
  const showFolders = showMainGallery && !isFiltering;
  const totalItems = (showFolders ? folders.length : 0) + references.length;

  if (totalItems === 0 && uploadingImages.size === 0) {
    return (
      <div className="references-empty">
        <div className="references-empty-icon">Folder</div>
        <div className="references-empty-text">
          {activeFolderId ? 'No images in this folder' : 'No folders or images yet'}
        </div>
        <div className="references-empty-subtext">
          {activeFolderId 
            ? 'Upload images or move them here from the main gallery'
            : 'Create folders or upload images to get started'
          }
        </div>
      </div>
    );
  }

  return (
    <div className="references-grid">
      {/* Show uploading placeholders first */}
      {Array.from(uploadingImages).map((tempId) => (
        <UploadingPlaceholder key={tempId} />
      ))}
      
      {/* Show folders first in main gallery when not filtering */}
      {showFolders && folders.map((folder, index) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          onClick={() => onFolderClick(folder)}
          onDelete={() => onFolderDelete(folder)}
          onDragOver={(e) => onFolderDragOver(e, `folder-${folder.id}`)}
          onDragLeave={onFolderDragLeave}
          onDrop={(e) => onFolderDrop(e, `folder-${folder.id}`)}
        />
      ))}
      
      {/* Show references (main gallery references or folder references) */}
      {references.map((reference, index) => (
        <ReferenceItem
          key={reference.id}
          reference={reference}
          imageUrl={referenceUrls.get(reference.id) || ''}
          index={index}
          API_BASE={API_BASE}
          onView={() => onReferenceClick(reference, index)}
          onDelete={() => onReferenceDelete(reference)}
          onAddTag={(ref, tag, op) => { if (onItemTagChange) onItemTagChange(ref, tag, op); }}
          onDragStart={() => onReferenceDragStart(reference)}
          draggable={true}
          isGloballyDragging={draggedReference?.id === reference.id}
        />
      ))}
    </div>
  );
};

export default ReferencesGrid;
