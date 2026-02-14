import { useState, useCallback } from 'react';

// Custom hook for folder creation modal management
export const useFolderModal = () => {
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');

  const openFolderModal = useCallback(() => {
    setShowFolderModal(true);
    setFolderName('');
  }, []);

  const closeFolderModal = useCallback(() => {
    setShowFolderModal(false);
    setFolderName('');
  }, []);

  const resetFolderModal = useCallback(() => {
    setFolderName('');
  }, []);

  return {
    showFolderModal,
    folderName,
    setFolderName,
    openFolderModal,
    closeFolderModal,
    resetFolderModal
  };
};
