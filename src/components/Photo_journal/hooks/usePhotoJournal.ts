import { useCallback, useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { PhotoJournalService } from '../../../services/photoJournalService';
import type { PhotoJournalImage } from '../../../services/photoJournalService';

export const usePhotoJournal = () => {
  const [images, setImages] = useState<PhotoJournalImage[]>([]);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PhotoJournalService.getImages();
      setImages(data);
      const urlPromises = data.map(async (image) => {
        try {
          const url = await PhotoJournalService.getThumbnailUrl(image);
          return { id: image.id, url };
        } catch (err) {
          console.error(`Failed to load thumbnail URL for ${image.id}:`, err);
          return { id: image.id, url: '' };
        }
      });
      const urlResults = await Promise.all(urlPromises);
      const urlMap = new Map(urlResults.map(result => [result.id, result.url]));
      setImageUrls(urlMap);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load photo journal';
      setError(errorMessage);
      console.error('Error fetching photo journal images:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadImage = useCallback(async (file: File) => {
    try {
      const newImage = await PhotoJournalService.uploadImage(file);
      setImages(prev => [newImage, ...prev]);
      try {
        const thumbnailUrl = await PhotoJournalService.getThumbnailUrl(newImage);
        setImageUrls(prev => new Map(prev.set(newImage.id, thumbnailUrl)));
      } catch (err) {
        console.error(`Failed to load thumbnail for new image ${newImage.id}:`, err);
        setImageUrls(prev => new Map(prev.set(newImage.id, '')));
      }
      return newImage;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
      setError(errorMessage);
      console.error('Error uploading image:', err);
      throw err;
    }
  }, []);

  const deleteImage = useCallback(async (id: string) => {
    try {
      await PhotoJournalService.deleteImage(id);
      setImages(prev => prev.filter(img => img.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete image';
      setError(errorMessage);
      console.error('Error deleting image:', err);
      throw err;
    }
  }, []);

  const setRotation = useCallback(async (id: string, rotation: number) => {
    try {
      const updated = await PhotoJournalService.setRotation(id, rotation);
      setImages(prev => prev.map(img => img.id === id ? { ...img, rotation: updated.rotation } : img));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set rotation';
      setError(errorMessage);
      console.error('Error setting rotation:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        unlisten = await listen('photo_journal_updated', async (event) => {
          const payload = event.payload as any;
          const newImage: PhotoJournalImage = {
            id: String(payload.id || payload["id"]),
            filename: String(payload.filename || payload["filename"]),
            originalName: String(payload.originalName || payload.original_name || payload.filename || 'image'),
            url: String(payload.url || ''),
            uploadDate: String(payload.uploadDate || payload.upload_date || new Date().toISOString()),
            size: Number(payload.size || 0),
            mimetype: String(payload.mimetype || 'image/jpeg'),
            prompt: payload.prompt ?? undefined,
            referenceId: payload.referenceId ?? null,
            rotation: Number(payload.rotation || 0)
          };

          setImages(prev => [newImage, ...prev]);
          try {
            const thumbnailUrl = await PhotoJournalService.getThumbnailUrl(newImage);
            setImageUrls(prev => new Map(prev.set(newImage.id, thumbnailUrl)));
          } catch (err) {
            console.error(`Failed to load thumbnail for new image ${newImage.id}:`, err);
            setImageUrls(prev => new Map(prev.set(newImage.id, '')));
          }
        });
      } catch {
        // Ignore if not in Tauri
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return {
    images,
    imageUrls,
    loading,
    error,
    uploadImage,
    deleteImage,
    setRotation,
    refetch: fetchImages
  };
};

export default usePhotoJournal;


