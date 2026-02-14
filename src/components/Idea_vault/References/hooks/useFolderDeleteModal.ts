import { useState, useCallback } from 'react';
import type { Folder } from '../types';

// Custom hook for folder delete modal management
export const useFolderDeleteModal = () => {
  const [showFolderDeleteModal, setShowFolderDeleteModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);

  const openFolderDeleteModal = useCallback((folder: Folder) => {
    setFolderToDelete(folder);
    setShowFolderDeleteModal(true);
  }, []);

  const closeFolderDeleteModal = useCallback(() => {
    setShowFolderDeleteModal(false);
    setFolderToDelete(null);
  }, []);

  return {
    showFolderDeleteModal,
    folderToDelete,
    openFolderDeleteModal,
    closeFolderDeleteModal
  };
};
