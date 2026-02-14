import { useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { ReferencesService } from '../../../../services/referencesService';
import TauriService from '../../../../services/tauriService';
import type { Reference, Folder } from '../types';

// Custom hook for references management
export const useReferences = (API_BASE: string, ideaVaultTab: string) => {
  const [references, setReferences] = useState<Reference[]>([]);
  const [referenceUrls, setReferenceUrls] = useState<Map<string, string>>(new Map());
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [folderReferences, setFolderReferences] = useState<Reference[]>([]);
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set());

  const fetchReferences = useCallback(async () => {
    // Prevent rapid successive calls (debounce)
    const now = Date.now();
    if (now - lastFetchTime < 1000) { // Minimum 1 second between calls
      return;
    }
    setLastFetchTime(now);
    
    // Only show loading on initial fetch, not on auto-refresh
    const isInitialFetch = references.length === 0 && folders.length === 0;
    if (isInitialFetch) {
      setLoading(true);
    } else {
      // Show subtle refresh indicator for auto-refresh
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 500);
    }
    setError(null);
    
    try {
      // Use Tauri service instead of HTTP API
      const [referencesData, foldersData] = await Promise.all([
        ReferencesService.getReferences(),
        ReferencesService.getFolders()
      ]);
      
      
      // Only update if data has actually changed to prevent unnecessary re-renders
      const referencesChanged = JSON.stringify(referencesData) !== JSON.stringify(references);
      const foldersChanged = JSON.stringify(foldersData) !== JSON.stringify(folders);
      
      if (referencesChanged) {
        // Filter out folder references from main references array
        const mainReferences = referencesData.filter(ref => 
          !ref.folder_id && (!ref.location || ref.location === 'main')
        );
        setReferences(mainReferences);
        
        // Load thumbnail URLs asynchronously using folders data (for all references)
        const urlPromises = referencesData.map(async (reference) => {
          try {
            // Use TauriService to get thumbnail data (much faster than full images)
            // Pass folders data to avoid multiple getFolders() calls
            const url = await TauriService.getReferenceThumbnailUrl(reference, foldersData);
            return { id: reference.id, url };
          } catch (err) {
            console.error(`Failed to load thumbnail URL for ${reference.id}:`, err);
            return { id: reference.id, url: '' };
          }
        });
        
        const urlResults = await Promise.all(urlPromises);
        const urlMap = new Map(urlResults.map(result => [result.id, result.url]));
        setReferenceUrls(urlMap);
      }
      
      if (foldersChanged) {
        setFolders(foldersData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load references';
      setError(errorMessage);
      console.error('Error loading references:', err);
    } finally {
      if (isInitialFetch) {
        setLoading(false);
      }
    }
  }, []);

  // Listen for Tauri event from server to refresh immediately when a new reference is saved
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        unlisten = await listen('references_updated', (event) => {
          const payload = event.payload as any;
          // Build a minimal Reference object and thumbnail URL load
          const newRef: Reference = {
            id: String(payload.id || payload["id"]),
            filename: String(payload.filename || payload["filename"]),
            original_name: String(payload.originalName || ''),
            url: String(payload.url || ''),
            created_at: Number(payload.createdAt || Date.now()),
            location: 'main'
          } as Reference;

          // Optimistically prepend to grid
          setReferences(prev => [newRef, ...prev]);

          // Load its thumbnail URL
          ReferencesService.getFolders()
            .then((foldersData) => TauriService.getReferenceThumbnailUrl(newRef, foldersData))
            .then((thumbUrl) => {
              setReferenceUrls(prev => new Map(prev.set(newRef.id, thumbUrl)));
            })
            .catch(() => {
              setReferenceUrls(prev => new Map(prev.set(newRef.id, '')));
            });
        });
      } catch (e) {
        // Ignore if not in Tauri
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, [fetchReferences]);

  const deleteReference = useCallback(async (id: string, folderId?: string) => {
    try {
      // Use Tauri service to delete reference
      await ReferencesService.deleteReference(id);
      
      // Update local state
      if (folderId) {
        // Remove from folder references
        setFolderReferences(prev => prev.filter(ref => ref.id !== id));
      } else {
        // Remove from main references
        setReferences(prev => prev.filter(ref => ref.id !== id));
      }
      
      // Also remove from referenceUrls map
      setReferenceUrls(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete reference';
      setError(errorMessage);
      console.error('Error deleting reference:', err);
      throw err;
    }
  }, []);

  const moveReference = useCallback(async (referenceId: string, targetFolderId: string) => {
    try {
      // Use Tauri service instead of HTTP API
      const result = await TauriService.moveReference(referenceId, targetFolderId);
      
      if (targetFolderId === 'main') {
        // Moving to main gallery
        if (activeFolderId) {
          // Moving from folder to main
          setFolderReferences(prev => prev.filter(ref => ref.id !== referenceId));
        }
        setReferences(prev => [result, ...prev]);
      } else {
        // Moving to a folder
        if (activeFolderId) {
          // Moving from current folder to another folder
          setFolderReferences(prev => prev.filter(ref => ref.id !== referenceId));
        } else {
          // Moving from main to folder
          setReferences(prev => prev.filter(ref => ref.id !== referenceId));
        }
        // Add to folder references if we're currently viewing that folder
        if (activeFolderId === targetFolderId) {
          setFolderReferences(prev => [result, ...prev]);
        }
      }
      
      // Update last fetch time to prevent immediate auto-refresh
      setLastFetchTime(Date.now());
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move reference';
      setError(errorMessage);
      console.error('Error moving reference:', err);
      throw err;
    }
  }, [activeFolderId]);

  const createFolder = useCallback(async (name: string) => {
    try {
      // Use Tauri service instead of HTTP API
      const newFolder = await TauriService.createFolder(name);
      setFolders(prev => [newFolder, ...prev]);
      // Update last fetch time to prevent immediate auto-refresh
      setLastFetchTime(Date.now());
      return newFolder;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create folder';
      setError(errorMessage);
      console.error('Error creating folder:', err);
      throw err;
    }
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    try {
      // Use Tauri service instead of HTTP API
      await TauriService.deleteFolder(id);
      setFolders(prev => prev.filter(folder => folder.id !== id));
      // Update last fetch time to prevent immediate auto-refresh
      setLastFetchTime(Date.now());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete folder';
      setError(errorMessage);
      console.error('Error deleting folder:', err);
      throw err;
    }
  }, []);

  // Patch a reference in local state without refetch
  const patchReference = useCallback((referenceId: string, update: Partial<Reference>) => {
    setReferences(prev => prev.map(r => r.id === referenceId ? { ...r, ...update } : r));
    setFolderReferences(prev => prev.map(r => r.id === referenceId ? { ...r, ...update } : r));
  }, []);

  const openFolder = useCallback(async (folderId: string) => {
    try {
      setActiveFolderId(folderId);
      // Fetch all references to filter folder references
      const allReferences = await ReferencesService.getReferences();
      console.log(`Total references found: ${allReferences.length}`);
      console.log(`Looking for folder ID: ${folderId}`);
      
      const folderRefs = allReferences.filter(ref => 
        ref.location?.includes(`folder/${folderId}`) || ref.folder_id === folderId
      );
      console.log(`Folder references found: ${folderRefs.length}`);
      console.log('Folder references:', folderRefs.map(r => ({ id: r.id, filename: r.filename, location: r.location, folder_id: r.folder_id })));
      
      setFolderReferences(folderRefs);
      
      // Load thumbnails for folder references
      console.log(`Loading thumbnails for ${folderRefs.length} folder references`);
      // Get folders data to pass to thumbnail loading
      const foldersData = await ReferencesService.getFolders();
      const folderThumbnailPromises = folderRefs.map(async (reference) => {
        try {
          console.log(`Loading thumbnail for reference: ${reference.filename}`);
          const url = await TauriService.getReferenceThumbnailUrl(reference, foldersData);
          console.log(`Successfully loaded thumbnail for ${reference.filename}: ${url ? 'URL received' : 'No URL'}`);
          return { id: reference.id, url };
        } catch (err) {
          console.error(`Failed to load thumbnail URL for ${reference.id}:`, err);
          return { id: reference.id, url: '' };
        }
      });
      
      const folderThumbnailResults = await Promise.all(folderThumbnailPromises);
      const folderThumbnailMap = new Map(folderThumbnailResults.map(result => [result.id, result.url]));
      
      console.log('Folder thumbnail results:', folderThumbnailResults);
      console.log('Folder thumbnail map:', Array.from(folderThumbnailMap.entries()));
      
      // Update the referenceUrls map with folder reference thumbnails
      setReferenceUrls(prev => {
        const newMap = new Map(prev);
        folderThumbnailMap.forEach((url, id) => {
          newMap.set(id, url);
        });
        console.log('Updated referenceUrls map:', Array.from(newMap.entries()));
        return newMap;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open folder';
      setError(errorMessage);
      console.error('Error opening folder:', err);
    }
  }, []);

  const closeFolder = useCallback(() => {
    setActiveFolderId(null);
    setFolderReferences([]);
  }, []);

  const uploadReference = useCallback(async (file: File, folderId?: string) => {
    console.log('=== UPLOAD REFERENCE CALLED ===');
    console.log('File:', file.name, file.size, 'bytes, type:', file.type);
    console.log('Folder ID:', folderId || 'main');
    
    // Generate a temporary ID for tracking the upload
    const tempId = `uploading_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    try {
      console.log('Adding to uploading state...');
      // Add to uploading state
      setUploadingImages(prev => new Set(prev).add(tempId));
      
      console.log('Calling ReferencesService.uploadReference...');
      // Use Tauri service instead of HTTP API
      const newReference = await ReferencesService.uploadReference(file, folderId);
      console.log('ReferencesService.uploadReference completed:', newReference);
      
      // Remove from uploading state
      setUploadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        return newSet;
      });
      
      // Only add to main references if not uploading to a folder
      if (!folderId) {
        setReferences(prev => [newReference, ...prev]);
        
        // Load thumbnail for the newly uploaded image
        try {
          // Get current folders state for thumbnail loading
          const currentFolders = await ReferencesService.getFolders();
          const thumbnailUrl = await TauriService.getReferenceThumbnailUrl(newReference, currentFolders);
          setReferenceUrls(prev => new Map(prev.set(newReference.id, thumbnailUrl)));
        } catch (err) {
          console.error(`Failed to load thumbnail for new reference ${newReference.id}:`, err);
          // Still add to referenceUrls with empty string so it doesn't break the UI
          setReferenceUrls(prev => new Map(prev.set(newReference.id, '')));
        }
      }
      
      // If uploading to a folder, refresh folder contents
      if (folderId) {
        await openFolder(folderId);
      }
      
      // Update last fetch time to prevent immediate auto-refresh
      setLastFetchTime(Date.now());
      return newReference;
    } catch (err) {
      console.error('=== ERROR IN UPLOAD REFERENCE ===');
      console.error('Error details:', err);
      console.error('Error message:', err instanceof Error ? err.message : 'Unknown error');
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      
      // Remove from uploading state on error
      setUploadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        return newSet;
      });
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload reference';
      setError(errorMessage);
      console.error('Error uploading reference:', err);
      throw err;
    }
  }, [openFolder]);

  // Load references when tab is active - auto-refresh disabled for testing
  useEffect(() => {
    fetchReferences();
    
    // Auto-refresh disabled for testing
    // if (ideaVaultTab === 'references') {
    //   const interval = setInterval(() => {
    //     fetchReferences();
    //   }, 5000);
    //   
    //   return () => clearInterval(interval);
    // }
  }, [ideaVaultTab]);

  return {
    references,
    referenceUrls,
    folders,
    loading,
    error,
    isRefreshing,
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
    refetch: fetchReferences,
    patchReference
  };
};
