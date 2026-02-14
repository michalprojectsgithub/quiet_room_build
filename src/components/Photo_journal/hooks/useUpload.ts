import { useCallback, useState } from 'react';
import type { PhotoJournalImage } from '../../../services/photoJournalService';

export const useUpload = (uploadImage: (file: File) => Promise<PhotoJournalImage>) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = useCallback(async (files: File[]) => {
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of files) {
        await uploadImage(file);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
      setUploadError(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [uploadImage]);

  return {
    uploading,
    uploadError,
    handleUpload
  };
};

export default useUpload;


