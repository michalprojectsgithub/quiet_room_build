import { useState, useCallback } from 'react';

// Custom hook for delete modal management
export const useDeleteModal = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [referenceToDelete, setReferenceToDelete] = useState<string | null>(null);

  const openDeleteModal = useCallback((id: string) => {
    setReferenceToDelete(id);
    setShowDeleteModal(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setReferenceToDelete(null);
  }, []);

  return {
    showDeleteModal,
    referenceToDelete,
    openDeleteModal,
    closeDeleteModal
  };
};
