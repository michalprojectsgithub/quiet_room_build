import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
  isOpen: boolean;
  selectedItem: string | null;
  editingItem: string | null;
  onDeleteItem: (itemId: string) => void;
  onClearSelection: () => void;
  onCloseModal: () => void;
  onCloseEditing: () => void;
}

export const useKeyboardShortcuts = ({
  isOpen,
  selectedItem,
  editingItem,
  onDeleteItem,
  onClearSelection,
  onCloseModal,
  onCloseEditing
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Don't handle keyboard shortcuts when editing text
      if (editingItem) return;

      if (e.key === 'Delete' && selectedItem) {
        onDeleteItem(selectedItem);
      }

      if (e.key === 'Escape') {
        onClearSelection();
        onCloseModal();
        onCloseEditing();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedItem, editingItem, onDeleteItem, onClearSelection, onCloseModal, onCloseEditing]);
};
