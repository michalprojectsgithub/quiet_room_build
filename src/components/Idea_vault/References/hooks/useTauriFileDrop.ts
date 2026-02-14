import { useCallback, useEffect, useState } from 'react';
import { appWindow } from '@tauri-apps/api/window';
import TauriService from '../../../../services/tauriService';

export interface UseTauriFileDropProps {
  uploadReference: (file: File, folderId?: string) => Promise<any>;
  activeFolderId: string | null;
}

export interface UseTauriFileDropReturn {
  isFileDragOver: boolean;
}

export const useTauriFileDrop = ({
  uploadReference,
  activeFolderId
}: UseTauriFileDropProps): UseTauriFileDropReturn => {
  const [isFileDragOver, setIsFileDragOver] = useState(false);

  const handleTauriFileDrop = useCallback(async (event: any) => {
    console.log('=== TAURI FILE DROP EVENT ===');
    console.log('Event type:', event.payload.type);
    console.log('Event paths:', event.payload.paths);
    
    if (event.payload.type === 'hover') {
      console.log('Files hovering over window:', event.payload.paths);
      setIsFileDragOver(true);
    } else if (event.payload.type === 'drop') {
      console.log('Files dropped on window:', event.payload.paths);
      setIsFileDragOver(false);
      
      // Process the dropped files
      const filePaths = event.payload.paths;
      const imageFiles = filePaths.filter((path: string) => {
        const extension = path.toLowerCase().split('.').pop();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension || '');
      });
      
      console.log('Image files found:', imageFiles);
      
      if (imageFiles.length > 0) {
        console.log('Processing', imageFiles.length, 'image files...');
        // Upload to current folder if we're in one, otherwise upload to main gallery
        for (const filePath of imageFiles) {
          try {
            console.log('=== PROCESSING FILE ===');
            console.log('File path:', filePath);
            console.log('File name:', filePath.split('/').pop());
            
            // We need to read the file and create a File object using Tauri
            console.log('Reading file with Tauri...');
            const base64Data = await TauriService.readFileForUpload(filePath);
            console.log('Base64 data received, length:', base64Data.length);
            
            // Convert base64 to blob
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Determine MIME type from file extension
            const extension = filePath.toLowerCase().split('.').pop();
            let mimeType = 'application/octet-stream';
            switch (extension) {
              case 'jpg':
              case 'jpeg':
                mimeType = 'image/jpeg';
                break;
              case 'png':
                mimeType = 'image/png';
                break;
              case 'gif':
                mimeType = 'image/gif';
                break;
              case 'webp':
                mimeType = 'image/webp';
                break;
              case 'bmp':
                mimeType = 'image/bmp';
                break;
              case 'svg':
                mimeType = 'image/svg+xml';
                break;
            }
            
            const blob = new Blob([bytes], { type: mimeType });
            console.log('Blob created:', blob.size, 'bytes, type:', blob.type);
            
            const fileName = filePath.split(/[/\\]/).pop() || 'image'; // Handle both / and \ separators
            const file = new File([blob], fileName, { type: mimeType });
            console.log('File object created:', file.name, file.size, 'bytes, type:', file.type);
            
            console.log('Calling uploadReference...');
            // Upload to current folder if we're in one, otherwise upload to main gallery
            console.log('Current activeFolderId:', activeFolderId);
            console.log('Type of activeFolderId:', typeof activeFolderId);
            const targetFolderId = activeFolderId || undefined;
            console.log('Target folder ID:', targetFolderId);
            console.log('Uploading to folder ID:', targetFolderId || 'main gallery');
            await uploadReference(file, targetFolderId);
            console.log('Successfully uploaded:', file.name);
          } catch (err) {
            console.error('=== ERROR PROCESSING FILE ===');
            console.error('File path:', filePath);
            console.error('Error details:', err);
            console.error('Error message:', err instanceof Error ? err.message : 'Unknown error');
            console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
          }
        }
      } else {
        console.log('No image files found in dropped files');
        console.log('All dropped files:', filePaths);
      }
    } else {
      console.log('File drop cancelled');
      setIsFileDragOver(false);
    }
  }, [uploadReference, activeFolderId]);

  // Set up Tauri file drop listener
  useEffect(() => {
    console.log('=== SETTING UP TAURI FILE DROP LISTENER ===');
    const unlisten = appWindow.onFileDropEvent(handleTauriFileDrop);
    console.log('Tauri file drop listener set up successfully');
    
    return () => {
      console.log('=== CLEANING UP TAURI FILE DROP LISTENER ===');
      unlisten.then(unlistenFn => unlistenFn());
    };
  }, [handleTauriFileDrop]);

  return {
    isFileDragOver
  };
};
