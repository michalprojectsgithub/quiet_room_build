import React, { useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './Moodboard_editor.css';
import type { MoodboardEditorProps } from './types';
import { useMoodboardEditor } from './hooks/useMoodboardEditor';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import MoodboardItem from './MoodboardItem';
import ColorSwatchModal from './ColorSwatchModal';
import TextModal from './TextModal';
import ImageSelectionModal from './ImageSelectionModal';

// A4 landscape dimensions
const A4_WIDTH_MM = 297;
const A4_HEIGHT_MM = 210;
const PX_PER_MM = 3.7795275591; // 96 DPI
const A4_WIDTH_PX = Math.round(A4_WIDTH_MM * PX_PER_MM);   // ~1123px
const A4_HEIGHT_PX = Math.round(A4_HEIGHT_MM * PX_PER_MM); // ~794px

const MoodboardEditor: React.FC<MoodboardEditorProps> = ({
  moodboard,
  isOpen,
  onClose,
  API_BASE,
  onMoodboardUpdate
}) => {
  const {
    // State
    items,
    selectedItem,
    editingItem,
    editingContent,
    canvasRef,
    isEditingTitle,
    editingTitle,
    localMoodboard,
        showColorSwatchModal,
    selectedColor,
    showTextModal,
    newTextContent,
    showImageSelectionModal,
    
    // Event handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDeleteItem,
    handleEditItem,
    handleSaveEdit,
    handleEditChange,
    
    // Title editing handlers
    startEditingTitle,
    saveTitleEdit,
    cancelTitleEdit,
    handleTitleChange,
    
    // Color swatch handlers
    openColorSwatchModal,
    closeColorSwatchModal,
    handleColorChange,
    handleAddColorSwatch,
    
    // Sticky note handlers
    handleAddStickyNote,
    handleTextModalSubmit,
    handleTextModalClose,
    handleTextContentChange,
    
    // Image selection handlers
    openImageSelectionModal,
    closeImageSelectionModal,
    handleImageSelect,
    
    // Drag and drop handlers
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    isDragOver,

    // Clipboard
    handlePaste,
    
    // Save function
    saveMoodboard
  } = useMoodboardEditor({
    moodboard,
    API_BASE,
    onMoodboardUpdate
  });

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ id: string; url: string } | null>(null);

  const handleExportPdf = async () => {
    if (!canvasRef.current || !localMoodboard) return;

    setIsExportingPdf(true);
    const canvasEl = canvasRef.current;
    const prevBg = canvasEl.style.backgroundColor;
    // Force white background during capture
    canvasEl.style.backgroundColor = '#ffffff';

    try {
      // Persist any pending edits before exporting
      await saveMoodboard();

      const capturedCanvas = await html2canvas(canvasEl, {
        backgroundColor: '#ffffff',
        scale: 2,
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX
      });

      const imgData = capturedCanvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Place the captured canvas 1:1 onto the A4 page (no margins)
      pdf.addImage(
        imgData,
        'PNG',
        0,
        0,
        A4_WIDTH_MM,
        A4_HEIGHT_MM,
        undefined,
        'FAST'
      );

      const safeTitle = (localMoodboard.title || 'moodboard')
        .trim()
        .replace(/[^\w-]+/g, '_') || 'moodboard';
      pdf.save(`${safeTitle}.pdf`);
    } catch (error) {
      console.error('Failed to export moodboard PDF:', error);
    } finally {
      // Restore original background
      canvasEl.style.backgroundColor = prevBg;
      setIsExportingPdf(false);
    }
  };

  const handleOpenPreview = (itemId: string, displayUrl?: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || item.type !== 'image') return;
    const urlToUse = displayUrl || item.url || item.content || '';
    if (!urlToUse) return;
    setPreviewImage({ id: itemId, url: urlToUse });
  };

  const handleClosePreview = () => {
    setPreviewImage(null);
  };

  const handlePrint = async () => {
    if (!canvasRef.current || !localMoodboard) return;

    setIsPrinting(true);
    const canvasEl = canvasRef.current;
    const prevBg = canvasEl.style.backgroundColor;
    canvasEl.style.backgroundColor = '#ffffff';

    try {
      await saveMoodboard();

      const capturedCanvas = await html2canvas(canvasEl, {
        backgroundColor: '#ffffff',
        scale: 2,
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX
      });

      const dataUrl = capturedCanvas.toDataURL('image/png', 1);

      // Open minimal window and trigger system print dialog immediately
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Print</title>
              <style>
                @page { size: A4 landscape; margin: 0; }
                * { margin: 0; padding: 0; }
                body { display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                img { max-width: 100%; max-height: 100vh; }
              </style>
            </head>
            <body><img src="${dataUrl}" onload="window.print(); window.close();" /></body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Failed to print moodboard:', error);
    } finally {
      canvasEl.style.backgroundColor = prevBg;
      setIsPrinting(false);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    isOpen,
    selectedItem,
    editingItem,
    onDeleteItem: handleDeleteItem,
    onClearSelection: () => {}, // Will be handled by the hook
    onCloseModal: () => {}, // No modal to close
    onCloseEditing: () => {} // Will be handled by the hook
  });

  // Save moodboard when component unmounts and cleanup
  useEffect(() => {
    return () => {
      // Save any pending changes when component unmounts
      if (isOpen && localMoodboard) {
        saveMoodboard();
      }
    };
  }, [isOpen, localMoodboard, saveMoodboard]);

  if (!isOpen || !localMoodboard) return null;

  return (
    <div className="moodboard-editor-overlay">
      <div className="moodboard-editor-container">
        {/* Header */}
        <div className="moodboard-editor-header">
          <div
            className="moodboard-editor-header-inner"
            style={{ width: `${A4_WIDTH_PX}px` }}
          >
            <div className="moodboard-editor-title-section">
              {isEditingTitle ? (
                <div className="moodboard-editor-title-edit">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        saveTitleEdit();
                      } else if (e.key === 'Escape') {
                        cancelTitleEdit();
                      }
                    }}
                    onBlur={saveTitleEdit}
                    className="moodboard-editor-title-input"
                    autoFocus
                  />
                </div>
              ) : (
                <h2 
                 className="moodboard-editor-title"
                 onClick={startEditingTitle}
                 title="Click to edit title"
               >
                 {localMoodboard.title}
               </h2>
              )}
            </div>
            <div className="moodboard-editor-controls">
              <button 
                className="moodboard-editor-button"
                onClick={openImageSelectionModal}
              >
                Add Image
              </button>
              <button 
                className="moodboard-editor-button"
                onClick={handleAddStickyNote}
              >
                Add Text
              </button>
              <button 
                className="moodboard-editor-button"
                onClick={openColorSwatchModal}
              >
                Add Color Swatch
              </button>
              <button
                className="moodboard-editor-button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                title="Export this moodboard as an A4 landscape PDF"
              >
                {isExportingPdf ? 'Exporting…' : 'Export PDF'}
              </button>
              <button
                className="moodboard-editor-button"
                onClick={handlePrint}
                disabled={isPrinting}
                title="Print this moodboard"
              >
                {isPrinting ? 'Printing…' : 'Print'}
              </button>
              <button 
                className="moodboard-editor-button"
                onClick={() => {
                  // Save any pending changes before closing
                  saveMoodboard();
                  onClose();
                }}
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="moodboard-editor-canvas-wrapper">
          <div 
            ref={canvasRef}
            className={`moodboard-editor-canvas ${isDragOver ? 'drag-over' : ''}`}
            style={{
              width: `${A4_WIDTH_PX}px`,
              height: `${A4_HEIGHT_PX}px`,
              aspectRatio: `${A4_WIDTH_MM} / ${A4_HEIGHT_MM}`
            }}
            onPaste={(e) => handlePaste(e)}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            title="Press Ctrl+V to paste images or drag & drop images here"
          >
            {items.map((item) => (
              <MoodboardItem
                key={item.id}
                item={item}
                isSelected={selectedItem === item.id}
                isEditing={editingItem === item.id}
                editingContent={editingContent}
                API_BASE={API_BASE}
                onMouseDown={handleMouseDown}
                onClick={() => {}} // disable click-to-preview; use preview button instead
                onDoubleClick={handleEditItem}
                onDelete={handleDeleteItem}
                onEditChange={handleEditChange}
                onEditSave={handleSaveEdit}
                onPreview={handleOpenPreview}
              />
            ))}
          </div>
        </div>

        {/* Color Swatch Modal */}
        <ColorSwatchModal
          isOpen={showColorSwatchModal}
          onClose={closeColorSwatchModal}
          selectedColor={selectedColor}
          onColorChange={handleColorChange}
          onAddColorSwatch={handleAddColorSwatch}
        />

        {/* Text Modal */}
        <TextModal
          isOpen={showTextModal}
          onClose={handleTextModalClose}
          onSubmit={handleTextModalSubmit}
          content={newTextContent}
          onContentChange={handleTextContentChange}
        />

        {/* Image Selection Modal */}
        <ImageSelectionModal
          isOpen={showImageSelectionModal}
          onClose={closeImageSelectionModal}
          onImageSelect={handleImageSelect}
          API_BASE={API_BASE}
          moodboardId={localMoodboard?.id || ''} // Pass the moodboard ID
        />

        {/* Fullscreen Preview Modal */}
        {previewImage && (
          <div className="moodboard-preview-overlay" onClick={handleClosePreview}>
            <div className="moodboard-preview-content" onClick={(e) => e.stopPropagation()}>
              <button className="moodboard-preview-close" onClick={handleClosePreview} aria-label="Close preview">
                ✕
              </button>
              <img src={previewImage.url} alt="" className="moodboard-preview-image" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodboardEditor;
