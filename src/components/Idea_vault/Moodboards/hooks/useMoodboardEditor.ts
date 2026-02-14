import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import type { Moodboard, MoodboardItem } from '../types';
// import { imageCacheService } from '../../../services/imageCacheService';
// import { performanceMonitor } from '../../../utils/performanceMonitor';

interface UseMoodboardEditorProps {
  moodboard: Moodboard | null;
  API_BASE: string;
  onMoodboardUpdate: (updatedMoodboard: Moodboard) => void;
}

export const useMoodboardEditor = ({
  moodboard,
  API_BASE,
  onMoodboardUpdate
}: UseMoodboardEditorProps) => {
  // State variables
  const [items, setItems] = useState<MoodboardItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingItem, setResizingItem] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [localMoodboard, setLocalMoodboard] = useState<Moodboard | null>(moodboard);
  const [showColorSwatchModal, setShowColorSwatchModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [showTextModal, setShowTextModal] = useState(false);
  const [newTextContent, setNewTextContent] = useState('');
  const [showImageSelectionModal, setShowImageSelectionModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  // const lastUpdateTime = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const virtualPositionRef = useRef<{ x: number; y: number } | null>(null);
  const saveInProgressRef = useRef<boolean>(false);
  const resizeStartRef = useRef<{ width: number; height: number; mouseX: number; mouseY: number } | null>(null);

  const getCanvasSize = useCallback(() => {
    const width = canvasRef.current?.clientWidth ?? 1123; // Fallback to A4 landscape px width
    const height = canvasRef.current?.clientHeight ?? 794; // Fallback to A4 landscape px height
    return { width, height };
  }, []);


  // Initialize items when moodboard changes
  useEffect(() => {
    if (moodboard) {
      // Don't convert URLs here - keep original relative paths in state
      // URLs will be converted to data URLs only for display in the UI
      setItems(moodboard.items);
      setLocalMoodboard(moodboard);
    }
  }, [moodboard]);

  // Cleanup effect for memory management
  useEffect(() => {
    return () => {
      // Clean up any pending timeouts
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      // Cancel any pending animation frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Clear virtual position and save state
      virtualPositionRef.current = null;
      saveInProgressRef.current = false;
    };
  }, []);

  // Save moodboard using Tauri command
  const saveMoodboard = useCallback(async () => {
    if (!moodboard || saveInProgressRef.current) return;

    saveInProgressRef.current = true;
    try {
      // Use the latest local title if available
      const titleToSave = (localMoodboard ? localMoodboard.title : moodboard.title);
      const updatedMoodboard = await invoke('update_moodboard', {
        moodboardId: moodboard.id,
        title: titleToSave,
        items: items
      });
      onMoodboardUpdate(updatedMoodboard as any);
    } catch (error) {
      console.error('Error saving moodboard:', error);
    } finally {
      saveInProgressRef.current = false;
    }
  }, [moodboard, localMoodboard, items, onMoodboardUpdate]);

  // Optimized save for individual item updates (position/size only)
  const saveItemUpdate = useCallback(async (itemId: string, updates: { x?: number; y?: number; width?: number; height?: number }) => {
    if (!moodboard || saveInProgressRef.current) return;

    saveInProgressRef.current = true;
    try {
      const updatedMoodboard = await invoke('update_moodboard_item', {
        moodboardId: moodboard.id,
        itemId,
        x: updates.x,
        y: updates.y,
        width: updates.width,
        height: updates.height
      });
      
      onMoodboardUpdate(updatedMoodboard as any);
    } catch (error) {
      console.error('Error saving item update:', error);
      // Fallback to full save if incremental update fails
      saveInProgressRef.current = false; // Reset flag before fallback
      saveMoodboard();
      return; // Don't reset flag again since saveMoodboard will handle it
    } finally {
      saveInProgressRef.current = false;
    }
  }, [moodboard, onMoodboardUpdate, saveMoodboard]);

  // Auto-save when items change (with improved debouncing and drag detection)
  useEffect(() => {
    // Don't auto-save during active dragging or resizing
    if (draggedItem || resizingItem) {
      // Clear any pending save when starting to drag/resize
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      return;
    }

    if (moodboard && items.length > 0) {
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Use longer debounce time for better performance
      // Only save if there are actual changes
      saveTimeoutRef.current = setTimeout(() => {
        // Double-check we're not dragging/resizing before saving
        if (!draggedItem && !resizingItem) {
          saveMoodboard();
        }
      }, 5000); // Increased to 5 seconds for better performance
      
      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }
  }, [items, moodboard, draggedItem, resizingItem, saveMoodboard]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, itemId: string, renderedSize?: { width: number; height: number }) => {
    
    const item = items.find(i => i.id === itemId);
    if (!item) {
      console.error('Item not found in handleMouseDown:', itemId);
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if clicking on resize handle (bottom-right). For images, use displayed height (width/aspectRatio)
    const displayedHeight = item.type === 'image' && item.aspectRatio ? (item.width / item.aspectRatio) : item.height;
    // If user clicked directly on the visible resize handle element, start resizing immediately
    const targetEl = e.target as HTMLElement;
    if (targetEl && targetEl.classList && targetEl.classList.contains('moodboard-editor-resize-handle')) {
      setResizingItem(itemId);
      setSelectedItem(itemId);
      const startWidth = renderedSize?.width ?? item.width;
      const startHeight = renderedSize?.height ?? (item.type === 'image' && item.aspectRatio ? (item.width / item.aspectRatio) : item.height);
      resizeStartRef.current = { width: startWidth, height: startHeight, mouseX, mouseY };
      return;
    }

    // Prefer actual rendered size when provided
    const hitWidth = renderedSize?.width ?? item.width;
    const hitHeight = renderedSize?.height ?? displayedHeight;

    // Enlarge hitbox near the bottom-right corner for easier grabs
    const hitbox = 32; // px
    const isResizeHandle = 
      mouseX > item.x + hitWidth - hitbox && 
      mouseX < item.x + hitWidth &&
      mouseY > item.y + hitHeight - hitbox && 
      mouseY < item.y + hitHeight;


    if (isResizeHandle) {
      setResizingItem(itemId);
      const startWidth = hitWidth;
      const startHeight = hitHeight;
      resizeStartRef.current = { width: startWidth, height: startHeight, mouseX, mouseY };
    } else {
      setDraggedItem(itemId);
      setDragOffset({
        x: mouseX - item.x,
        y: mouseY - item.y
      });
    }

    setSelectedItem(itemId);
  }, [items]);

  // Optimized mouse move handler with requestAnimationFrame and virtual positioning
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const { width: canvasWidth, height: canvasHeight } = getCanvasSize();

    // Store virtual position for smooth updates
    virtualPositionRef.current = { x: mouseX, y: mouseY };

    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Use requestAnimationFrame for smooth updates
    animationFrameRef.current = requestAnimationFrame(() => {
      if (!virtualPositionRef.current) return;

      // Track frame rate for performance monitoring
      // performanceMonitor.trackFrame();

      const { x: currentX, y: currentY } = virtualPositionRef.current;

      if (draggedItem) {
        const newX = currentX - dragOffset.x;
        const newY = currentY - dragOffset.y;
        const clampedX = Math.min(Math.max(0, newX), Math.max(0, canvasWidth - (items.find(i => i.id === draggedItem)?.width ?? 0)));
        const clampedY = Math.min(Math.max(0, newY), Math.max(0, canvasHeight - (items.find(i => i.id === draggedItem)?.height ?? 0)));
        
        // Update state only if position actually changed significantly
        setItems(prev => prev.map(item => {
          if (item.id === draggedItem) {
            const deltaX = Math.abs(item.x - clampedX);
            const deltaY = Math.abs(item.y - clampedY);
            
            // Only update if movement is significant (reduces unnecessary re-renders)
            if (deltaX > 1 || deltaY > 1) {
              return { ...item, x: clampedX, y: clampedY };
            }
          }
          return item;
        }));
      }

      if (resizingItem) {
        const resizingItemData = items.find(i => i.id === resizingItem);
        if (resizingItemData) {
          // Smooth resize relative to the moment the drag started
          const start = resizeStartRef.current;
          const baseWidth = start?.width ?? (resizingItemData.type === 'image' && resizingItemData.aspectRatio ? (resizingItemData.width) : resizingItemData.width);
          const baseHeight = start?.height ?? (resizingItemData.type === 'image' && resizingItemData.aspectRatio ? (resizingItemData.width / resizingItemData.aspectRatio) : resizingItemData.height);
          const baseMouseX = start?.mouseX ?? (resizingItemData.x + baseWidth);
          const baseMouseY = start?.mouseY ?? (resizingItemData.y + baseHeight);

          const deltaX = currentX - baseMouseX;
          const deltaY = currentY - baseMouseY;

          const rawWidth = baseWidth + deltaX;
          const rawHeight = baseHeight + deltaY;

          let newWidth, newHeight;

          if (resizingItemData.type === 'image') {
            // Diagonal-constrained fit to avoid jumps while preserving aspect
            const ratio = resizingItemData.aspectRatio && resizingItemData.aspectRatio > 0
              ? resizingItemData.aspectRatio
              : Math.max(0.01, resizingItemData.width / Math.max(1, resizingItemData.height));

            if (ratio >= 1) {
              // Landscape: compute width candidate from X, and from Y, then take the limiting one
              const widthFromX = rawWidth;
              const widthFromY = rawHeight * ratio;
              newWidth = Math.max(50, Math.min(widthFromX, widthFromY));
              newHeight = newWidth / ratio;
            } else {
              // Portrait: compute height candidate from Y, and from X, then take the limiting one
              const heightFromY = rawHeight;
              const heightFromX = rawWidth / ratio;
              newHeight = Math.max(50, Math.min(heightFromY, heightFromX));
              newWidth = newHeight * ratio;
            }

            // If enlarging (both deltas >= 0), don't allow the first frame to shrink below start size
            if (deltaX >= 0 && deltaY >= 0) {
              newWidth = Math.max(newWidth, baseWidth);
              newHeight = Math.max(newHeight, baseHeight);
            }
          } else {
            // For non-image items, allow free resizing (bottom-right)
            newWidth = Math.max(50, rawWidth);
            newHeight = Math.max(50, rawHeight);
          }

          // Keep item within canvas bounds
          const maxWidth = Math.max(50, canvasWidth - resizingItemData.x);
          const maxHeight = Math.max(50, canvasHeight - resizingItemData.y);
          newWidth = Math.min(newWidth, maxWidth);
          newHeight = Math.min(newHeight, maxHeight);

          // Only update if dimensions changed significantly
          const deltaWidth = Math.abs(resizingItemData.width - newWidth);
          const deltaHeight = Math.abs(resizingItemData.height - newHeight);

          if (deltaWidth > 1 || deltaHeight > 1) {
            setItems(prev => prev.map(item => 
              item.id === resizingItem 
                ? { 
                    ...item, 
                    width: newWidth,
                    height: newHeight
                  }
                : item
            ));
          }
        }
      }
    });
  }, [draggedItem, dragOffset, resizingItem, items]);

  const handleMouseUp = useCallback(() => {
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Clear virtual position
    virtualPositionRef.current = null;
    
    // Save immediately when dragging/resizing ends using optimized method
    if (draggedItem || resizingItem) {
      // Small delay to ensure state is updated
      setTimeout(() => {
        const item = items.find(i => i.id === draggedItem || i.id === resizingItem);
        if (item) {
          saveItemUpdate(item.id, {
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height
          });
        } else {
          // Fallback to full save if item not found
          saveMoodboard();
        }
      }, 100);
    }
    
    setDraggedItem(null);
    setResizingItem(null);
    resizeStartRef.current = null;
  }, [draggedItem, resizingItem, saveMoodboard, saveItemUpdate, items]);

  // Delete item
  const handleDeleteItem = useCallback((itemId: string) => {
    if (!moodboard) {
      console.error('No moodboard available for deletion');
      return;
    }

    // Call Tauri to delete the item and its file
    invoke('delete_moodboard_item', {
      moodboardId: moodboard.id,
      itemId
    })
    .then((updated: any) => {
      // Update local state from backend result
      setItems(prev => prev.filter(item => item.id !== itemId));
      setSelectedItem(null);
      onMoodboardUpdate(updated);
    })
    .catch((error) => {
      console.error('Error deleting item via Tauri:', error);
      // Still remove from local state to keep UI consistent
      setItems(prev => prev.filter(item => item.id !== itemId));
      setSelectedItem(null);
    });
  }, [moodboard, onMoodboardUpdate]);

  // Edit item
  const handleEditItem = useCallback((itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item && item.type === 'text') {
      setEditingItem(itemId);
      setEditingContent(item.content || '');
    }
  }, [items]);

  const handleSaveEdit = useCallback(() => {
    if (!editingItem) return;

    setItems(prev => prev.map(item => 
      item.id === editingItem 
        ? { ...item, content: editingContent }
        : item
    ));
    setEditingItem(null);
    setEditingContent('');
  }, [editingItem, editingContent]);

  const handleEditChange = useCallback((content: string) => {
    setEditingContent(content);
  }, []);

  // Title editing handlers
  const startEditingTitle = useCallback(() => {
    if (moodboard) {
      setIsEditingTitle(true);
      setEditingTitle(moodboard.title);
    }
  }, [moodboard]);

  const saveTitleEdit = useCallback(async () => {
    if (!moodboard || !editingTitle.trim()) return;

    const newTitle = editingTitle.trim();
    const optimisticMoodboard = { ...moodboard, title: newTitle };

    // Optimistic update
    setLocalMoodboard(optimisticMoodboard);
    onMoodboardUpdate(optimisticMoodboard);

    try {
      const updated = await invoke('update_moodboard', {
        moodboardId: moodboard.id,
        title: newTitle,
        items: items
      });
      // Ensure state reflects persisted update
      setLocalMoodboard(updated as any);
      onMoodboardUpdate(updated as any);
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Error updating moodboard title via Tauri:', error);
    }
  }, [moodboard, editingTitle, items, onMoodboardUpdate]);

  const cancelTitleEdit = useCallback(() => {
    setIsEditingTitle(false);
    setEditingTitle('');
  }, []);

  const handleTitleChange = useCallback((title: string) => {
    setEditingTitle(title);
  }, []);

  // Color swatch handlers
  const openColorSwatchModal = useCallback(() => {
    setShowColorSwatchModal(true);
  }, []);

  const closeColorSwatchModal = useCallback(() => {
    setShowColorSwatchModal(false);
  }, []);

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color);
  }, []);

  const handleAddColorSwatch = useCallback(() => {
    const newItem: MoodboardItem = {
      id: Date.now().toString(),
      type: 'color',
      content: selectedColor,
      colors: [selectedColor],
      x: 100,
      y: 100,
      width: 120,
      height: 120,
      createdAt: Date.now()
    };

    setItems(prev => {
      return [...prev, newItem];
    });
    setShowColorSwatchModal(false);
  }, [selectedColor]);

  // Add sticky note text
  const handleAddStickyNote = useCallback(() => {
    setShowTextModal(true);
    setNewTextContent('');
  }, []);

  // Handle text modal submission
  const handleTextModalSubmit = useCallback(() => {
    if (!newTextContent.trim()) return;

    // Calculate a position that doesn't overlap with existing items
    const baseX = 100;
    const baseY = 100;
    const offset = items.length * 20; // Offset each new note slightly
    
         const newItem: MoodboardItem = {
       id: Date.now().toString(),
       type: 'text',
       content: newTextContent.trim(),
       x: baseX + offset,
       y: baseY + offset,
       width: 200,
       height: 200,
       fontSize: 16,
       color: '#333333',
       createdAt: Date.now()
     };

    setItems(prev => [...prev, newItem]);
    setShowTextModal(false);
    setNewTextContent('');
  }, [newTextContent, items.length]);

  // Handle text modal close
  const handleTextModalClose = useCallback(() => {
    setShowTextModal(false);
    setNewTextContent('');
  }, []);

  // Handle text content change
  const handleTextContentChange = useCallback((content: string) => {
    setNewTextContent(content);
  }, []);

  // Image selection handlers
  const openImageSelectionModal = useCallback(() => {
    setShowImageSelectionModal(true);
  }, []);

  const closeImageSelectionModal = useCallback(() => {
    setShowImageSelectionModal(false);
  }, []);

  const handleImageSelect = useCallback(async (imageUrl: string, imageName: string, isUploadedToMoodboard: boolean = false, uploadedImageData?: any) => {
    if (isUploadedToMoodboard && uploadedImageData) {
      // For moodboard uploads, create item with server data and calculate metadata
      // The URL from the Tauri command is already a relative path that can be used with get_image_data
      let displayUrl = uploadedImageData.url;
      if (displayUrl && !displayUrl.startsWith('http') && !displayUrl.startsWith('data:')) {
        // For relative paths, we need to convert them to data URLs using get_image_data
        try {
          displayUrl = await invoke('get_image_data', { imagePath: displayUrl }) as string;
        } catch (error) {
          console.error('Failed to get image data for uploaded image:', error);
          // Fallback to constructing a full URL
          displayUrl = displayUrl.startsWith('/') ? `${API_BASE}${displayUrl}` : `${API_BASE}/${displayUrl}`;
        }
      }
      
      console.log('Uploaded image data:', uploadedImageData);
      console.log('Display URL:', displayUrl);
      
      const newItem: MoodboardItem = {
        id: uploadedImageData.id,
        type: 'image',
        filename: uploadedImageData.filename,
        originalName: uploadedImageData.content || uploadedImageData.originalName, // Rust stores original name in content field
        url: uploadedImageData.url, // Keep original relative path for database
        x: uploadedImageData.x,
        y: uploadedImageData.y,
        width: uploadedImageData.width,
        height: uploadedImageData.height,
        createdAt: uploadedImageData.createdAt || uploadedImageData.created_at, // Handle both camelCase and snake_case
        isWebp: uploadedImageData.is_webp || uploadedImageData.isWebp
      };

      // Add the item first with default dimensions to both local state and moodboard
      setItems(prev => [...prev, newItem]);
      
      // Immediately save the new item to the moodboard
      if (moodboard) {
        const moodboardWithNewItem = {
          ...moodboard,
          items: [...moodboard.items, newItem]
        };
        onMoodboardUpdate(moodboardWithNewItem);
      }

      // Calculate metadata and update the item
      try {
        const img = new Image();
        const metadata = await new Promise((resolve, reject) => {
          img.onload = () => {
            resolve({
              originalWidth: img.naturalWidth,
              originalHeight: img.naturalHeight,
              aspectRatio: img.naturalWidth / img.naturalHeight
            });
          };
          img.onerror = reject;
          img.src = displayUrl;
        }) as { originalWidth: number; originalHeight: number; aspectRatio: number };
        
        // Calculate display dimensions using the same logic as server-side
        const maxDisplaySize = 400;
        let displayWidth, displayHeight;
        
        if (metadata.aspectRatio >= 1) {
          // Landscape or square
          displayWidth = maxDisplaySize;
          displayHeight = maxDisplaySize / metadata.aspectRatio;
        } else {
          // Portrait
          displayHeight = maxDisplaySize;
          displayWidth = maxDisplaySize * metadata.aspectRatio;
        }

        // Update the item with metadata and proper dimensions
        const updatedItem: MoodboardItem = {
          ...newItem,
          width: displayWidth,
          height: displayHeight,
          originalWidth: metadata.originalWidth,
          originalHeight: metadata.originalHeight,
          aspectRatio: metadata.aspectRatio
        };

        // Update the item in state
        setItems(prev => prev.map(item => item.id === newItem.id ? updatedItem : item));
        
        // Also update the moodboard with the metadata
        if (moodboard) {
          const updatedMoodboard = {
            ...moodboard,
            items: [...moodboard.items.filter(item => item.id !== newItem.id), updatedItem]
          };
          onMoodboardUpdate(updatedMoodboard);
        }
      } catch (error) {
        console.warn('Failed to get metadata for uploaded image:', error);
        // Item is already added with default dimensions, so it will still display
      }
    } else {
      // For references/photo journal selections, create a new item with metadata calculation
      console.log('Reference/Photo Journal image selection:', { imageUrl, imageName });
      
      const newItem: MoodboardItem = {
        id: Date.now().toString(),
        type: 'image',
        filename: imageName, // Use filename instead of content for image items
        url: imageUrl,
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        createdAt: Date.now()
      };

      // Add the item first with default dimensions to both local state and moodboard
      setItems(prev => [...prev, newItem]);
      
      // Immediately save the new item to the moodboard
      if (moodboard) {
        const moodboardWithNewItem = {
          ...moodboard,
          items: [...moodboard.items, newItem]
        };
        onMoodboardUpdate(moodboardWithNewItem);
      }

      // Calculate metadata and update the item
      try {
        // For relative paths, get the data URL first
        let imgSrc = imageUrl;
        if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
          try {
            let imagePath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
            imgSrc = await invoke('get_image_data', { imagePath }) as string;
          } catch (e) {
            console.warn('Failed to convert image URL, using original:', e);
          }
        }
        
        const img = new Image();
        const metadata = await new Promise((resolve, reject) => {
          img.onload = () => {
            resolve({
              originalWidth: img.naturalWidth,
              originalHeight: img.naturalHeight,
              aspectRatio: img.naturalWidth / img.naturalHeight
            });
          };
          img.onerror = reject;
          img.src = imgSrc;
        }) as { originalWidth: number; originalHeight: number; aspectRatio: number };
        
        // Calculate display dimensions using the same logic as server-side
        const maxDisplaySize = 400;
        let displayWidth, displayHeight;
        
        if (metadata.aspectRatio >= 1) {
          // Landscape or square
          displayWidth = maxDisplaySize;
          displayHeight = maxDisplaySize / metadata.aspectRatio;
        } else {
          // Portrait
          displayHeight = maxDisplaySize;
          displayWidth = maxDisplaySize * metadata.aspectRatio;
        }

        // Update the item with metadata and proper dimensions
        const updatedItem: MoodboardItem = {
          ...newItem,
          width: displayWidth,
          height: displayHeight,
          originalWidth: metadata.originalWidth,
          originalHeight: metadata.originalHeight,
          aspectRatio: metadata.aspectRatio
        };

        // Update the item in state
        setItems(prev => prev.map(item => item.id === newItem.id ? updatedItem : item));
        
        // Also update the moodboard with the metadata
        if (moodboard) {
          const updatedMoodboard = {
            ...moodboard,
            items: [...moodboard.items.filter(item => item.id !== newItem.id), updatedItem]
          };
          onMoodboardUpdate(updatedMoodboard);
        }
      } catch (error) {
        console.warn('Failed to get metadata for reference/photo journal image:', error);
        // Item is already added with default dimensions, so it will still display
      }
    }
    
    setShowImageSelectionModal(false);
  }, [moodboard, onMoodboardUpdate, API_BASE]);

  // Handle paste events for images
  const pasteInFlightRef = useRef(false);

  const handlePaste = useCallback(async (e: ClipboardEvent | React.ClipboardEvent) => {
    // Only handle paste if we have a moodboard
    if (!moodboard) return;
    if (pasteInFlightRef.current) return; // prevent duplicate handling

    // Prevent default early; similar to References paste behavior
    e.preventDefault();
    pasteInFlightRef.current = true;

    const processFile = async (file: File) => {
      if (!moodboard) return;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Generate unique filename similar to ImageSelectionModal
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const filename = `moodboard_${moodboard.id}_${timestamp}.${fileExtension}`;

        const result = await invoke('upload_moodboard_image', {
          moodboardId: moodboard.id,
          filename,
          originalName: file.name,
          data: Array.from(uint8Array)
        }) as any;

        // Convert returned url to data URL for display
        let displayUrl = result.url as string;
        if (displayUrl && !displayUrl.startsWith('http') && !displayUrl.startsWith('data:')) {
          try {
            displayUrl = await invoke('get_image_data', { imagePath: displayUrl }) as string;
          } catch (error) {
            console.error('Failed to get image data for pasted image:', error);
            displayUrl = displayUrl.startsWith('/') ? `${API_BASE}${displayUrl}` : `${API_BASE}/${displayUrl}`;
          }
        }

        const newItem: MoodboardItem = {
          id: result.id || `item_${Date.now()}_${Math.random()}`,
          type: 'image',
          filename: result.filename || filename,
          originalName: result.original_name || file.name,
          content: result.filename || file.name,
          url: result.url,
          x: result.x ?? 50,
          y: result.y ?? 50,
          width: 200,
          height: 200,
          originalWidth: 0,
          originalHeight: 0,
          aspectRatio: 1,
          isWebp: !!(result.filename || filename)?.toLowerCase().endsWith('.webp'),
          createdAt: result.created_at ?? Date.now()
        };

        // Add item
        setItems(prev => [...prev, newItem]);

        // Compute metadata for sizing
        try {
          const img = new Image();
          const metadata = await new Promise((resolve, reject) => {
            img.onload = () => {
              resolve({
                originalWidth: img.naturalWidth,
                originalHeight: img.naturalHeight,
                aspectRatio: img.naturalWidth / img.naturalHeight
              });
            };
            img.onerror = reject;
            img.src = displayUrl;
          }) as { originalWidth: number; originalHeight: number; aspectRatio: number };

          const maxDisplaySize = 400;
          let displayWidth, displayHeight;
          if (metadata.aspectRatio >= 1) {
            displayWidth = maxDisplaySize;
            displayHeight = maxDisplaySize / metadata.aspectRatio;
          } else {
            displayHeight = maxDisplaySize;
            displayWidth = maxDisplaySize * metadata.aspectRatio;
          }

          const updatedItem: MoodboardItem = {
            ...newItem,
            width: displayWidth,
            height: displayHeight,
            originalWidth: metadata.originalWidth,
            originalHeight: metadata.originalHeight,
            aspectRatio: metadata.aspectRatio
          };

          setItems(prev => prev.map(item => item.id === newItem.id ? updatedItem : item));

          const updatedMoodboard = {
            ...moodboard,
            items: moodboard.items.map((item: MoodboardItem) => item.id === newItem.id ? updatedItem : item)
          };
          onMoodboardUpdate(updatedMoodboard);
        } catch (error) {
          console.warn('Failed to get metadata for pasted image:', error);
        }
      } catch (error) {
        console.error('Error processing pasted image:', error);
      }
    };

    try {
      // Try standard clipboardData first
      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          const item: DataTransferItem = items[i];
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              await processFile(file);
              return;
            }
          }
        }
      }

      // Fallback: try async clipboard read (Chromium/Tauri)
      if (typeof navigator !== 'undefined' && (navigator as any).clipboard && (navigator as any).clipboard.read) {
        try {
          const blobs = await (navigator as any).clipboard.read();
          for (const entry of blobs) {
            const imageItem = entry.types?.find((t: string) => t.startsWith('image/'));
            if (imageItem && entry.getType) {
              const fileBlob = await entry.getType(imageItem);
              const file = new File([fileBlob], `clipboard-${Date.now()}.png`, { type: fileBlob.type || 'image/png' });
              await processFile(file);
              return;
            }
          }
        } catch (err) {
          console.warn('Clipboard.read fallback failed:', err);
        }
      }
    } finally {
      pasteInFlightRef.current = false;
    }
  }, [moodboard, onMoodboardUpdate, API_BASE]);

  // Add global paste event listener
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Only handle paste if the moodboard editor is open
      if (!moodboard) return;
      handlePaste(e);
    };

    // Add global paste event listener
    document.addEventListener('paste', handleGlobalPaste);

    // Cleanup
    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, [handlePaste, moodboard]);

  // Handle drag over events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if any of the dragged files are images
    const files = Array.from(e.dataTransfer.files);
    const hasImageFiles = files.some((file: File) => file.type.startsWith('image/'));
    
    if (hasImageFiles) {
      setIsDragOver(true);
    }
  }, []);

  // Handle drag enter events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if any of the dragged files are images
    const files = Array.from(e.dataTransfer.files);
    const hasImageFiles = files.some((file: File) => file.type.startsWith('image/'));
    
    if (hasImageFiles) {
      setIsDragOver(true);
    }
  }, []);

  // Handle drag leave events
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  // Handle drop events for images
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!moodboard) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file: File) => file.type.startsWith('image/'));

    for (const file of imageFiles) {
      // Create a FormData object to upload the image
      const formData = new FormData();
      formData.append('image', file);
      formData.append('moodboardId', moodboard.id);

      try {
        // Upload the image to the server
        const response = await fetch(`${API_BASE}/api/moodboards/${moodboard.id}/upload`, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          
          // Create a new image item
          // Ensure the URL is properly formatted for display
          let displayUrl = result.url;
          if (displayUrl && !displayUrl.startsWith('http') && !displayUrl.startsWith('data:')) {
            // For relative paths, we need to convert them to data URLs using get_image_data
            try {
              displayUrl = await invoke('get_image_data', { imagePath: displayUrl }) as string;
            } catch (error) {
              console.error('Failed to get image data for dropped image:', error);
              // Fallback to constructing a full URL
              displayUrl = displayUrl.startsWith('/') ? `${API_BASE}${displayUrl}` : `${API_BASE}/${displayUrl}`;
            }
          }
          
          const newItem: MoodboardItem = {
            id: `item_${Date.now()}_${Math.random()}`,
            type: 'image',
            content: result.filename,
            url: result.url, // Keep original relative path for database
            x: 50, // Default position
            y: 50,
            width: 200,
            height: 200,
            originalWidth: 0,
            originalHeight: 0,
            aspectRatio: 1,
            isWebp: false,
            createdAt: Date.now()
          };

          // Add the item first with default dimensions
          setItems(prev => [...prev, newItem]);

          // Calculate metadata and update the item
          try {
            const img = new Image();
            const metadata = await new Promise((resolve, reject) => {
              img.onload = () => {
                resolve({
                  originalWidth: img.naturalWidth,
                  originalHeight: img.naturalHeight,
                  aspectRatio: img.naturalWidth / img.naturalHeight
                });
              };
              img.onerror = reject;
              img.src = displayUrl;
            }) as { originalWidth: number; originalHeight: number; aspectRatio: number };
            
            // Calculate display dimensions using the same logic as server-side
            const maxDisplaySize = 400;
            let displayWidth, displayHeight;
            
            if (metadata.aspectRatio >= 1) {
              // Landscape or square
              displayWidth = maxDisplaySize;
              displayHeight = maxDisplaySize / metadata.aspectRatio;
            } else {
              // Portrait
              displayHeight = maxDisplaySize;
              displayWidth = maxDisplaySize * metadata.aspectRatio;
            }

            // Update the item with metadata and proper dimensions
            const updatedItem: MoodboardItem = {
              ...newItem,
              width: displayWidth,
              height: displayHeight,
              originalWidth: metadata.originalWidth,
              originalHeight: metadata.originalHeight,
              aspectRatio: metadata.aspectRatio
            };

            setItems(prev => prev.map(item => item.id === newItem.id ? updatedItem : item));
            
            // Also update the moodboard in the parent component
            if (moodboard) {
              const updatedMoodboard = {
                ...moodboard,
                items: moodboard.items.map((item: MoodboardItem) => item.id === newItem.id ? updatedItem : item)
              };
              onMoodboardUpdate(updatedMoodboard);
            }
          } catch (error) {
            console.warn('Failed to get metadata for dropped image:', error);
            // Item is already added with default dimensions, so it will still display
          }
        } else {
          console.error('Failed to upload dropped image:', response.statusText);
        }
      } catch (error) {
        console.error('Error uploading dropped image:', error);
      }
    }
  }, [moodboard, onMoodboardUpdate, API_BASE]);

  return {
    // State
    items,
    selectedItem,
    editingItem,
    editingContent,
    canvasRef,
    isEditingTitle,
    editingTitle,
    localMoodboard,
    showColorSwatchModal,
    selectedColor,
    showTextModal,
    newTextContent,
    showImageSelectionModal,
    
    // Event handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDeleteItem,
    handleEditItem,
    handleSaveEdit,
    handleEditChange,
    
    // Title editing handlers
    startEditingTitle,
    saveTitleEdit,
    cancelTitleEdit,
    handleTitleChange,
    
    // Color swatch handlers
    openColorSwatchModal,
    closeColorSwatchModal,
    handleColorChange,
    handleAddColorSwatch,
    
    // Sticky note handlers
    handleAddStickyNote,
    handleTextModalSubmit,
    handleTextModalClose,
    handleTextContentChange,
    
    // Image selection handlers
    openImageSelectionModal,
    closeImageSelectionModal,
    handleImageSelect,
    
    // Drag and drop handlers
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    isDragOver,

    // Clipboard paste handler
    handlePaste,
    
    // Save function
    saveMoodboard,
    
    // Performance monitoring
    logPerformanceMetrics: () => {
      // performanceMonitor.logMetrics();
      console.log('Performance monitoring temporarily disabled');
    },
    
    getPerformanceMetrics: () => {
      // return performanceMonitor.getMetrics();
      return { imageLoadTime: 0, dragLatency: 0, saveTime: 0, memoryUsage: 0, frameRate: 0 };
    }
  };
};
