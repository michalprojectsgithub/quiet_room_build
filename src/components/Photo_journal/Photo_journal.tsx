import React, { useCallback } from 'react';
import './Photo_journal.css';
import './Photo_journal_scan_modal.css';

// Hooks
import {
  useFullImageLoading,
  usePhoneUpload,
  useSortedImages,
  useImagePreloading,
  useKeyboardNavigation
} from './hooks';
import { usePhotoJournal } from './hooks/usePhotoJournal';
import { useImageViewer } from './hooks/useImageViewer';
import { useDeleteModal } from './hooks/useDeleteModal';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useUpload } from './hooks/useUpload';
import { useReferenceLinking } from './hooks/useReferenceLinking';
import { useScanWorkflow } from './hooks/useScanWorkflow';

// Utils
import { formatDate, formatFileSize } from './utils';

// Components
import GalleryItem from './components/GalleryItem';
import ImageViewer from './components/ImageViewer';
import DeleteModal from './components/DeleteModal';
import CompareModal from './components/CompareModal';
import ReferencePickerModal from './components/ReferencePickerModal';
import CropModal from './components/CropModal';
import PhoneUploadModal from './components/PhoneUploadModal';
import ScannerModal from './components/ScannerModal';
import LoadingState from './components/LoadingState';

// Main Photo_journal component
const Photo_journal: React.FC = () => {
  const {
    images,
    imageUrls,
    loading,
    error,
    uploadImage,
    deleteImage,
    setRotation,
    refetch
  } = usePhotoJournal();

  const {
    fullImageUrls,
    loadingImages,
    loadFullImageUrl
  } = useFullImageLoading();

  const {
    viewerOpen,
    currentIndex,
    openViewer,
    closeViewer,
    nextImage,
    prevImage
  } = useImageViewer();

  const {
    showDeleteModal,
    imageToDelete,
    openDeleteModal,
    closeDeleteModal
  } = useDeleteModal();

  const {
    uploading,
    uploadError,
    handleUpload
  } = useUpload(uploadImage);

  // Phone upload hook
  const {
    phoneUploadOpen,
    setPhoneUploadOpen,
    qrCodeDataUrl,
    qrStatus,
    phoneUploadEnabled,
    phoneUploadLink,
    phoneUploadBase,
    phoneTokenError,
    phoneUploadStatusError,
    phoneUploadInfoError,
    togglePhoneUpload,
    loadPhoneToken
  } = usePhoneUpload();

  // Sort images
  const {
    sortOrder,
    setSortOrder,
    sortedImages
  } = useSortedImages(images);

  const {
    showReferencePicker,
    referenceImages,
    referenceThumbUrls,
    loadingReferences,
    openReferencePicker,
    closeReferencePicker,
    handleReferenceLinked,
    linkedRefThumbUrl,
    currentLinked,
    handleUnlinkReference,
    previewHidden,
    previewPos,
    dragging,
    handlePreviewMouseDown,
    handleHidePreview,
    handleShowPreview,
    compareOpen,
    compareRefUrl,
    openCompare,
    setCompareOpen,
  } = useReferenceLinking({ sortedImages, currentIndex, viewerOpen });

  const {
    showScanModal,
    scanners,
    selectedScanner,
    setSelectedScanner,
    scannersLoading,
    scannerError,
    scanningDevice,
    scanPageSize,
    setScanPageSize,
    openScanModal,
    closeScanModal,
    handleScanWithDevice,
    loadScanners,
    pendingScan,
    cropModalOpen,
    cropImageUrl,
    cropNaturalSize,
    setCropNaturalSize,
    cropRect,
    setCropRect,
    isSelecting,
    setIsSelecting,
    selectStart,
    setSelectStart,
    onCropConfirm,
    onCropCancel,
  } = useScanWorkflow({ handleUpload, refetch });

  // Handle file selection
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleUpload([file]);
    }
    // Reset input value
    event.target.value = '';
  }, [handleUpload]);

  // Handle drag and drop
  const {
    isDragOver,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop
  } = useDragAndDrop(handleUpload);

  // Handle delete confirmation
  const handleDeleteImage = useCallback(async () => {
    if (!imageToDelete) return;
    
    try {
      await deleteImage(imageToDelete.id);
      closeDeleteModal();
    } catch (err) {
      // Error is already handled in the hook
    }
  }, [imageToDelete, deleteImage, closeDeleteModal]);

  // Image preloading for viewer
  useImagePreloading({
    viewerOpen,
    currentIndex,
    sortedImages,
    loadFullImageUrl
  });

  // Keyboard navigation for image viewer
  useKeyboardNavigation({
    viewerOpen,
    totalImages: sortedImages.length,
    nextImage,
    prevImage,
    closeViewer
  });

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div 
      className={`gallery-container ${isDragOver ? 'drag-active' : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="drag-drop-message">
          Drop images here
        </div>
      )}
      
      <div className="gallery-header">
        <h2>Artwork Journal</h2>
        <p>Upload and organize your drawing inspiration images</p>
      </div>

      {/* Controls Row - Sort and Upload */}
      <div className="controls-row">
        {/* Sort Controls */}
        <div className="sort-section">
          <label className="sort-label">Sort by:</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="sort-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        {/* Upload / Scan Section */}
        <div className="upload-section">
          <div className="upload-area">
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden-input"
            />
            <label htmlFor="image-upload" className={`upload-button ${uploading ? 'disabled' : ''}`}>
              {uploading ? 'Uploading...' : 'Upload Image'}
            </label>
          </div>
          <button
            className={`upload-button ${scanningDevice ? 'disabled' : ''}`}
            onClick={openScanModal}
            disabled={scanningDevice}
            title="Scan from connected scanner (Windows only)"
          >
            {scanningDevice ? 'Scanning…' : 'Scan Artwork'}
          </button>
          <button
            className="upload-button"
            onClick={() => setPhoneUploadOpen(true)}
            disabled={uploading}
          >
            Upload from Phone
          </button>
        </div>
      </div>

      {/* Error Display */}
      {(error || uploadError) && (
        <div className="error-message">
          {error || uploadError}
        </div>
      )}

      {/* Artwork Journal Grid */}
      <div className="gallery-content">
        {images.length === 0 ? (
          <div className="empty-gallery">
            <p>No images in your artwork journal yet.</p>
            <p>Upload your first image to get started!</p>
          </div>
        ) : (
          <div className="gallery-grid">
            {sortedImages.map((image, index) => (
              <GalleryItem
                key={image.id}
                image={image}
                imageUrl={imageUrls.get(image.id) || ''}
                index={index}
                onView={openViewer}
                onDelete={openDeleteModal}
                formatDate={formatDate}
                formatFileSize={formatFileSize}
              />
            ))}
          </div>
        )}
      </div>

      {/* Image Viewer Modal */}
      {viewerOpen && sortedImages.length > 0 && (
        <ImageViewer
          image={sortedImages[currentIndex]}
          imageUrl={fullImageUrls.get(sortedImages[currentIndex].id) || ''}
          isLoading={loadingImages.has(sortedImages[currentIndex].id)}
          currentIndex={currentIndex}
          totalImages={sortedImages.length}
          onClose={closeViewer}
          onNext={() => nextImage(sortedImages.length)}
          onPrev={() => prevImage(sortedImages.length)}
          onLinkReference={openReferencePicker}
          linkedReferenceThumbUrl={linkedRefThumbUrl}
          isLinked={currentLinked}
          previewPos={previewPos}
          dragging={dragging}
          onPreviewMouseDown={handlePreviewMouseDown}
          previewHidden={previewHidden}
          onHidePreview={handleHidePreview}
          onShowPreview={handleShowPreview}
          onUnlinkReference={handleUnlinkReference}
          onCompare={openCompare}
          rotation={sortedImages[currentIndex].rotation || 0}
          onRotate={async (rot) => {
            const img = sortedImages[currentIndex];
            if (!img) return;
            try {
              await setRotation(img.id, rot);
            } catch {
              // ignore UI failure
            }
          }}
        />
      )}

      {/* Compare Modal */}
      {compareOpen && (
        <CompareModal
          photoUrl={fullImageUrls.get(sortedImages[currentIndex].id) || ''}
          referenceUrl={compareRefUrl}
          onClose={() => setCompareOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && imageToDelete && (
        <DeleteModal
          image={imageToDelete}
          onConfirm={handleDeleteImage}
          onCancel={closeDeleteModal}
        />
      )}

      {/* Upload from Phone Modal */}
      {phoneUploadOpen && (
        <PhoneUploadModal
          onClose={() => setPhoneUploadOpen(false)}
          qrCodeDataUrl={qrCodeDataUrl}
          qrStatus={qrStatus}
          phoneUploadEnabled={phoneUploadEnabled}
          phoneUploadLink={phoneUploadLink}
          phoneUploadBase={phoneUploadBase}
          phoneTokenError={phoneTokenError}
          phoneUploadStatusError={phoneUploadStatusError}
          phoneUploadInfoError={phoneUploadInfoError}
          onTogglePhoneUpload={togglePhoneUpload}
          onLoadPhoneToken={loadPhoneToken}
        />
      )}

      {/* Reference Picker Modal */}
      {showReferencePicker && (
        <ReferencePickerModal
          isOpen={showReferencePicker}
          onClose={closeReferencePicker}
          references={referenceImages}
          thumbUrls={referenceThumbUrls}
          loading={loadingReferences}
          photoId={viewerOpen && sortedImages[currentIndex] ? sortedImages[currentIndex].id : undefined}
          onLinked={handleReferenceLinked}
        />
      )}

      {/* Scanner Selection Modal */}
      {showScanModal && (
        <ScannerModal
          onClose={closeScanModal}
          scanners={scanners}
          selectedScanner={selectedScanner}
          onSelectScanner={setSelectedScanner}
          scannersLoading={scannersLoading}
          scannerError={scannerError}
          scanningDevice={scanningDevice}
          scanPageSize={scanPageSize}
          onSetScanPageSize={setScanPageSize}
          onRefresh={loadScanners}
          onScan={handleScanWithDevice}
        />
      )}

      {/* Crop Modal */}
      {cropModalOpen && pendingScan && (
        <CropModal
          imageUrl={cropImageUrl}
          onCancel={onCropCancel}
          onConfirm={onCropConfirm}
          cropRect={cropRect}
          setCropRect={setCropRect}
          isSelecting={isSelecting}
          setIsSelecting={setIsSelecting}
          selectStart={selectStart}
          setSelectStart={setSelectStart}
          setCropNaturalSize={setCropNaturalSize}
          cropNaturalSize={cropNaturalSize}
        />
      )}
    </div>
  );
};

export default Photo_journal;
