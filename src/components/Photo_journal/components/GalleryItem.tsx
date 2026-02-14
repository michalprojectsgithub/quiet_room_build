import React from 'react';
import type { PhotoJournalImage } from '../../../services/photoJournalService';

interface GalleryItemProps {
  image: PhotoJournalImage;
  imageUrl: string;
  index: number;
  onView: (index: number) => void;
  onDelete: (image: PhotoJournalImage) => void;
  formatDate: (dateString: string) => string;
  formatFileSize: (bytes: number) => string;
}

const GalleryItem: React.FC<GalleryItemProps> = ({
  image,
  imageUrl,
  index,
  onView,
  onDelete,
  formatDate,
  formatFileSize
}) => {
  const rotation = image.rotation ?? 0;
  return (
    <div className="gallery-item">
      <div className="image-container">
        <img 
          src={imageUrl} 
          alt={image.originalName}
          className="gallery-image"
          onClick={() => onView(index)}
          style={{ transform: `rotate(${rotation}deg)` }}
        />
        <div className="image-overlay">
          <button 
            onClick={() => onDelete(image)}
            className="delete-button"
            title="Delete image"
          >
            ×
          </button>
        </div>
      </div>
      <div className="image-info">
        <p className="image-name">{image.originalName}</p>
        <p className="image-date">{formatDate(image.uploadDate)}</p>
        <p className="image-size">{formatFileSize(image.size)}</p>
        {image.prompt && (
          <p className="image-prompt">
            "{image.prompt}"
          </p>
        )}
      </div>
    </div>
  );
};

export default GalleryItem;


