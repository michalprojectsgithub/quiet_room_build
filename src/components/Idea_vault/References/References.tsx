import React, { useCallback, useEffect, useState } from 'react';
import { ReferencesService } from '../../../services/referencesService';
import './References.css';

// Types
import type { ReferencesProps } from './types';

// Hooks
import {
  useReferences,
  useReferenceViewer,
  useDeleteModal,
  useFolderModal,
  useFolderDeleteModal,
  useCustomDragAndDrop,
  useTauriFileDrop,
  useClipboardPaste,
  useFileUpload,
  useFullImageLoading,
  usePhoneUpload,
  useViewerOverrides,
  useTagEventListeners,
  useViewerImagePreloading
} from './hooks';
import { useTagFiltering } from './hooks/useTagFiltering';
import { useGlobalMouseUpReset } from './hooks/useGlobalMouseUpReset';
import { useViewerKeyboardShortcuts } from './hooks/useViewerKeyboardShortcuts';

// Components
import {
  DeleteModal,
  FolderModal,
  FolderDeleteModal,
  ReferenceViewer,
  DragDropOverlay,
  ReferencesHeader,
  ReferencesGrid,
  PhoneUploadModal,
  LoadingState,
  ErrorState
} from './components';

// Main References component
const References: React.FC<ReferencesProps> = ({ ideaVaultTab, API_BASE }) => {
  const {
    references,
    referenceUrls,
    folders,
    loading,
    error,
    activeFolderId,
    folderReferences,
    uploadingImages,
    uploadReference,
    deleteReference,
    moveReference,
    createFolder,
    deleteFolder,
    openFolder,
    closeFolder,
    patchReference
  } = useReferences(API_BASE, ideaVaultTab);

  const {
    fullImageUrls,
    loadingFullImages,
    loadFullImageUrl
  } = useFullImageLoading({ folders });

  const {
    viewerOpen,
    currentIndex,
    openViewer,
    closeViewer,
    nextReference,
    prevReference
  } = useReferenceViewer();

  const {
    showDeleteModal,
    referenceToDelete,
    openDeleteModal,
    closeDeleteModal
  } = useDeleteModal();

  const {
    showFolderModal,
    folderName,
    setFolderName,
    openFolderModal,
    closeFolderModal
  } = useFolderModal();

  const {
    showFolderDeleteModal,
    folderToDelete,
    openFolderDeleteModal,
    closeFolderDeleteModal
  } = useFolderDeleteModal();

  const {
    draggedReference,
    dragPosition,
    handleCustomDragStart,
    handleCustomDragOver,
    handleCustomDragLeave,
    handleCustomDrop,
    handleCustomDragEnd
  } = useCustomDragAndDrop({
    moveReference,
    activeFolderId
  });

  const { isFileDragOver } = useTauriFileDrop({
    uploadReference,
    activeFolderId
  });

  useClipboardPaste({
    uploadReference,
    activeFolderId,
    ideaVaultTab
  });

  const { handleFileUpload } = useFileUpload({
    uploadReference,
    activeFolderId
  });

  // Phone upload hook
  const {
    phoneUploadOpen,
    setPhoneUploadOpen,
    qrCodeDataUrl,
    qrStatus,
    phoneUploadEnabled,
    primaryPhoneUrl,
    phoneUploadBase,
    phoneTokenError,
    phoneUploadStatusError,
    phoneUploadInfoError,
    togglePhoneUpload,
    loadPhoneToken
  } = usePhoneUpload();

  // Tags modal placeholder state (UI to be implemented next)
  const [, setShowTags] = useState(false);
  const openTags = useCallback(() => setShowTags(true), []);

  // Tag filtering (extracted)
  const {
    selectedTags,
    setSelectedTags,
    filterMode,
    setFilterMode,
    allRefsForFilter,
    setAllRefsForFilter,
    setTagsRefreshTick,
    toggleTag,
    clearTags,
    filteredReferences,
    handleTagChanged
  } = useTagFiltering({
    references,
    folderReferences,
    activeFolderId,
    patchReference
  });

  // Viewer overrides hook
  const {
    setViewerNoteOverride,
    setViewerTagsOverride,
    setViewerRotationOverride,
    setViewerCropOverride,
    applyOverridesToReference
  } = useViewerOverrides({
    viewerOpen,
    currentIndex,
    references,
    folderReferences,
    filteredReferences,
    selectedTagsLength: selectedTags.length,
    activeFolderId,
    allRefsForFilter
  });

  // Ensure we have all references available for cross-folder filtering
  useEffect(() => {
    const loadAll = async () => {
      try {
        const all = await ReferencesService.getReferences();
        setAllRefsForFilter(all as any[]);
      } catch (e) {
        console.error('Failed to load all references for filtering', e);
      }
    };
    if (selectedTags.length > 0 && !allRefsForFilter) {
      loadAll();
    }
  }, [selectedTags.length, allRefsForFilter, setAllRefsForFilter]);

  // Global mouseup reset (extracted)
  useGlobalMouseUpReset({ draggedReference, handleCustomDragEnd });

  // Tag event listeners (extracted)
  useTagEventListeners({
    patchReference,
    setAllRefsForFilter
  });

  // Viewer image preloading (extracted)
  useViewerImagePreloading({
    viewerOpen,
    currentIndex,
    activeFolderId,
    references,
    folderReferences,
    filteredReferences,
    selectedTagsLength: selectedTags.length,
    folders,
    fullImageUrls,
    loadFullImageUrl
  });

  // Handle keyboard shortcuts (extracted)
  useViewerKeyboardShortcuts({
    viewerOpen,
    ideaVaultTab,
    currentListLength: (selectedTags.length > 0 ? filteredReferences : (activeFolderId ? folderReferences : references)).length,
    closeViewer,
    prevReference,
    nextReference
  });

  // Handle reference deletion
  const handleDeleteReference = useCallback(async () => {
    if (!referenceToDelete) return;
    
    try {
      await deleteReference(referenceToDelete, activeFolderId || undefined);
      closeDeleteModal();
      // If the viewer is currently open, close it to avoid showing a deleted image.
      if (viewerOpen) {
        closeViewer();
      }
    } catch (err) {
      // Error is already handled in the hook
    }
  }, [referenceToDelete, deleteReference, closeDeleteModal, activeFolderId, viewerOpen, closeViewer]);

  // Handle folder creation
  const handleCreateFolder = useCallback(async () => {
    if (!folderName.trim()) return;
    
    try {
      await createFolder(folderName.trim());
      closeFolderModal();
    } catch (err) {
      // Error is already handled in the hook
    }
  }, [folderName, createFolder, closeFolderModal]);

  // Handle folder deletion
  const handleDeleteFolder = useCallback(async () => {
    if (!folderToDelete) return;
    
    try {
      await deleteFolder(folderToDelete.id);
      closeFolderDeleteModal();
    } catch (err) {
      // Error is already handled in the hook
    }
  }, [folderToDelete, deleteFolder, closeFolderDeleteModal]);

  // Handle reference click
  const handleReferenceClick = useCallback((reference: any, index: number) => {
    // Seed tag override with freshest tags BEFORE opening to avoid initial blink
    const byId = (arr: any[]) => Array.isArray(arr) ? arr.find(r => r.id === reference.id) : undefined;
    const freshest = byId(references as any) || byId(folderReferences as any) || byId(allRefsForFilter as any) || reference;
    const freshTags = Array.isArray(freshest?.tags) ? [...freshest.tags] : [];
    setViewerTagsOverride({ id: reference.id, tags: freshTags });
    openViewer(index);
    loadFullImageUrl(reference);
  }, [openViewer, loadFullImageUrl, references, folderReferences, allRefsForFilter, setViewerTagsOverride]);

  // Handle folder click
  const handleFolderClick = useCallback((folder: any) => {
    openFolder(folder.id);
  }, [openFolder]);

  // Handle back button click
  const handleBackClick = useCallback(() => {
    closeFolder();
  }, [closeFolder]);

  // Handle add folder click
  const handleAddFolderClick = useCallback(() => {
    openFolderModal();
  }, [openFolderModal]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  // Build the list for the viewer
  const listForViewer = selectedTags.length > 0 ? filteredReferences : (activeFolderId ? folderReferences : references);
  const currentRef = listForViewer[currentIndex];
  const refForViewer = currentRef ? applyOverridesToReference(currentRef) : null;

  return (
    <>
      {/* References Tab */}
      {ideaVaultTab === 'references' && (
        <div className={`references-container ${isFileDragOver ? 'drag-active' : ''}`}>
          <ReferencesHeader
            activeFolderId={activeFolderId}
            folders={folders}
            references={references}
            folderReferences={folderReferences}
            uploadingImages={uploadingImages}
            onBackClick={handleBackClick}
            onAddFolderClick={handleAddFolderClick}
            onFileUpload={handleFileUpload}
            onPhoneUploadClick={() => setPhoneUploadOpen(true)}
            onCustomDragOver={handleCustomDragOver}
            onCustomDragLeave={handleCustomDragLeave}
            onCustomDrop={handleCustomDrop}
            onTagsClick={openTags}
            selectedTags={selectedTags}
            onToggleTag={toggleTag}
            onClearTags={clearTags}
            filterMode={filterMode}
            onChangeFilterMode={setFilterMode}
            onRenameTag={(oldName, newName) => {
              // If a selected tag was renamed, update the selection to the new name
              setSelectedTags(prev => prev.map(t => t.toLowerCase() === oldName.toLowerCase() ? newName : t));
              // Also update the cached list so filter works immediately
              setAllRefsForFilter(prev => {
                if (!prev) return prev;
                return prev.map(r => {
                  if (!Array.isArray((r as any).tags)) return r;
                  const updated = (r as any).tags.map((t: string) => t.toLowerCase() === oldName.toLowerCase() ? newName : t);
                  return { ...r, tags: updated };
                });
              });
            }}
            loading={loading}
          />
          
          <ReferencesGrid
            references={filteredReferences}
            folders={folders}
            referenceUrls={referenceUrls}
            uploadingImages={uploadingImages}
            activeFolderId={activeFolderId}
            draggedReference={draggedReference}
            onReferenceClick={handleReferenceClick}
            onReferenceDelete={(reference) => openDeleteModal(reference.id)}
            onReferenceDragStart={handleCustomDragStart}
            onFolderClick={handleFolderClick}
            onFolderDelete={openFolderDeleteModal}
            onFolderDragOver={handleCustomDragOver}
            onFolderDragLeave={handleCustomDragLeave}
            onFolderDrop={handleCustomDrop}
            API_BASE={API_BASE}
            isFiltering={selectedTags.length > 0}
            onItemTagChange={handleTagChanged}
          />

          <DragDropOverlay
            isFileDragOver={isFileDragOver}
            draggedReference={draggedReference}
            dragPosition={dragPosition}
            referenceUrls={referenceUrls}
          />
        </div>
      )}

      {/* Phone Upload Modal */}
      {phoneUploadOpen && (
        <PhoneUploadModal
          onClose={() => setPhoneUploadOpen(false)}
          qrCodeDataUrl={qrCodeDataUrl}
          qrStatus={qrStatus}
          phoneUploadEnabled={phoneUploadEnabled}
          primaryPhoneUrl={primaryPhoneUrl}
          phoneUploadBase={phoneUploadBase}
          phoneTokenError={phoneTokenError}
          phoneUploadStatusError={phoneUploadStatusError}
          phoneUploadInfoError={phoneUploadInfoError}
          onTogglePhoneUpload={togglePhoneUpload}
          onLoadPhoneToken={loadPhoneToken}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <DeleteModal
          onConfirm={handleDeleteReference}
          onCancel={closeDeleteModal}
        />
      )}

      {/* Folder Modal */}
      {showFolderModal && (
        <FolderModal
          folderName={folderName}
          setFolderName={setFolderName}
          onCreate={handleCreateFolder}
          onCancel={closeFolderModal}
        />
      )}

      {/* Folder Delete Modal */}
      {showFolderDeleteModal && folderToDelete && (
        <FolderDeleteModal
          folder={folderToDelete}
          onConfirm={handleDeleteFolder}
          onCancel={closeFolderDeleteModal}
        />
      )}

      {/* Reference Viewer */}
      {viewerOpen && refForViewer && (
        <ReferenceViewer
          reference={refForViewer as any}
          imageUrl={fullImageUrls.get(refForViewer.id) || ''}
          isLoading={loadingFullImages.has(refForViewer.id) || !fullImageUrls.get(refForViewer.id)}
          currentIndex={currentIndex}
          totalReferences={listForViewer.length}
          API_BASE={API_BASE}
          onDelete={(id) => openDeleteModal(id)}
          onClose={async () => {
            closeViewer();
            try {
              const all = await ReferencesService.getReferences();
              setAllRefsForFilter(all as any[]);
              // Patch only tag fields to avoid resetting other local UI data
              (all as any[]).forEach((r: any) => {
                patchReference(r.id, { tags: Array.isArray(r.tags) ? r.tags : [] } as any);
              });
            } catch {
              // Ignore errors
            }
          }}
          onNext={() => nextReference(listForViewer.length)}
          onPrev={() => prevReference(listForViewer.length)}
          formatDate={(timestamp) => new Date(timestamp).toLocaleDateString()}
          folderId={activeFolderId || undefined}
          onNoteChange={(referenceId, note) => {
            setViewerNoteOverride({ id: referenceId, note: note || null });
            patchReference(referenceId, { image_note: note || null } as any);
          }}
          onSourceChange={(referenceId, source) => {
            patchReference(referenceId, { image_source: source || null } as any);
          }}
          onRotationChange={(referenceId, rotation) => {
            setViewerRotationOverride({ id: referenceId, rotation });
            patchReference(referenceId, { rotation } as any);
          }}
          onCropChange={async (referenceId, crop) => {
            const desired = crop || null;
            setViewerCropOverride({ id: referenceId, crop: desired });
            patchReference(referenceId, { crop: desired } as any);
            try {
              const updated = await ReferencesService.setCrop(referenceId, desired);
              const persisted = ((updated as any)?.crop ?? desired) || null;
              setViewerCropOverride({ id: referenceId, crop: persisted });
              patchReference(referenceId, { crop: persisted } as any);
            } catch {
              // best effort: keep optimistic state
            }
          }}
          onTagsChange={(referenceId, tags) => {
            const uniq = Array.from(new Map(tags.map(t => [t.toLowerCase(), t])).values());
            setViewerTagsOverride({ id: referenceId, tags: uniq });
            patchReference(referenceId, { tags: uniq } as any);
            setAllRefsForFilter(prev => {
              if (!prev) return prev;
              return prev.map(r => r.id === referenceId ? { ...r, tags: uniq } : r);
            });
            setTagsRefreshTick(t => t + 1);
            // Reconcile with disk in background
            (async () => {
              try {
                const all = await ReferencesService.getReferences();
                const updated = all.find(r => r.id === referenceId);
                if (updated) {
                  patchReference(referenceId, { tags: updated.tags || [] } as any);
                  setAllRefsForFilter(prev => {
                    if (!prev) return prev;
                    return prev.map(r => r.id === referenceId ? { ...r, tags: updated.tags || [] } : r);
                  });
                  if (viewerOpen && listForViewer[currentIndex]?.id === referenceId) {
                    setViewerTagsOverride({ id: referenceId, tags: updated.tags || [] });
                  }
                  setTagsRefreshTick(t => t + 1);
                }
              } catch {
                // Ignore errors
              }
            })();
          }}
          onToggleItemTag={async (ref, tag, op) => {
            await handleTagChanged(ref as any, tag, op);
          }}
        />
      )}
    </>
  );
};

export default References;
