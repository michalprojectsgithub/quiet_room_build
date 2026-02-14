import React, { useEffect, useRef, useState } from 'react';
import { ReferencesService } from '../../../../services/referencesService';
import type { Folder } from '../types';
import { formatReferenceDate } from '../utils';

export interface ReferencesHeaderProps {
  activeFolderId: string | null;
  folders: Folder[];
  references: any[];
  folderReferences: any[];
  uploadingImages: Set<string>;
  onBackClick: () => void;
  onAddFolderClick: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onPhoneUploadClick: () => void;
  onCustomDragOver: (e: React.MouseEvent, elementId: string) => void;
  onCustomDragLeave: (e: React.MouseEvent) => void;
  onCustomDrop: (e: React.MouseEvent, elementId: string) => void;
  onTagsClick: () => void;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
  filterMode: 'any' | 'all';
  onChangeFilterMode: (mode: 'any' | 'all') => void;
  onRenameTag?: (oldName: string, newName: string) => void;
  loading?: boolean;
}

const ReferencesHeader: React.FC<ReferencesHeaderProps> = ({
  activeFolderId,
  folders,
  references,
  folderReferences,
  uploadingImages,
  onBackClick,
  onAddFolderClick,
  onFileUpload,
  onPhoneUploadClick,
  onCustomDragOver,
  onCustomDragLeave,
  onCustomDrop,
  onTagsClick,
  selectedTags,
  onToggleTag,
  onClearTags,
  filterMode,
  onChangeFilterMode,
  onRenameTag,
  loading = false
}) => {
  const activeFolder = folders.find(f => f.id === activeFolderId);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [newTag, setNewTag] = useState('');
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; tag?: string }>({ open: false });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    // Use mouseup so input onBlur runs before closing dropdown (enables rename on click-away)
    document.addEventListener('mouseup', handler);
    return () => document.removeEventListener('mouseup', handler);
  }, []);

  const toggleDropdown = async () => {
    if (!dropdownOpen) {
      // Load custom tags unioned with observed tags
      const list = await ReferencesService.listCustomTags();
      setTags(list);
      // Compute counts across all references (main + folders)
      try {
        const all = await ReferencesService.getReferences();
        const counts: Record<string, number> = {};
        all.forEach(ref => {
          const refTags = (ref as any).tags as string[] | undefined;
          if (refTags && refTags.length) {
            refTags.forEach(t => {
              const key = t.toLowerCase();
              counts[key] = (counts[key] || 0) + 1;
            });
          }
        });
        setTagCounts(counts);
      } catch (e) {
        console.error('Failed to compute tag counts', e);
        setTagCounts({});
      }
      setCreating(false);
      setNewTag('');
    }
    setDropdownOpen(prev => !prev);
  };

  const startCreate = () => {
    setCreating(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submitCreate = async () => {
    const name = newTag.trim();
    if (!name) return;
    const updated = await ReferencesService.createCustomTag(name);
    setTags(updated);
    setNewTag('');
    setCreating(false);
  };
  const totalItems = activeFolderId 
    ? folderReferences.length + uploadingImages.size
    : folders.length + references.length + uploadingImages.size;

  return (
    <div className="references-header">
      <div>
        <h3 className="references-title">
          {activeFolder ? activeFolder.name : 'References'}
        </h3>
        <p className="references-subtitle">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
          {activeFolder && (
            <span className="references-folder-info">
              {' • '}
              Created {formatReferenceDate(activeFolder.created_at)}
            </span>
          )}
        </p>
      </div>
      <div className="references-actions">
        {activeFolder && (
          <button
            id="back-button"
            className="references-back-button"
            onClick={onBackClick}
            onMouseOver={(e) => onCustomDragOver(e, 'back-button')}
            onMouseLeave={onCustomDragLeave}
            onMouseUp={(e) => onCustomDrop(e, 'back-button')}
          >
            ← Back
          </button>
        )}
        <div className="references-upload-section">
          <input
            type="file"
            accept="image/*"
            onChange={onFileUpload}
            style={{ display: 'none' }}
            id="file-upload-input"
            disabled={loading}
          />
          <label 
            htmlFor="file-upload-input" 
            className={`references-upload-button ${loading ? 'disabled' : ''}`}
            style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            Upload image
          </label>
        </div>
        <button
          className="references-upload-button references-phone-upload-button"
          onClick={onPhoneUploadClick}
          disabled={loading}
        >
          Upload from Phone
        </button>
        <button
          className="references-add-folder-button"
          onClick={onAddFolderClick}
        >
          + Add folder
        </button>
        <div className="references-tags-dropdown" ref={dropdownRef}>
          <button
            className={`references-tags-button ${selectedTags.length > 0 ? 'has-filters' : ''}`}
            onClick={toggleDropdown}
            aria-expanded={dropdownOpen}
          >
            Tags
          </button>
          {dropdownOpen && (
            <div className="references-tags-menu">
              {!creating ? (
                <button
                  className="references-tags-button references-tags-menu-action"
                  onClick={startCreate}
                >
                  Create and manage tags
                </button>
              ) : (
                <div className="references-tags-create">
                  <input
                    ref={inputRef}
                    className="references-tags-input"
                    placeholder="New tag name"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitCreate();
                      if (e.key === 'Escape') { setCreating(false); setNewTag(''); }
                    }}
                  />
                  <button className="references-tags-save" onClick={submitCreate}>Add</button>
                </div>
              )}
              <div className="references-tags-separator" />
              <div className="references-tags-filterbar">
                <div className="references-tags-toprow">
                  <span className="references-tags-filter-label">{creating ? 'Created tags' : 'Filter by tags'}</span>
                  {!creating && selectedTags.length > 0 && (
                    <button className="references-tags-clear" onClick={onClearTags}>Clear</button>
                  )}
                </div>
                {!creating && (
                  <div className="references-tags-mode-tabs">
                    <button
                      className={`references-tags-mode-tab ${filterMode === 'any' ? 'active' : ''}`}
                      disabled={selectedTags.length < 2}
                      onClick={() => onChangeFilterMode('any')}
                    >At least one</button>
                    <button
                      className={`references-tags-mode-tab ${filterMode === 'all' ? 'active' : ''}`}
                      disabled={selectedTags.length < 2}
                      onClick={() => onChangeFilterMode('all')}
                    >All match</button>
                  </div>
                )}
              </div>
              {tags.length === 0 ? (
                <div className="references-tags-empty">No tags yet</div>
              ) : (
                [...tags].sort((a, b) => {
                  const ca = tagCounts[a.toLowerCase()] || 0;
                  const cb = tagCounts[b.toLowerCase()] || 0;
                  if ((ca === 0) !== (cb === 0)) return ca === 0 ? 1 : -1; // zeros last
                  return a.localeCompare(b);
                }).map((t) => {
                  const count = tagCounts[t.toLowerCase()] || 0;
                  if (creating) {
                    return (
                      <div key={t} className="references-tags-menu-item">
                        <input
                          className="references-tags-rename-input"
                          defaultValue={t}
                          onFocus={(e) => e.currentTarget.select()}
                          onMouseDown={(e) => { e.stopPropagation(); }}
                          onClick={(e) => { e.stopPropagation(); }}
                          onPointerDown={(e) => { e.stopPropagation(); }}
                          onPointerUp={(e) => { e.stopPropagation(); }}
                          draggable={false}
                          onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              const newName = (e.currentTarget as HTMLInputElement).value.trim();
                              if (!newName || newName === t) return;
                              try {
                                await ReferencesService.renameTagEverywhere(t, newName);
                                if (onRenameTag) onRenameTag(t, newName);
                                const list = await ReferencesService.listCustomTags();
                                setTags(list);
                                const all = await ReferencesService.getReferences();
                                const counts: Record<string, number> = {};
                                all.forEach(ref => {
                                  const refTags = (ref as any).tags as string[] | undefined;
                                  if (refTags && refTags.length) {
                                    refTags.forEach(tt => { const k = tt.toLowerCase(); counts[k] = (counts[k] || 0) + 1; });
                                  }
                                });
                                setTagCounts(counts);
                              } catch (err) {
                                console.error('Failed to rename tag', err);
                              }
                            }
                          }}
                          onBlur={async (e) => {
                            const newName = e.currentTarget.value.trim();
                            if (!newName || newName === t) return;
                            try {
                              await ReferencesService.renameTagEverywhere(t, newName);
                              if (onRenameTag) onRenameTag(t, newName);
                              const list = await ReferencesService.listCustomTags();
                              setTags(list);
                              const all = await ReferencesService.getReferences();
                              const counts: Record<string, number> = {};
                              all.forEach(ref => {
                                const refTags = (ref as any).tags as string[] | undefined;
                                if (refTags && refTags.length) {
                                  refTags.forEach(tt => { const k = tt.toLowerCase(); counts[k] = (counts[k] || 0) + 1; });
                                }
                              });
                              setTagCounts(counts);
                            } catch (err) {
                              console.error('Failed to rename tag (blur)', err);
                            }
                          }}
                        />
                        <span className="tag-count">({count})</span>
                        <button
                          className="references-tag-delete"
                          title="Delete tag"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, tag: t }); }}
                        >
                          delete
                        </button>
                      </div>
                    );
                  }
                  const checked = selectedTags.some(st => st.toLowerCase() === t.toLowerCase());
                  const disabled = count === 0;
                  return (
                    <label
                      key={t}
                      className={`references-tags-menu-item selectable ${disabled ? 'disabled' : ''}`}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => { if (!disabled) onToggleTag(t); }}
                      />
                      <span className="tag-name">{t}</span>
                      <span className="tag-count">({count})</span>
                    </label>
                  );
                })
              )}
            </div>
          )}
        </div>
        {confirmDelete.open && (
          <div className="references-modal-overlay" onMouseDown={() => setConfirmDelete({ open: false })}>
            <div className="references-modal-content" onMouseDown={(e) => e.stopPropagation()}>
              <h3 className="references-modal-title">Delete tag</h3>
              <p className="references-modal-description">This will remove "{confirmDelete.tag}" from your tag list and from all images. This action cannot be undone.</p>
              <div className="references-modal-buttons">
                <button className="references-modal-cancel-btn" onClick={() => setConfirmDelete({ open: false })}>Cancel</button>
                <button
                  className="references-modal-delete-btn"
                  onClick={async () => {
                    if (!confirmDelete.tag) return;
                    try {
                      await ReferencesService.deleteTagEverywhere(confirmDelete.tag);
                      // Refresh tags and counts
                      const list = await ReferencesService.listCustomTags();
                      setTags(list);
                      const all = await ReferencesService.getReferences();
                      const counts: Record<string, number> = {};
                      all.forEach(ref => {
                        const refTags = (ref as any).tags as string[] | undefined;
                        if (refTags && refTags.length) {
                          refTags.forEach(tt => { const k = tt.toLowerCase(); counts[k] = (counts[k] || 0) + 1; });
                        }
                      });
                      setTagCounts(counts);
                      // If removed tag was selected, unselect it
                      if (selectedTags.some(st => st.toLowerCase() === confirmDelete.tag!.toLowerCase())) {
                        onToggleTag(confirmDelete.tag);
                      }
                    } catch (e) {
                      console.error('Failed to delete tag', e);
                    } finally {
                      setConfirmDelete({ open: false });
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferencesHeader;
