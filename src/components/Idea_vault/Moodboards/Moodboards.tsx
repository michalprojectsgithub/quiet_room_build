import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import './Moodboards.css';
import MoodboardEditor from './Moodboard_editor';
import { MoodboardService, type Moodboard } from '../../../services/moodboardService';

interface MoodboardsProps {
  ideaVaultTab: 'moodboards' | 'notes' | 'references';
  API_BASE: string;
  refreshSignal?: number;
}

const Moodboards: React.FC<MoodboardsProps> = ({ 
  ideaVaultTab, 
  API_BASE,
  refreshSignal
}) => {
  // State variables
  const [convertedMoodboards, setConvertedMoodboards] = useState<Moodboard[]>([]);
  const [showCreateMoodboard, setShowCreateMoodboard] = useState(false);
  const [newMoodboardTitle, setNewMoodboardTitle] = useState('');
  const [showDeleteMoodboardModal, setShowDeleteMoodboardModal] = useState(false);
  const [moodboardToDelete, setMoodboardToDelete] = useState<string | null>(null);
  const [editingMoodboard, setEditingMoodboard] = useState<Moodboard | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Convert relative paths to data URLs for moodboard preview images (display only, doesn't modify original data)
  const convertMoodboardPathsForPreview = useCallback(async (moodboards: Moodboard[]) => {
    const convertedMoodboards = await Promise.all(moodboards.map(async (moodboard) => {
      const convertedItems = await Promise.all(moodboard.items.map(async (item) => {
        if (item.type === 'image' && item.url && !item.url.startsWith('data:') && !item.url.startsWith('http')) {
          try {
            // Convert relative path to proper path format
            let imagePath = item.url.startsWith('/') ? item.url.substring(1) : item.url;
            
            // Fix common path issues in existing moodboard data
            if (imagePath.startsWith('references/') && !imagePath.includes('/main/') && !imagePath.includes('/folders/')) {
              // Convert /references/filename to references/main/filename
              const filename = imagePath.replace('references/', '');
              imagePath = `references/main/${filename}`;
            } else if (imagePath.startsWith('photo_journal/') && !imagePath.includes('/images/')) {
              // Convert /photo_journal/filename to photo_journal/images/filename
              const filename = imagePath.replace('photo_journal/', '');
              imagePath = `photo_journal/images/${filename}`;
            }
            
            const dataUrl = await invoke('get_image_data', { imagePath }) as string;
            // Create a new item with displayUrl for preview, but keep original url intact
            return { ...item, displayUrl: dataUrl };
          } catch (error) {
            console.error(`Failed to convert relative path ${item.url} to data URL for preview:`, error);
            return item; // Return original item if conversion fails
          }
        }
        return item;
      }));
      return { ...moodboard, items: convertedItems };
    }));
    return convertedMoodboards;
  }, []);

  // Load moodboards from Tauri service on app start or when refreshSignal changes
  useEffect(() => {
    const fetchMoodboards = async () => {
      try {
        const data = await MoodboardService.getMoodboards();
        // Convert paths for preview images
        const converted = await convertMoodboardPathsForPreview(data);
        setConvertedMoodboards(converted);
      } catch (error) {
        console.error('Error loading moodboards from Tauri service:', error);
      }
    };
    fetchMoodboards();
  }, [convertMoodboardPathsForPreview, refreshSignal]);



  // Basic functions
  const formatMoodboardDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const createMoodboard = async () => {
    const trimmedTitle = newMoodboardTitle.trim();
    if (!trimmedTitle) return;
    
    try {
      const newMoodboard = await invoke('create_moodboard', { title: trimmedTitle });
      // Convert paths for the new moodboard (for preview only)
      const converted = await convertMoodboardPathsForPreview([newMoodboard as any]);
      setConvertedMoodboards(prev => [converted[0], ...prev]);
      setNewMoodboardTitle('');
      setShowCreateMoodboard(false);
    } catch (error) {
      console.error('Error creating moodboard:', error);
    }
  };



  const confirmDeleteMoodboard = (id: string) => {
    setMoodboardToDelete(id);
    setShowDeleteMoodboardModal(true);
  };

  const handleDeleteMoodboard = async () => {
    if (!moodboardToDelete) return;
    
    try {
      await invoke('delete_moodboard', { moodboardId: moodboardToDelete });
      setConvertedMoodboards(prev => prev.filter(moodboard => moodboard.id !== moodboardToDelete));
      setShowDeleteMoodboardModal(false);
      setMoodboardToDelete(null);
    } catch (error) {
      console.error('Error deleting moodboard:', error);
    }
  };

  const cancelDeleteMoodboard = () => {
    setShowDeleteMoodboardModal(false);
    setMoodboardToDelete(null);
  };

  // Editor functions
  const openMoodboardEditor = (moodboard: Moodboard) => {
    setEditingMoodboard(moodboard);
    setIsEditorOpen(true);
  };

  const closeMoodboardEditor = () => {
    setIsEditorOpen(false);
    setEditingMoodboard(null);
  };

  const handleMoodboardUpdate = async (updatedMoodboard: Moodboard) => {
    // Convert paths for preview so the grid can display images immediately
    const converted = await convertMoodboardPathsForPreview([updatedMoodboard]);
    setConvertedMoodboards(prev => prev.map(moodboard => 
      moodboard.id === converted[0].id ? converted[0] : moodboard
    ));
  };

  // Return JSX for the moodboards tab
  if (ideaVaultTab !== 'moodboards') {
    return null;
  }

  return (
    <>
      <div className="moodboards-header">
        <h3 className="moodboards-title">
          Your Moodboards
        </h3>
        <button
          className="moodboards-create-button"
          onClick={() => setShowCreateMoodboard(true)}
        >
          Create Moodboard
        </button>
      </div>

      {/* Moodboard Grid */}
      {convertedMoodboards.length === 0 ? (
        <div className="moodboards-empty-state">
          <h3 className="moodboards-empty-title">No moodboards yet</h3>
          <p className="moodboards-empty-text">
            Create your first moodboard to start organizing your creative ideas
          </p>
          <p className="moodboards-empty-subtext">
            Add images, text notes, and color palettes to build your inspiration collection
          </p>
        </div>
      ) : (
        <div className="moodboards-grid">
          {convertedMoodboards.map((moodboard) => (
            <div 
              key={moodboard.id} 
              className="moodboards-card"
              onClick={() => openMoodboardEditor(moodboard)}
            >
              <div className="moodboards-preview">
                {moodboard.items.length === 0 ? (
                  <div className="moodboards-preview-empty">
                    Moodboard
                  </div>
                ) : (
                  <div className="moodboards-preview-container">
                    {/* Simple preview - just show first few items */}
                    {moodboard.items.slice(0, 4).map((item, index) => (
                      <div
                        key={item.id}
                        className="moodboards-preview-item"
                        style={{
                          top: `${8 + (index * 20)}px`,
                          left: `${8 + (index * 20)}px`
                        }}
                      >
                        {item.type === 'image' && (
                          <img
                            src={(item as any).displayUrl || item.url || item.content || ''}
                            alt=""
                          />
                        )}
                        {item.type === 'text' && (
                          <div className="moodboards-preview-text">
                            {item.content?.slice(0, 30) || ''}
                            {(item.content?.length || 0) > 30 ? '...' : ''}
                          </div>
                        )}
                        {item.type === 'color' && (
                          <div 
                            className="moodboards-preview-color"
                            style={{
                              backgroundColor: item.colors?.[0] || item.content
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDeleteMoodboard(moodboard.id);
                  }}
                  className="moodboards-delete-button"
                  title="Delete moodboard"
                >
                  ×
                </button>
              </div>
              <div className="moodboards-info">
                <h3 className="moodboards-card-title">{moodboard.title}</h3>
                <p className="moodboards-card-date">
                  {formatMoodboardDate(moodboard.createdAt)}
                </p>
                <p className="moodboards-card-stats">
                  {moodboard.items.length} items
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Moodboard Modal */}
      {showCreateMoodboard && (
        <div className="moodboards-modal">
          <div className="moodboards-modal-content">
            <h3 className="moodboards-modal-title">Create New Moodboard</h3>
            <input
              type="text"
              placeholder="Enter moodboard title..."
              value={newMoodboardTitle}
              onChange={(e) => setNewMoodboardTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createMoodboard()}
              className="moodboards-modal-input"
              autoFocus
            />
            <div className="moodboards-modal-buttons">
              <button
                className="moodboards-modal-button moodboards-modal-button-cancel"
                onClick={() => {
                  setShowCreateMoodboard(false);
                  setNewMoodboardTitle('');
                }}
              >
                Cancel
              </button>
              <button
                className={`moodboards-modal-button moodboards-modal-button-create ${!newMoodboardTitle.trim() ? 'disabled' : ''}`}
                onClick={createMoodboard}
                disabled={!newMoodboardTitle.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Moodboard Confirmation Modal */}
      {showDeleteMoodboardModal && (
        <div className="moodboards-delete-modal">
          <div className="moodboards-delete-content">
            <h3 className="moodboards-delete-title">
              Delete Moodboard
            </h3>
            <p className="moodboards-delete-description">
              This action cannot be undone. The moodboard and all its items will be permanently deleted.
            </p>
            <div className="moodboards-delete-buttons">
              <button
                onClick={cancelDeleteMoodboard}
                className="moodboards-delete-button-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMoodboard}
                className="moodboards-delete-button-confirm"
              >
                Delete Moodboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moodboard Editor */}
      <MoodboardEditor
        moodboard={editingMoodboard}
        isOpen={isEditorOpen}
        onClose={closeMoodboardEditor}
        API_BASE={API_BASE}
        onMoodboardUpdate={handleMoodboardUpdate}
      />
    </>
  );
};

export default Moodboards;
