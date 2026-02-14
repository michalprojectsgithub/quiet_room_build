import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import type { MoodboardItem as MoodboardItemType } from '../../../services/moodboardService';

interface MoodboardItemProps {
  item: MoodboardItemType;
  isSelected: boolean;
  isEditing: boolean;
  editingContent: string;
  API_BASE: string;
  onMouseDown: (e: React.MouseEvent, itemId: string, renderedSize?: { width: number; height: number }) => void;
  onClick: (itemId: string, displayUrl?: string) => void;
  onDoubleClick: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onEditChange: (content: string) => void;
  onEditSave: () => void;
  onPreview?: (itemId: string, displayUrl?: string) => void;
}

const MoodboardItem: React.FC<MoodboardItemProps> = ({
  item,
  isSelected,
  isEditing,
  editingContent,
  API_BASE,
  onMouseDown,
  onClick,
  onDoubleClick,
  onDelete,
  onEditChange,
  onEditSave,
  onPreview
}) => {
  const [displayUrl, setDisplayUrl] = useState<string>('');
  const [measuredAspectRatio, setMeasuredAspectRatio] = useState<number | null>(null);

  // Convert relative paths to data URLs for display
  useEffect(() => {
    const convertUrlForDisplay = async () => {
      if (item.type === 'image' && item.url) {
        if (item.url.startsWith('data:') || item.url.startsWith('http')) {
          // Already a data URL or HTTP URL, use as is
          setDisplayUrl(item.url);
          // Probe aspect ratio if not provided
          if (!item.aspectRatio) {
            const img = new Image();
            img.onload = () => {
              if (img.naturalWidth && img.naturalHeight) {
                setMeasuredAspectRatio(img.naturalWidth / img.naturalHeight);
              }
            };
            img.src = item.url;
          }
        } else {
          // Relative path, convert to data URL
          try {
            let imagePath = item.url.startsWith('/') ? item.url.substring(1) : item.url;
            
            // Fix common path issues in existing moodboard data
            if (imagePath.startsWith('references/') && !imagePath.includes('/main/') && !imagePath.includes('/folders/')) {
              const filename = imagePath.replace('references/', '');
              imagePath = `references/main/${filename}`;
            } else if (imagePath.startsWith('photo_journal/') && !imagePath.includes('/images/')) {
              const filename = imagePath.replace('photo_journal/', '');
              imagePath = `photo_journal/images/${filename}`;
            }
            
            const dataUrl = await invoke('get_image_data', { imagePath }) as string;
            setDisplayUrl(dataUrl);
            // Measure image to infer aspect ratio
            const img = new Image();
            img.onload = () => {
              if (img.naturalWidth && img.naturalHeight) {
                setMeasuredAspectRatio(img.naturalWidth / img.naturalHeight);
              }
            };
            img.src = dataUrl;
          } catch (error) {
            console.error('Failed to convert image URL for display:', error);
            // Fallback to constructing a full URL
            const fallbackUrl = item.url.startsWith('/') ? `${API_BASE}${item.url}` : `${API_BASE}/${item.url}`;
            setDisplayUrl(fallbackUrl);
          }
        }
      } else if (item.type === 'image' && item.content) {
        // Use content as fallback
        setDisplayUrl(item.content);
      } else {
        setDisplayUrl('');
      }
    };

    convertUrlForDisplay();
  }, [item.url, item.content, item.type, API_BASE]);
  
  // Calculate proper dimensions for images with aspect ratio
  const getImageContainerStyle = () => {
    if (item.type !== 'image') {
      return {
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height
      };
    }

    // For images: force container to exact aspect ratio based on width
    const ratio = (item.aspectRatio && item.aspectRatio > 0)
      ? item.aspectRatio
      : (measuredAspectRatio && measuredAspectRatio > 0 ? measuredAspectRatio : null);
    if (ratio) {
      const coercedWidth = item.width;
      const coercedHeight = coercedWidth / ratio;
      return {
        left: item.x,
        top: item.y,
        width: coercedWidth,
        height: coercedHeight
      };
    }

    // Fallback if aspect ratio missing
    return {
      left: item.x,
      top: item.y,
      width: item.width,
      height: item.height
    };
  };

  const getImageStyle = () => {
    if (item.type !== 'image') return {};

    // Use object-fit: contain to maintain aspect ratio without cropping
    return {
      width: '100%',
      height: '100%',
      objectFit: 'contain' as const,
      objectPosition: 'center' as const
    };
  };

  const containerStyle = getImageContainerStyle();
  const renderedWidth = Number(containerStyle.width) || 0;
  const renderedHeight = Number(containerStyle.height) || 0;
  
  const itemTypeClass = item.type === 'image' ? 'image-item' : item.type === 'color' ? 'color-item' : '';
  
  return (
    <div
      className={`moodboard-editor-item ${isSelected ? 'selected' : ''} ${itemTypeClass}`}
      style={containerStyle}
      onMouseDown={(e) => onMouseDown(e, item.id, { width: renderedWidth, height: renderedHeight })}
      onClick={() => onClick(item.id, displayUrl)}
    >
      {item.type === 'image' && (
        <img
          src={displayUrl}
          alt=""
          className="moodboard-editor-image"
          style={getImageStyle()}
          onError={(e) => {
            console.error('Failed to load image:', displayUrl);
            console.error('Original URL:', item.url);
            console.error('Image element:', e.target);
          }}
        />
      )}

      {item.type === 'image' && onPreview && (
        <button
          className="moodboard-editor-preview-button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(item.id, displayUrl);
          }}
          title="Open fullscreen preview"
        >
          <span className="moodboard-editor-preview-icon" aria-hidden="true">
            ⛶
          </span>
        </button>
      )}
      
      {item.type === 'text' && (
        <div 
          className="moodboard-editor-text"
          style={{
            fontSize: item.fontSize,
            color: item.color
          }}
          onMouseDown={(e) => {
            if (isEditing) {
              e.stopPropagation();
            }
          }}
        >
          {isEditing ? (
            <textarea
              value={editingContent}
              onChange={(e) => onEditChange(e.target.value)}
              onBlur={onEditSave}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onEditSave();
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              autoFocus
              className="moodboard-editor-textarea"
              ref={(textarea) => {
                if (textarea) {
                  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                }
              }}
            />
          ) : (
            <span
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDoubleClick(item.id);
              }}
            >
              {item.content}
            </span>
          )}
        </div>
      )}
      
      {item.type === 'color' && (
        <div 
          className="moodboard-editor-color"
          style={{ backgroundColor: item.content }}
        />
      )}

      {/* Resize handle */}
      <div 
        className={`moodboard-editor-resize-handle ${item.type === 'image' ? 'image-resize-handle' : ''}`} 
      />
      
      {/* Delete button */}
      <button
        className={`moodboard-editor-delete-button ${item.type === 'image' ? 'image-delete-button' : ''} ${item.type === 'color' ? 'color-delete-button' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
      >
        ×
      </button>
    </div>
  );
};

export default MoodboardItem;
