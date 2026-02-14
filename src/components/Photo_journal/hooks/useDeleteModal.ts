import { useCallback, useState } from 'react';
import type { PhotoJournalImage } from '../../../services/photoJournalService';

export const useDeleteModal = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<PhotoJournalImage | null>(null);

  const openDeleteModal = useCallback((image: PhotoJournalImage) => {
    setImageToDelete(image);
    setShowDeleteModal(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setImageToDelete(null);
  }, []);

  return {
    showDeleteModal,
    imageToDelete,
    openDeleteModal,
    closeDeleteModal
  };
};

export default useDeleteModal;


