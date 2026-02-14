# Moodboards Component

## Overview
Lists moodboards and opens the editor. Uses Tauri-backed `MoodboardService` for CRUD. Preview cards convert stored relative paths to data URLs for display. Editor supports image/text/color items with simple modals.

## Current behavior
- Load moodboards on mount; optional `refreshSignal` forces reload (used when created from Inspiration).
- Create moodboard modal; delete with confirmation.
- Open editor to edit items; updates reflected in list after save.
- Previews: first few items rendered; image paths corrected to `get_image_data` data URLs.

## File structure
```
Moodboards/
├── Moodboards.tsx          # List + create/delete/open
├── Moodboards.css
├── Moodboard_editor.tsx    # Editor UI/logic
├── Moodboard_editor.css
├── MoodboardItem.tsx
├── ColorSwatchModal.tsx
├── TextModal.tsx
├── ImageSelectionModal.tsx
├── ImageSelectionModal.css
└── hooks/
    ├── useMoodboardEditor.ts
    └── useKeyboardShortcuts.ts
```

## Services / data
- `MoodboardService` (wraps Tauri commands): `getMoodboards`, `createMoodboard`, `updateMoodboard`, `deleteMoodboard`, `updateMoodboardItem`.
- Items support types `image | text | color`; editor stores positions/sizes and optional colors/palettes.
- Paths stored relative (e.g., `references/...`, `photo_journal/...`); list view resolves to data URLs for preview only.

## User flows (manual check)
- Create moodboard → appears at top of list.
- Delete moodboard → removed from list.
- Open editor → edit items → save updates list preview.
- Images originating from references/photo journal load in previews (path fix works).

---
Last updated: 2026-01-11
