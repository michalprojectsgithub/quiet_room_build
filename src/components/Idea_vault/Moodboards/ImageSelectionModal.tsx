import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import './ImageSelectionModal.css';
import { ReferencesService } from '../../../services/referencesService';
import { PhotoJournalService } from '../../../services/photoJournalService';

interface ImageSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (imageUrl: string, imageName: string, isUploadedToMoodboard?: boolean, uploadedImageData?: any) => void;
  API_BASE: string;
  moodboardId: string; // Add moodboardId prop
}

interface ReferenceImage {
  id: string;
  name?: string;
  filename: string;
  originalName: string;
  original_name?: string;
  url: string;
  category?: string;
  createdAt?: number;
  created_at?: number;
  location?: string;
  folder_id?: string;
}

interface PhotoJournalImage {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  uploadDate: string;
  size: number;
  mimetype: string;
  prompt?: string;
}

interface Folder {
  id: string;
  name: string;
  created_at: number;
  color?: string;
  physicalPath?: string;
}

const ImageSelectionModal: React.FC<ImageSelectionModalProps> = ({
  isOpen,
  onClose,
  onImageSelect,
  API_BASE,
  moodboardId
}) => {
  const [activeTab, setActiveTab] = useState<'references' | 'photo-journal' | 'upload'>('references');
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [referenceUrls, setReferenceUrls] = useState<Map<string, string>>(new Map());
  const [photoJournalImages, setPhotoJournalImages] = useState<PhotoJournalImage[]>([]);
  const [photoJournalUrls, setPhotoJournalUrls] = useState<Map<string, string>>(new Map());
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeFolderName, setActiveFolderName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Debug selectedFile state changes
  useEffect(() => {
    console.log('selectedFile state changed:', selectedFile);
  }, [selectedFile]);

  // Load reference images and folders
  useEffect(() => {
    if (isOpen && activeTab === 'references') {
      if (activeFolderId) {
        loadFolderImages();
      } else {
        loadReferenceImages();
        loadFolders();
      }
    }
  }, [isOpen, activeTab, activeFolderId, API_BASE]);

  // Load photo journal images
  useEffect(() => {
    if (isOpen && activeTab === 'photo-journal') {
      loadPhotoJournalImages();
    }
  }, [isOpen, activeTab]);

  const loadReferenceImages = async () => {
    setLoading(true);
    try {
      const data = await ReferencesService.getReferences();
      // Filter to only show main references (not folder images)
      const mainReferences = data
        .filter((ref: any) => ref.location === 'main' || !ref.location)
        .map((ref: any) => ({
          ...ref,
          originalName: ref.original_name || ref.originalName || ref.filename
        }));
      setReferenceImages(mainReferences);
      
      // Load image URLs asynchronously
      const urlPromises = mainReferences.map(async (reference) => {
        try {
          // Use thumbnail for faster loading
          const url = await ReferencesService.getReferenceThumbnailUrl(reference);
          return { id: reference.id, url };
        } catch (err) {
          console.error(`Failed to load thumbnail for ${reference.id}:`, err);
          return { id: reference.id, url: '' };
        }
      });
      
      const urlResults = await Promise.all(urlPromises);
      const urlMap = new Map(urlResults.map(result => [result.id, result.url]));
      setReferenceUrls(urlMap);
    } catch (error) {
      console.error('Error loading reference images:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const foldersData = await ReferencesService.getFolders();
      setFolders(foldersData);
    } catch (error) {
      console.error('Error loading folders:', error);
      setFolders([]);
    }
  };

  const loadFolderImages = async () => {
    if (!activeFolderId) return;
    
    setLoading(true);
    try {
      // Get all references and filter by folder_id or location
      const allRefs = await ReferencesService.getReferences();
      const folderRefs = allRefs
        .filter((ref: any) => 
          ref.folder_id === activeFolderId || ref.location?.includes(`folder/${activeFolderId}`)
        )
        .map((ref: any) => ({
          ...ref,
          originalName: ref.original_name || ref.originalName || ref.filename
        }));
      setReferenceImages(folderRefs);
      
      // Load thumbnail URLs for folder images
      const urlPromises = folderRefs.map(async (reference) => {
        try {
          const url = await ReferencesService.getReferenceThumbnailUrl(reference);
          return { id: reference.id, url };
        } catch (err) {
          console.error(`Failed to load thumbnail for ${reference.id}:`, err);
          return { id: reference.id, url: '' };
        }
      });
      
      const urlResults = await Promise.all(urlPromises);
      const urlMap = new Map(urlResults.map(result => [result.id, result.url]));
      setReferenceUrls(urlMap);
    } catch (error) {
      console.error('Error loading folder images:', error);
      setReferenceImages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotoJournalImages = async () => {
    setLoading(true);
    try {
      const data = await PhotoJournalService.getImages();
      setPhotoJournalImages(data);
      
      // Load image URLs asynchronously
      const urlPromises = data.map(async (image) => {
        try {
          // Use thumbnail for faster loading
          const url = await PhotoJournalService.getThumbnailUrl(image);
          return { id: image.id, url };
        } catch (err) {
          console.error(`Failed to load thumbnail for ${image.id}:`, err);
          return { id: image.id, url: '' };
        }
      });
      
      const urlResults = await Promise.all(urlPromises);
      const urlMap = new Map(urlResults.map(result => [result.id, result.url]));
      setPhotoJournalUrls(urlMap);
    } catch (error) {
      console.error('Error loading photo journal images:', error);
    } finally {
      setLoading(false);
    }
  };

  const openFolder = (folderId: string, folderName: string) => {
    setActiveFolderId(folderId);
    setActiveFolderName(folderName);
  };

  const closeFolder = () => {
    setActiveFolderId(null);
    setActiveFolderName('');
    setReferenceImages([]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('File selected:', file);
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      console.log('File set in state:', file.name);
    } else {
      console.log('Invalid file type or no file selected');
    }
  };

  const handleUpload = async () => {
    console.log('Upload button clicked!', { selectedFile, moodboardId });
    
    if (!selectedFile) {
      console.log('No file selected');
      return;
    }

    if (!moodboardId) {
      console.error('No moodboard ID provided');
      alert('Error: No moodboard ID available');
      return;
    }

    console.log('Starting upload...');
    setUploading(true);
    try {
      // Convert file to array buffer for Tauri
      const arrayBuffer = await selectedFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      console.log('File converted to Uint8Array, length:', uint8Array.length);
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = selectedFile.name.split('.').pop() || 'jpg';
      const filename = `moodboard_${moodboardId}_${timestamp}.${fileExtension}`;
      
      // Convert Uint8Array to regular array for Tauri (more efficient than base64)
      const dataArray = Array.from(uint8Array);
      console.log('Data array length:', dataArray.length);
      
      // Use Tauri invoke to upload to moodboard directory
      const result = await invoke('upload_moodboard_image', {
        moodboardId: moodboardId,
        filename: filename,
        originalName: selectedFile.name,
        data: dataArray
      });
      
      console.log('Upload result:', result);
      
      // The result is already a proper MoodboardItem with the correct relative URL
      const moodboardResult = {
        ...(result as any)
        // Don't override the URL - use the one returned by the Tauri command
      };
      
      // Signal that this was an upload to moodboard
      onImageSelect(moodboardResult.url, moodboardResult.filename, true, moodboardResult);
      onClose();
      
    } catch (error) {
      console.error('Error uploading image to moodboard:', error);
      alert(`Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelect = (imageUrl: string, imageName: string) => {
    // For existing image selections (references/photo journal), signal it's not an upload
    onImageSelect(imageUrl, imageName, false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="image-selection-modal-overlay">
      <div className="image-selection-modal-container">
        <div className="image-selection-modal-header">
          <h2>Add Image to Moodboard</h2>
          <button className="image-selection-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="image-selection-modal-tabs">
          <button
            className={`image-selection-modal-tab ${activeTab === 'references' ? 'active' : ''}`}
            onClick={() => setActiveTab('references')}
          >
            References
          </button>
          <button
            className={`image-selection-modal-tab ${activeTab === 'photo-journal' ? 'active' : ''}`}
            onClick={() => setActiveTab('photo-journal')}
          >
            Artwork Journal
          </button>
          <button
            className={`image-selection-modal-tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload from Device
          </button>
        </div>

        <div className="image-selection-modal-content">
          {activeTab === 'references' && (
            <div className="image-selection-tab-content">
              {/* Folder navigation header */}
              {activeFolderId && (
                <div className="image-selection-folder-header">
                  <button
                    className="image-selection-back-button"
                    onClick={closeFolder}
                  >
                    ← Back to Folders
                  </button>
                  <h3 className="image-selection-folder-title">{activeFolderName}</h3>
                </div>
              )}

              {loading ? (
                <div className="image-selection-loading">
                  {activeFolderId ? 'Loading folder images...' : 'Loading reference images...'}
                </div>
              ) : activeFolderId ? (
                // Show folder images
                referenceImages.length > 0 ? (
                  <div className="image-selection-grid">
                    {referenceImages.map((image) => (
                      <div
                        key={image.id}
                        className="image-selection-item"
                        onClick={() => handleImageSelect(image.url, image.name || image.originalName || image.original_name || image.filename)}
                      >
                        <img 
                          src={referenceUrls.get(image.id) || ''} 
                          alt={image.name || image.originalName || image.original_name || image.filename} 
                          loading="lazy"
                        />
                        <div className="image-selection-item-name">{image.name || image.originalName || image.original_name || image.filename}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="image-selection-empty">No images in this folder</div>
                )
              ) : (
                // Show main references and folders
                <div>
                  {/* Folders section */}
                  {folders.length > 0 && (
                    <div className="image-selection-folders-section">
                      <h3 className="image-selection-folders-title">Folders</h3>
                      <div className="image-selection-folders-grid">
                        {folders.map((folder) => (
                          <div
                            key={folder.id}
                            className="image-selection-folder-item"
                            onClick={() => openFolder(folder.id, folder.name)}
                            style={folder.color ? { borderColor: folder.color } : undefined}
                          >
                            <div className="image-selection-folder-icon">
                              <svg viewBox="0 0 24 24" width="32" height="32" fill={folder.color || 'currentColor'} stroke="none">
                                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                              </svg>
                            </div>
                            <div className="image-selection-folder-name">{folder.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Main references section */}
                  {referenceImages.length > 0 && (
                    <div className="image-selection-references-section">
                      <h3 className="image-selection-references-title">Main References</h3>
                      <div className="image-selection-grid">
                        {referenceImages.map((image) => (
                          <div
                            key={image.id}
                            className="image-selection-item"
                            onClick={() => handleImageSelect(image.url, image.name || image.originalName || image.original_name || image.filename)}
                          >
                            <img src={referenceUrls.get(image.id) || ''} alt={image.name || image.originalName || image.original_name || image.filename} loading="lazy" />
                            <div className="image-selection-item-name">{image.name || image.originalName || image.original_name || image.filename}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {folders.length === 0 && referenceImages.length === 0 && (
                    <div className="image-selection-empty">No reference images or folders found</div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'photo-journal' && (
            <div className="image-selection-tab-content">
              {loading ? (
                <div className="image-selection-loading">Loading artwork journal images...</div>
              ) : photoJournalImages.length > 0 ? (
                <div className="image-selection-grid">
                  {photoJournalImages.map((image) => (
                    <div
                      key={image.id}
                      className="image-selection-item"
                      onClick={() => handleImageSelect(image.url, image.originalName)}
                    >
                      <img src={photoJournalUrls.get(image.id) || ''} alt={image.originalName} loading="lazy" />
                      <div className="image-selection-item-name">{image.originalName}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="image-selection-empty">No artwork journal images found</div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="image-selection-tab-content">
              <div className="image-upload-section">
                <div className="image-upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    id="image-upload-input"
                    className="image-upload-input"
                  />
                  <label htmlFor="image-upload-input" className="image-upload-label">
                    {selectedFile ? (
                      <div className="image-upload-preview">
                        <img src={URL.createObjectURL(selectedFile)} alt="Preview" />
                        <div className="image-upload-filename">{selectedFile.name}</div>
                      </div>
                    ) : (
                      <div className="image-upload-placeholder">
                        <div className="image-upload-icon">Upload</div>
                        <div className="image-upload-text">Click to select an image</div>
                        <div className="image-upload-hint">or drag and drop</div>
                      </div>
                    )}
                  </label>
                </div>
                {selectedFile && (
                  <button
                    className="image-upload-button"
                    onClick={handleUpload}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </button>
                )}
                {!selectedFile && (
                  <div style={{ color: 'red', fontSize: '12px', marginTop: '10px' }}>
                    No file selected
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageSelectionModal;
