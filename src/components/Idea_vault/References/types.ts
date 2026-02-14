export interface Reference {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  created_at: number;
  location?: string;
  folder_id?: string;
  tags?: string[];
  image_note?: { text: string; updatedAt: number } | null;
  image_source?: { text: string; updatedAt: number } | null;
  rotation?: number; // degrees clockwise, typically 0/90/180/270
  crop?: { x: number; y: number; w: number; h: number } | null; // normalized (0..1) in original image space
}

export interface Folder {
  id: string;
  name: string;
  created_at: number;
  color?: string; // Optional folder color for visual distinction
  physicalPath?: string;
}

export interface ReferencesProps {
  ideaVaultTab: 'moodboards' | 'notes' | 'references';
  API_BASE: string;
}

export interface ReferenceItemProps {
  reference: Reference;
  imageUrl: string;
  index: number;
  API_BASE: string;
  onView: (index: number) => void;
  onDelete: (id: string) => void;
  onAddTag?: (reference: Reference, tag: string, op: 'add' | 'remove') => void;
  folderId?: string; // Optional folder ID for folder images
  onDragStart?: (reference: Reference) => void; // Optional drag handler
  draggable?: boolean; // Whether the item is draggable
  isGloballyDragging?: boolean; // Whether this item is being dragged globally
}

export interface FolderItemProps {
  folder: Folder;
  onDelete: (folder: Folder) => void;
  onClick: (folderId: string) => void;
  onDragOver?: (e: React.MouseEvent, folderId: string) => void; // Optional drag over handler
  onDragLeave?: (e: React.MouseEvent) => void; // Optional drag leave handler
  onDrop?: (e: React.MouseEvent, folderId: string) => void; // Optional drop handler
}

export interface DeleteModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export interface FolderModalProps {
  folderName: string;
  setFolderName: (name: string) => void;
  onCreate: () => void;
  onCancel: () => void;
}

export interface FolderDeleteModalProps {
  folder: Folder;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface ReferenceViewerProps {
  reference: Reference;
  imageUrl: string;
  isLoading: boolean;
  currentIndex: number;
  totalReferences: number;
  API_BASE: string;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  formatDate: (timestamp: number) => string;
  folderId?: string; // Optional folder ID for folder images
  onDelete?: (referenceId: string) => void;
  onNoteChange?: (referenceId: string, note: { text: string; updatedAt: number } | null) => void;
  onSourceChange?: (referenceId: string, source: { text: string; updatedAt: number } | null) => void;
  onTagsChange?: (referenceId: string, tags: string[]) => void;
  onToggleItemTag?: (reference: Reference, tag: string, op: 'add' | 'remove') => Promise<void> | void;
  onRotationChange?: (referenceId: string, rotation: number) => void;
  onCropChange?: (referenceId: string, crop: { x: number; y: number; w: number; h: number } | null) => void;
}
