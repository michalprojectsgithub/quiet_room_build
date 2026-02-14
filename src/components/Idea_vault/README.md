# Idea Vault Component

## Overview
Tabbed hub for creative assets inside the app. Bundles three areas: Moodboards (visual canvases), Notes (text scratchpad), and References (image library). The parent handles tab state and passes Tauri-backed services/props to children.

## What it does today
- Tabbed navigation (`moodboards`, `notes`, `references`) with ARIA-friendly buttons.
- Passes `API_BASE` and optional `moodboardsRefreshToken` down; respects `disabled`.
- Minimal parent state: active tab only; feature logic lives in each submodule.

## Structure
```
Idea_vault/
├── Idea_vault.tsx      # Parent tabs/props routing
├── Idea_vault.css
├── Moodboards/         # Moodboards tab
├── Notes/              # Notes tab
└── References/         # References tab
```

## Props
```ts
interface Idea_vaultProps {
  API_BASE: string;
  className?: string;
  disabled?: boolean;
  moodboardsRefreshToken?: number; // triggers reload when set
}
```

## Sub-tabs (current behavior)
- **Moodboards (🎨)**: Lists moodboards, create/delete, open editor; uses `MoodboardService` (Tauri) and fixes image paths to data URLs for previews.
- **Notes (📝)**: Simple note CRUD with autosave-as-you-type; uses `NotesService` (Tauri).
- **References (🔗)**: Foldered reference manager with uploads (picker/drag-drop/paste/phone), tag filtering (AND/OR), fullscreen viewer with rotation/crop, and folder CRUD. Modular architecture with dedicated hooks (15+) and components. See `References/README.md` for details.

## Usage
```tsx
<Idea_vault
  API_BASE={isTauri ? "tauri://localhost" : "http://127.0.0.1:8787"}
  moodboardsRefreshToken={refreshToken}
/>
```

## Testing notes (manual)
- Switch tabs and confirm content renders and ARIA states update.
- Moodboards: create/delete/open; verify previews render; editor saves updates.
- Notes: create note, edits persist, delete modal works.
- References: upload/drag-drop, folder nav, tag filter, viewer open/close.

---
Last updated: 2026-02-04
