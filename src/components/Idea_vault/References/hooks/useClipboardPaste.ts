import { useCallback, useEffect } from 'react';

export interface UseClipboardPasteProps {
  uploadReference: (file: File, folderId?: string) => Promise<any>;
  activeFolderId: string | null;
  ideaVaultTab: string;
}

export const useClipboardPaste = ({
  uploadReference,
  activeFolderId,
  ideaVaultTab
}: UseClipboardPasteProps) => {
  const handleClipboardPaste = useCallback(async (e: ClipboardEvent) => {
    // Only handle if we're in the References tab
    if (ideaVaultTab !== 'references') return;
    
    console.log('=== CLIPBOARD PASTE ===');
    console.log('Clipboard items:', e.clipboardData?.items.length);
    
    if (e.clipboardData?.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        console.log('Clipboard item:', item.kind, item.type);
        
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            console.log('Found image in clipboard:', file.name, file.size, 'bytes');
            e.preventDefault();
            
            try {
              // Upload to current folder if we're in one, otherwise upload to main gallery
              const targetFolderId = activeFolderId || undefined;
              console.log('Pasting to folder ID:', targetFolderId || 'main gallery');
              await uploadReference(file, targetFolderId);
              console.log('Successfully pasted image:', file.name);
            } catch (err) {
              console.error('Error pasting image:', err);
            }
            break;
          }
        }
      }
    }
  }, [uploadReference, activeFolderId, ideaVaultTab]);

  // Set up clipboard paste listener
  useEffect(() => {
    document.addEventListener('paste', handleClipboardPaste);
    
    return () => {
      document.removeEventListener('paste', handleClipboardPaste);
    };
  }, [handleClipboardPaste]);
};
