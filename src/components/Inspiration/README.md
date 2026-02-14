# Inspiration Board

## Overview
The Inspiration Board is the main creative hub for the Drawing Inspiration app. It contains two sub-tabs:

1. **Warm-ups** - Quick warm-up exercises with reference images and a timed practice timer
2. **Drawing Suggestions** - Prompt roulette for generating drawing ideas, with category filters, saved prompts, and color palettes

## Sub-tabs

### Warm-ups
Imported from `../Study_room/Warmups.tsx`. Features:
- Reference images loaded from the library's warmups collection
- Configurable countdown timer (1-60 minutes)
- Auto-switch mode to automatically advance when timer expires
- Fullscreen mode for distraction-free practice
- Previous/Next navigation with history

### Drawing Suggestions
The original prompt-based inspiration features:
- Prompt roll with category filter (`useInspiration`, `inspirationData.ts`)
- Saved prompts (persisted via Tauri storage key `drawing-inspo-saved`)
- Prompt history with navigation (persisted via `drawing-inspo-history`)
- Color palette generator/toggle (randomized palettes from predefined schemes)
- Quick actions:
  - Google Images search for the current prompt (Tauri `open_url_in_chrome` fallback to `window.open`)
  - Create moodboard seeded with current prompt (delegated to parent callback)
  - Start Focus Mode (delegated to parent callback; consumes selected index)
- Saved prompts modal with actions: create moodboard, search references, remove prompt

## Component Layout
```
Inspiration/
├── Inspiration.tsx      # Main UI with sub-tab navigation
├── Inspiration.css      # Styles (including sub-tab styles)
├── Focus_mode.tsx       # Full-screen focus viewer
├── hooks/               # useInspiration, useSavedPrompts, usePromptHistory, useColorPalette
├── components/          # CategoryFilter, FocusModeButton, InspirationDisplay, ColorPaletteSection, SavedPromptsModal
├── inspirationData.ts   # Categories, prompt list, helper for nextIndex
└── README.md            # This file

# Warmups component imported from:
../Study_room/Warmups.tsx
```

## Data & State
- Prompts: in-memory constants from `inspirationData.ts` (`INSPIRATIONS`, `CATEGORIES`).
- Index: `index` is held by the parent (`App.tsx`) and passed down; `useInspiration` rolls and resets it on category change.
- Saved prompts/history: stored via `TauriService.get/setStorageValue` (keys above), loaded on mount, persisted on change.
- Palettes: generated client-side; not persisted.
- Search: builds a Google Images URL; uses Tauri command when available.

## Key Props (Inspiration.tsx)
- `onStartFocusMode()`: enter focus mode (ignored if no prompt selected).
- `createMoodboardFromInspiration(prompt: string)`: delegate to Idea Vault creation flow.
- `index: number | null`: active prompt index (managed by parent).
- `setIndex(index: number | null)`: setter from parent.

## User Flows
- Roll: press "✨ New Inspiration" → updates `index`, clears history cursor.
- Save: click bookmark icon → adds to saved list; modal opened via topbar icon.
- History nav: prev/next arrows cycle history list; selecting history sets prompt index.
- Palette: toggle palette chip → generates palette if closed; “Generate palette” button refreshes.
- Search: magnifier button triggers Google image search for current prompt.
- Moodboard: “Create moodboard” button invokes parent callback with prompt.
- Focus mode: available when a prompt is selected; handled by parent.

## Testing Checklist (manual)
- Roll prompts and verify category filter resets index.
- Save/remove prompts; reopen modal; persistence across reload.
- History navigation (back/forward) loads prompts correctly.
- Palette toggle and regeneration.
- Google search opens in Tauri; web fallback opens new tab.
- Moodboard creation callback invoked with current prompt.
- Focus mode only starts when a prompt is selected.

## Future Improvements
- Optional keyboard shortcuts for roll/history (currently button-only).
- Allow custom prompt entry and seeding.
- Inline search providers beyond Google Images.
- Persist palette selections or allow manual palettes.
- Better empty states when Tauri storage unavailable.

---
Last updated: 2026-01-11
