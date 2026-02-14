# Artwork Journal Component

## Overview
Local-first gallery for inspiration images. Supports uploads (picker/drag-drop/phone), Windows scanner ingest, reference linking/compare, rotation, sorting, and prompt-aware uploads from the Inspiration Board tab. Thumbnails are cached; full images are prefetched around the active item for smooth viewing. Modular architecture with dedicated hooks (12+) and components for maintainability.

## Features

### ✨ Core Functionality
- Upload via file picker, drag/drop, or phone (QR code); Inspiration tab can upload with the current prompt attached.
- Phone upload with local network server, QR code generation, auto-expiring tokens.
- Windows-only scan flow (list scanners, scan, optional crop, then save).
- Grid gallery with newest/oldest sort.
- Full-screen viewer with keyboard navigation, rotation persistence, and adjacent prefetch.
- Delete with confirmation modal.
- Reference linking/unlinking to Idea Vault; draggable preview and compare modal.

### 🎨 User Experience
- Responsive layout with drag-over affordances and empty/error states.
- Loading indicators for gallery and full-resolution fetch.
- Hover/inline actions for delete, link/unlink, compare.
- Custom event `photo-journal-uploaded` fired after upload for listeners.

### 📱 Interface Elements
- Upload + Scan controls (scan disabled while busy).
- Sort select (newest/oldest).
- Gallery grid cards with metadata (date, size, prompt).
- Viewer controls: next/prev, rotate, link/unlink, compare, hide/show linked preview.
- Modals: Delete, Reference Picker, Compare, Crop (post-scan).

## Architecture

### Component Structure

```
Photo_journal/
├── Photo_journal.tsx              # Main container/orchestrator
├── Photo_journal.css              # Styling
├── Photo_journal_scan_modal.css   # Scan modal styles
├── utils.ts                       # Formatters (date, file size)
├── components/                    # Presentational subcomponents
│   ├── GalleryItem.tsx            # Grid item card
│   ├── ImageViewer.tsx            # Full-screen viewer
│   ├── DeleteModal.tsx            # Delete confirmation
│   ├── CompareModal.tsx           # Reference comparison
│   ├── ReferencePickerModal.tsx   # Reference linking picker
│   ├── CropModal.tsx              # Scan crop modal
│   ├── PhoneUploadModal.tsx       # Phone upload QR code modal
│   ├── ScannerModal.tsx           # Scanner selection modal
│   └── LoadingState.tsx           # Loading spinner
└── hooks/                         # Feature hooks
    ├── index.ts                   # Hook exports
    ├── usePhotoJournal.ts         # Core CRUD & state
    ├── useFullImageLoading.ts     # Full-res image loading
    ├── useImageViewer.ts          # Viewer open/close/nav
    ├── useDeleteModal.ts          # Delete modal state
    ├── useDragAndDrop.ts          # Drag-drop handlers
    ├── useUpload.ts               # Upload state/errors
    ├── useReferenceLinking.ts     # Reference link/unlink
    ├── useScanWorkflow.ts         # Scanner workflow
    ├── usePhoneUpload.ts          # Phone upload QR/token management
    ├── useSortedImages.ts         # Image sorting logic
    ├── useImagePreloading.ts      # Viewer adjacent preloading
    └── useKeyboardNavigation.ts   # Viewer keyboard controls
```

### Custom Hooks

Location: `src/components/Photo_journal/hooks`

| Hook | Responsibility |
|------|----------------|
| `usePhotoJournal` | Fetches images and thumbnails, handles delete and rotation persistence, manages list state and errors |
| `useImageViewer` | Manages viewer open/close, index, and cyclic navigation |
| `useDeleteModal` | Tracks image pending deletion and modal visibility |
| `useDragAndDrop` | Drag-over state and handlers for drop-to-upload |
| `useUpload` | Upload state/errors; reuses service upload; integrates with drag/drop and picker |
| `useFullImageLoading` | Lazily loads full-res data URLs, tracks loading map |
| `useReferenceLinking` | Loads references + thumbnails, link/unlink, draggable overlay, compare modal support |
| `useScanWorkflow` | Lists scanners (Windows), triggers scan, manages crop modal, forwards upload to gallery |
| `usePhoneUpload` | Phone upload server toggle, QR code generation, token lifecycle, auto-expiration |
| `useSortedImages` | Image sorting by upload date (newest/oldest) with memoization |
| `useImagePreloading` | Preloads current + adjacent images for smooth viewer navigation |
| `useKeyboardNavigation` | Handles arrow keys and Escape for viewer navigation |

