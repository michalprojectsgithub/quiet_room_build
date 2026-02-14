# Notes Component

## Overview
Simple note list + modal editor inside Idea Vault. Uses `NotesService` (Tauri) for CRUD. Autosaves on change; shows relative timestamps; delete requires confirmation.

## Current behavior
- Load notes on mount.
- Create blank note → opens modal in edit mode.
- Edits persist as you type (title + content).
- Delete modal with confirmation.
- Escape closes modal.

## Structure
```
Notes/
├── Notes.tsx
├── Notes.css
└── README.md
```

## Service surface (NotesService)
```ts
getNotes(): Promise<Note[]>
createNote(title?: string, content?: string): Promise<Note>
updateNote(id: string, updates: { title?: string; content?: string }): Promise<Note>
deleteNote(id: string): Promise<void>
```

## Note shape
```ts
interface Note {
  id: string;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}
```

## Manual checks
- Create note; modal opens; edits persist.
- Delete removes from list.
- Escape closes modal.
- Empty state renders when no notes.

---
Last updated: 2026-01-11
