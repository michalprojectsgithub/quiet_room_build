import { useCallback } from 'react';

export interface UseFileUploadProps {
  uploadReference: (file: File, folderId?: string) => Promise<any>;
  activeFolderId: string | null;
}

export interface UseFileUploadReturn {
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export const useFileUpload = ({
  uploadReference,
  activeFolderId
}: UseFileUploadProps): UseFileUploadReturn => {
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        // If we're in a folder, upload to that folder
        console.log('=== MANUAL UPLOAD ===');
        console.log('Current activeFolderId:', activeFolderId);
        console.log('Type of activeFolderId:', typeof activeFolderId);
        console.log('Uploading to folder ID:', activeFolderId || 'main gallery');
        await uploadReference(file, activeFolderId || undefined);
      } catch (err) {
        // Error is already handled in the hook
      }
    }
    // Reset input value
    event.target.value = '';
  }, [uploadReference, activeFolderId]);

  return {
    handleFileUpload
  };
};