### Components Organization

| Component | Responsibility |
|-----------|----------------|
| `GalleryItem` | Individual image card with metadata and actions |
| `ImageViewer` | Full-screen viewer with rotation, linking, comparison |
| `DeleteModal` | Confirmation dialog for image deletion |
| `CompareModal` | Side-by-side photo/reference comparison |
| `ReferencePickerModal` | Grid for selecting reference to link |
| `CropModal` | Post-scan crop selection |
| `PhoneUploadModal` | QR code display for phone uploads |
| `ScannerModal` | Scanner device and page size selection |
| `LoadingState` | Loading spinner placeholder |

### Data Flow

1. **Service Layer**: `PhotoJournalService` wraps Tauri commands for images, thumbnails, rotation, linking, and scanning.
2. **State Management**: Hooks above manage gallery/viewer/upload/linking/scan state.
3. **Events**: `photo-journal-uploaded` custom event dispatched after upload for other tabs to refresh.
4. **UI Updates**: Optimistic delete/rotation; viewer fetches full image on open and preloads neighbors.

## API Integration

### PhotoJournalService Methods (via Tauri)

```typescript
getImages(): Promise<PhotoJournalImage[]>
uploadImage(file: File, prompt?: string): Promise<PhotoJournalImage>
deleteImage(id: string): Promise<void>
setRotation(id: string, rotation: number): Promise<PhotoJournalImage>
getImageUrl(image: PhotoJournalImage): Promise<string>
getThumbnailUrl(image: PhotoJournalImage): Promise<string>
clearThumbnails(): Promise<void>
linkReference(photoId: string, referenceId: string): Promise<void>
unlinkReference(photoId: string): Promise<void>
// Scanner helpers (Windows)
scanArtwork(): Promise<ScannedImage[]>
listScanners(): Promise<ScannerInfo[]>
scanWithDevice(deviceId: string, pageSize?: 'A4' | 'A5', dpi?: number): Promise<ScannedImage>
```

### PhotoJournalImage Interface

```typescript
interface PhotoJournalImage {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  upload_date: string;
  size: number;
  mimetype: string;
  prompt?: string;
  referenceId?: string | null;
  rotation?: number;
}
```

## Styling

### Design System
- **Color Scheme**: Dark theme with gradient accents
- **Typography**: System fonts with proper hierarchy
- **Spacing**: Consistent grid system and padding
- **Animations**: Smooth transitions and hover effects
- **Responsive Grid**: Adaptive layout for different screen sizes

### CSS Classes

#### Layout
- `.gallery-container`: Main container with drag-drop support
- `.gallery-header`: Header with title and description
- `.controls-row`: Controls section with sort and upload
- `.gallery-content`: Content area for grid display

#### Gallery Items
- `.gallery-item`: Individual image card
- `.image-container`: Image wrapper with overlay
- `.gallery-image`: Main image display
- `.image-overlay`: Hover overlay with delete button
- `.image-info`: Image metadata display

#### Controls
- `.sort-section`: Sorting controls container
- `.sort-select`: Dropdown for sort options
- `.upload-section`: Upload controls container
- `.upload-button`: Styled upload button with gradients

#### Viewer
- `.image-viewer-modal`: Full-screen viewer container
- `.viewer-close-button`: Close button for viewer
- `.viewer-image-info`: Image metadata in viewer
- `.viewer-main-image-container`: Main image display area
- `.viewer-navigation`: Navigation controls

#### Modals
- `.delete-modal-overlay`: Modal backdrop
- `.delete-modal-content`: Modal content container
- `.delete-modal-buttons`: Modal action buttons

#### States
- `.photo-journal-loading`: Loading state container
- `.error-message`: Error state display
- `.empty-gallery`: Empty state messaging

## Usage

### Basic Implementation

```tsx
import Photo_journal from './components/Photo_journal/Photo_journal';

function App() {
  return (
    <div>
      <Photo_journal />
    </div>
  );
}
```

### Integration with Main App

The Photo Journal component is designed to be used as a standalone tab:

