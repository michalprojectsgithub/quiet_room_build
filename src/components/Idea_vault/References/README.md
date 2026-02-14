# References Component

## Overview
Foldered image library for Idea Vault. Supports uploads (picker/drag-drop/paste/file-drop/phone), folder CRUD/navigation, tag filtering (AND/OR), and a fullscreen viewer with rotation/crop persistence. Uses Tauri commands via `ReferencesService`/`TauriService`.

## Structure
```
References/
├── References.tsx          # Main controller (orchestrates hooks and components)
├── References.css
├── types.ts
├── utils.ts
├── components/
│   ├── index.ts            # Component exports
│   ├── ReferencesHeader.tsx
│   ├── ReferencesGrid.tsx
│   ├── ReferenceItem.tsx
│   ├── FolderItem.tsx
│   ├── DragDropOverlay.tsx
│   ├── UploadingPlaceholder.tsx
│   ├── FileUploadButton.tsx
│   ├── DeleteModal.tsx
│   ├── FolderModal.tsx
│   ├── FolderDeleteModal.tsx
│   ├── ReferenceViewer.tsx
│   ├── ViewerRightPanel.tsx
│   ├── PhoneUploadModal.tsx   # Phone upload QR code modal
│   ├── LoadingState.tsx       # Loading spinner UI
│   └── ErrorState.tsx         # Error display UI
├── hooks/
│   ├── index.ts               # Hook exports
│   ├── useReferences.ts       # Core CRUD & folder state
│   ├── useReferenceViewer.ts  # Viewer open/close/nav state
│   ├── useFullImageLoading.ts # Full-res image loading with caching
│   ├── useCustomDragAndDrop.ts
│   ├── useTauriFileDrop.ts
│   ├── useClipboardPaste.ts
│   ├── useFileUpload.ts
│   ├── useGlobalMouseUpReset.ts
│   ├── useFolderModal.ts
│   ├── useFolderDeleteModal.ts
│   ├── useDeleteModal.ts
│   ├── useTagFiltering.ts
│   ├── useViewerKeyboardShortcuts.ts
│   ├── usePhoneUpload.ts      # Phone upload toggle, QR code generation, token management
│   ├── useViewerOverrides.ts  # Viewer note/tags/rotation/crop overrides
│   ├── useTagEventListeners.ts # Global tag event synchronization
│   └── useViewerImagePreloading.ts # Viewer adjacent image preloading with retry
└── README.md
```

## Architecture
The main `References.tsx` is a thin orchestration layer that:
1. Imports and composes multiple custom hooks for distinct concerns
2. Imports presentational components for UI rendering
3. Wires up event handlers and passes state/callbacks to children

### Hooks Organization
| Hook | Responsibility |
|------|----------------|
| `useReferences` | Core reference/folder CRUD, uploads, state management |
| `useReferenceViewer` | Viewer open/close, index navigation |
| `useFullImageLoading` | Full-resolution image URL loading with caching |
| `usePhoneUpload` | Phone upload server toggle, QR code generation, token lifecycle |
| `useViewerOverrides` | Optimistic UI updates for note/tags/rotation/crop in viewer |
| `useTagEventListeners` | Global event listeners for tag synchronization |
| `useViewerImagePreloading` | Preloads current + adjacent images with retry mechanism |
| `useTagFiltering` | Tag selection, filter mode (AND/OR), filtered list computation |
| `useCustomDragAndDrop` | Reference drag-to-folder behavior |
| `useTauriFileDrop` | OS-level file drop handling |
| `useClipboardPaste` | Ctrl+V image paste handling |
| `useFileUpload` | File picker upload handling |
| `useViewerKeyboardShortcuts` | Arrow/Escape keyboard navigation |
| `useGlobalMouseUpReset` | Cleanup for drag operations |

### Components Organization
| Component | Responsibility |
|-----------|----------------|
| `ReferencesHeader` | Toolbar with back button, tag filter, upload buttons |
| `ReferencesGrid` | Masonry grid of folders and reference items |
| `ReferenceItem` | Single reference thumbnail with context actions |
| `FolderItem` | Folder card with drop target |
| `ReferenceViewer` | Fullscreen viewer with image + right panel |
| `ViewerRightPanel` | Tags, notes, source, rotation, crop controls |
| `PhoneUploadModal` | QR code display for phone upload |
| `LoadingState` | Loading spinner placeholder |
| `ErrorState` | Error message display |
| `DeleteModal`, `FolderModal`, `FolderDeleteModal` | Confirmation dialogs |
| `DragDropOverlay` | Visual feedback during drag operations |

## Current capabilities
- Upload: picker, drag/drop, OS file-drop, clipboard paste, phone (QR/local network); targets current folder or root.
- Folders: create/delete, navigate into/back, move images via drag/drop.
- Tags: list/add/remove/set/rename/delete-everywhere; filter modes OR/AND with cross-folder support.
- Viewer: lazy-load full image, prefetch neighbors, rotation/crop persistence, notes/source text, tag edits, keyboard nav.
- Thumbnails: generated on demand via Tauri; used in grids and modals.
- Phone Upload: Local network server with QR code, auto-expiring tokens, real-time sync.

## Services / commands
- `ReferencesService` calls `TauriService` invocations: `get_references`, `upload_reference`, `delete_reference`, `move_reference`, `get_folders`, `create_folder`, `delete_folder`, `get_image_data`, `get_thumbnail_data`, tag commands, `set_reference_rotation`, `set_reference_crop`, image notes/source helpers.
- `TauriService.getPhoneUploadStatus/setPhoneUploadEnabled/getPhoneUploadInfo` for phone upload server.

## Disk layout (Tauri)
- `library/users/<user>/references/main/` — loose images
- `library/users/<user>/references/folders/<physicalPath>/` — foldered images
- `library/users/<user>/references/thumbnails/` — cached thumbs
- `references.json` / `folders.json` — metadata

## Manual checks
- Upload to root and folder; verify thumbnail appears.
- Drag image into folder; back nav works.
- Tag add/remove; filter in OR and AND modes; viewer respects filter order.
- Rotate/crop in viewer persists after refresh.
- Delete reference/folder updates list and metadata.
- Phone upload: enable server, scan QR, upload from phone, verify image appears.

---
Last updated: 2026-02-04