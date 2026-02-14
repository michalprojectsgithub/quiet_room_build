# Master Study Viewer - Implementation

## Overview
The Master Study Viewer is a **cloned and customized** version of the References viewer, specifically designed for viewing master artworks in the Study Room tab.

## Why a Separate Clone?
- Allows independent customization without affecting References viewer
- Can add master study-specific features (artist info, technique details, etc.)
- Maintains same tool functionality (zoom, pan, grid, measurement, loupe)
- Keeps references viewer stable while master studies evolves

## Component Structure

```
Study_room/
├── MasterStudies.tsx           # Main grid and navigation
├── MasterStudyViewer.tsx        # Cloned fullscreen viewer
├── Study_room.css               # Styles (includes master-study-* classes)
└── MASTER_STUDY_VIEWER_README.md # This file
```

## Files Created

### `MasterStudyViewer.tsx`
- **Purpose**: Fullscreen viewer component for master artworks
- **Reuses**: `ReferenceViewerLeftPane` for all the tools (grid, zoom, pan, loupe, measurement)
- **Custom**: Right panel for artwork details (can be expanded)
- **Props**: Simplified interface with only necessary props

### Key Features
1. ✅ Full zoom and pan controls
2. ✅ Grid overlay
3. ✅ Measurement tools
4. ✅ Loupe/magnifier
5. ✅ Keyboard navigation (← → arrows, Escape)
6. ✅ Export image
7. ✅ Print functionality
8. ✅ Open in new window
9. ⚠️ Rotation disabled (master studies are read-only)
10. ⚠️ Crop disabled (master studies are read-only)

## Usage in MasterStudies.tsx

```tsx
{viewerOpen && currentReference && (
  <MasterStudyViewer
    reference={currentReference}
    imageUrl={getFullUrl(currentList[viewerIndex])}
    isLoading={false}
    currentIndex={viewerIndex}
    totalReferences={currentList.length}
    onClose={handleCloseViewer}
    onNext={handleNext}
    onPrev={handlePrev}
  />
)}
```

## Keyboard Shortcuts
- **Escape** - Close viewer
- **Arrow Left** - Previous artwork
- **Arrow Right** - Next artwork
- **All viewer tools shortcuts** - Same as References viewer

## Customization Examples

### Adding Artist Biography
Edit `MasterStudyViewer.tsx`, right panel:

```tsx
<div className="references-note-section">
  <div className="references-note-header">Artist Biography</div>
  <div className="references-note-body">
    {/* Add artist bio here */}
  </div>
</div>
```

### Adding Technique Information
```tsx
<div className="references-note-section">
  <div className="references-note-header">Technique Analysis</div>
  <div className="references-note-body">
    {/* Add technique details */}
  </div>
</div>
```

### Adding Museum Links
```tsx
{reference.sourceUrl && (
  <a href={reference.sourceUrl} target="_blank" rel="noopener noreferrer">
    View at Museum
  </a>
)}
```

## Styling

### Custom CSS Classes
Located in `Study_room.css`:

- `.master-study-viewer` - Main viewer wrapper
- `.master-study-info-panel` - Right panel container
- `.master-study-detail-row` - Detail row layout
- `.master-study-detail-label` - Label styling
- `.master-study-detail-value` - Value styling

### Inherits from References
Most styling comes from `References.css`:
- `.references-viewer` - Base viewer styles
- `.references-viewer-left` - Left pane with image
- `.references-viewer-right` - Right pane container
- `.references-viewer-arrow` - Navigation arrows
- All tool-specific styles

## Future Enhancements

### Planned Features
1. **Artist Information**
   - Biography section
   - Other works by artist
   - Art movement context

2. **Technique Analysis**
   - Composition breakdown
   - Color palette analysis
   - Brushwork details

3. **Study Tools**
   - Side-by-side comparison
   - Overlay reference sketch
   - Study timer integration

4. **Educational Content**
   - Composition guides overlays
   - Golden ratio guides
   - Rule of thirds overlay

5. **Annotations**
   - Personal study notes
   - Analysis markup
   - Screenshot/crop tools

## Differences from References Viewer

| Feature | References Viewer | Master Study Viewer |
|---------|-------------------|---------------------|
| Rotation | ✅ Enabled | ❌ Disabled (read-only) |
| Crop | ✅ Enabled | ❌ Disabled (read-only) |
| Delete | ✅ Enabled | ❌ Disabled (read-only) |
| Tags | ✅ Enabled | ❌ Not applicable |
| Notes | ✅ Enabled | 🔄 Different format (artwork info) |
| Source | ✅ Enabled | 🔄 Museum link instead |
| Tools | ✅ All enabled | ✅ All enabled |

## Development Notes

- The left pane (`ReferenceViewerLeftPane`) is **shared** with References
- Any changes to the left pane tools will affect both viewers
- The right pane is **independent** and can be fully customized
- Uses same CSS classes for consistency but can be overridden

## Testing Checklist

- [ ] Click artwork thumbnail opens viewer
- [ ] All zoom/pan tools work
- [ ] Grid overlay toggles correctly
- [ ] Measurement tools functional
- [ ] Loupe/magnifier works
- [ ] Arrow key navigation works
- [ ] Escape closes viewer
- [ ] Export image works
- [ ] Print functionality works
- [ ] Open in new window works
- [ ] Right panel displays artwork info
- [ ] Navigation cycles through correct list (respects filters)

---

Last updated: 2026-01-12