```tsx
// In App.tsx or main navigation
{activeTab === 'gallery' && (
  <Photo_journal />
)}
```

## File & Scan Ingest

- File picker: "Upload Image" button (common image formats).
- Drag & drop: drop onto gallery with visual highlight.
- From Inspiration tab: hidden input upload with prompt attached when available.
- Phone upload: enable local server, scan QR code, upload from mobile device over Wi-Fi.
- Scanner (Windows): list devices, choose page size, start scan, optional crop, then upload.

### Keyboard Shortcuts (viewer)
- Escape: close viewer
- Arrow Left/Right or Space: navigate

## Image Viewer Features

### Full-Screen Experience
- Prev/next, counter, metadata (date, prompt, rotation).
- Rotate with backend persistence.
- Linked reference preview overlay (draggable), hide/show, unlink, compare modal.
- Adjacent prefetch of full-res images with retries if missing.

### Performance Notes
- Thumbnails for grid; full-res fetched lazily in viewer.
- Neighbor prefetch for smooth nav.
- Cleanup listeners on unmount; retry loop for missing data URLs.

## Error Handling

### Network Errors
- **Connection Issues**: Graceful fallback with retry options
- **Upload Failures**: Clear error messages with suggestions
- **Delete Failures**: Rollback UI state on failure

### User Feedback
- **Loading States**: Visual indicators during operations
- **Error Messages**: Clear, actionable error descriptions
- **Success Feedback**: Confirmation of successful operations

## Future Enhancements

### Planned Features
- Search/filter by prompt/tag (currently sort only).
- Bulk actions (multi-select delete/link).
- More editing tools beyond rotation (crop for existing images).
- Optional cloud sync if added later.

## Performance Considerations

### Optimization Strategies
- **Memoization**: React.memo for gallery items
- **Debouncing**: Optimize frequent operations
- **Lazy Loading**: Load images on demand
- **Virtual Scrolling**: For large collections

### Best Practices
- **Error Boundaries**: Catch and handle errors gracefully
- **Loading States**: Provide feedback during operations
- **Accessibility**: ARIA labels and keyboard navigation
- **Mobile First**: Responsive design considerations

## Testing

### Component Testing
- Unit tests for utility functions
- Integration tests for API calls
- User interaction testing
- Error scenario testing

### Manual Testing Checklist
- Upload via picker and drag/drop (with prompt from Inspiration if applicable).
- Phone upload: enable server, scan QR, upload from phone, verify image appears.
- Scan flow: list devices, scan, optional crop, saved image appears.
- Viewer: rotate persists; prefetch works; keyboard nav works.
- Link/unlink references; draggable preview; compare modal.
- Sort toggle (newest/oldest) reflected in grid and viewer order.
- Delete confirmation removes item and closes viewer if open.

## Dependencies

### Required Dependencies
- React 18+
- TypeScript
- PhotoJournalService (internal service)

### Optional Dependencies
- React Router (for navigation)
- React Query (for caching)
- Image optimization libraries

## Contributing

### Development Guidelines
1. Follow TypeScript best practices
2. Use functional components with hooks
3. Implement proper error handling
4. Add loading states for async operations
5. Maintain consistent styling patterns
6. Write comprehensive tests

### Code Style
- Use TypeScript for type safety
- Implement proper prop interfaces
- Use meaningful component and variable names
- Add JSDoc comments for complex functions
- Follow React best practices

## Troubleshooting

### Common Issues

#### Images Not Loading
- Check API endpoint configuration
- Verify PhotoJournalService is properly imported
- Check browser console for errors
- Ensure proper CORS configuration

#### Upload Not Working
- Verify network connectivity
- Check file size limits
- Ensure proper file type validation
- Check API response status

#### Viewer Not Opening
- Check image URL construction
- Verify PhotoJournalService configuration
- Ensure proper event handling
- Check for JavaScript errors

### Debug Tips
- Use React DevTools for state inspection
- Check Tauri console for API calls
- Add console.logs for debugging
- Test with different image formats and sizes

## Desktop App Support

### System Requirements
- Windows 10/11
- macOS 10.15+
- Linux (Ubuntu 18.04+)

### Required Features
- Tauri runtime
- File system access
- File API
- Drag and Drop API
- CSS Grid

---

Last updated: 2026-02-04
