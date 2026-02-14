# Quiet room

A Tauri-based desktop application that combines a prompt inspiration tab with local creative organization tools for drawing inspiration.

## Features

### ✨ Inspiration Board
- **Warm-ups**: Quick warm-up exercises with reference images and a timed practice timer
- **Drawing Suggestions**: Roll curated prompts by category, save favorites, search Google Images, create moodboards, and enter focus mode

### 📸 Photo Journal
- Upload via picker or drag-and-drop; optional prompt attached from Inspiration
- Windows scanner ingest with optional crop
- Organized gallery with upload dates, file info, and rotation
- Link/unlink references, view full screen, compare, and delete

### 🎯 References Management
- Organize reference images in folders
- Drag and drop interface for easy organization
- Quick access to inspiration materials

### 📝 Notes & Moodboards
- Take notes and organize ideas
- Create visual moodboards with images and text
- Color palette extraction from images

### 🧠 Practice Corner
- Master Studies for studying reference works
- Live Study for timed video-based practice sessions

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Rust (for Tauri development)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) If you add external APIs later, place keys in a `.env` file.

### Running the Application

#### Development Mode
```bash
npm run tauri:dev
```

#### Building for Production
```bash
npm run tauri:build
```

The built application will be available in `src-tauri/target/release/`

## Usage

### Inspiration Board
1. Click on the "Inspiration Board" tab
2. Choose between "Warm-ups" or "Drawing Suggestions" sub-tabs
3. **Warm-ups**: View reference images with a timer for timed practice
4. **Drawing Suggestions**: Pick a category, press "New Inspiration" to roll a prompt, and use quick actions like Google search or moodboard creation

### Photo Journal
1. Click on the "Photo Journal" tab
2. Upload via "Upload Image" (or drag/drop); optional prompt comes from Inspiration upload
3. On Windows, use "Scan Artwork" to ingest from a connected scanner (with crop)
4. Open images to rotate, link/unlink a reference, compare, or delete

### References
1. Click on the "Idea Vault" tab, then "References"
2. Organize images in folders for easy access
3. Drag and drop images to organize your collection

### Notes & Moodboards
1. Click on the "Idea Vault" tab
2. Use "Notes" for text-based ideas
3. Use "Moodboards" to create visual collections with images and text

### Practice Corner
1. Click on the "Practice Corner" tab
2. Choose Master Studies or Live Study subtabs

## File Structure

```
drawing-inspo/
├── src/
│   ├── components/
│   │   ├── Inspiration/     # Prompt inspiration tab
│   │   ├── Photo_journal/   # Photo journal management
│   │   ├── Idea_vault/      # Notes, moodboards, references
│   │   ├── Study_room/      # Study Room (master studies/live study/art library)
│   │   └── TabNavigation/   # Main navigation
│   ├── services/            # Tauri service layer
│   ├── config/              # App configuration
│   ├── App.tsx              # Main application component
│   └── main.tsx             # Application entry point
├── src-tauri/               # Tauri backend (Rust)
├── library/                 # User data storage
└── package.json
```

## Technologies Used

- **Frontend**: React, TypeScript, Vite
- **Backend**: Tauri (Rust)
- **Styling**: CSS3 with modern design patterns
- **Data Storage**: Local file system via Tauri

## Data Storage

- All user data is stored locally in the `library/` directory
- Images are organized by user and feature type
- JSON files store metadata for notes, moodboards, and references
- No external database required

## Development

To build for production:
```bash
npm run tauri:build
```

To run in development mode:
```bash
npm run tauri:dev
```
