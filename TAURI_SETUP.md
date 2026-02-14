# Tauri Setup Guide

This guide explains how to set up and run the Drawing Inspiration app as a Tauri desktop application.

## Prerequisites

### 1. Install Rust
Download and install Rust from [rustup.rs](https://rustup.rs/):
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. Install Tauri CLI
```bash
npm install -g @tauri-apps/cli
```

### 3. Install System Dependencies

#### Windows
- Install Microsoft Visual Studio C++ Build Tools
- Install WebView2 (usually pre-installed on Windows 10/11)

#### macOS
```bash
xcode-select --install
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

## Installation

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

2. **Install Rust dependencies:**
   ```bash
   cd src-tauri
   cargo build
   cd ..
   ```

## Development

### Run in Development Mode
```bash
npm run tauri:dev
```

This will:
- Start the Vite development server
- Compile the Rust backend
- Launch the Tauri desktop application
- Enable hot reload for both frontend and backend changes

### Build for Production
```bash
npm run tauri:build
```

This creates optimized builds in `src-tauri/target/release/`:
- **Windows**: `.exe` installer and portable executable
- **macOS**: `.app` bundle and `.dmg` installer
- **Linux**: `.deb`, `.rpm`, and `.AppImage` packages

## Project Structure

```
drawing-inspo/
├── src/                          # React frontend
│   ├── components/               # React components
│   ├── services/                 # Service layer (Tauri integration)
│   └── ...
├── src-tauri/                    # Rust backend
│   ├── src/                      # Rust source code
│   │   └── main.rs              # Main Tauri application
│   ├── icons/                    # Application icons
│   ├── Cargo.toml               # Rust dependencies
│   └── build.rs                 # Build script
├── tauri.conf.json              # Tauri configuration
└── package.json                 # Node.js dependencies
```

## Key Features

### Offline Functionality
- **File System Access**: Direct access to local file system
- **Data Persistence**: JSON files stored in user's home directory
- **No Internet Required**: All core features work offline
- **Native Performance**: Rust backend provides fast file operations

### Data Storage
User data is stored in:
- **Windows**: `%USERPROFILE%/drawing-inspo/`
- **macOS**: `~/drawing-inspo/`
- **Linux**: `~/drawing-inspo/`

### Security
- **Sandboxed**: Limited file system access
- **No Network**: No external network requests (except AI generation)
- **Local Only**: All data stays on user's machine

## API Integration

### Tauri Commands
The Rust backend exposes these commands to the frontend:

- `ping()` - Health check
- `get_photo_journal_images()` - Get all photo journal images
- `upload_photo_journal_image()` - Upload new image
- `delete_photo_journal_image()` - Delete image
- `get_references()` - Get all reference images
- `upload_reference()` - Upload reference image
- `get_notes()` - Get all notes
- `create_note()` - Create new note
- `update_note()` - Update existing note
- `delete_note()` - Delete note
- `generate_image()` - Generate AI image (requires internet)

### Service Layer
The frontend uses a service layer that abstracts Tauri commands:

```typescript
import TauriService from './services/tauriService';

// Upload an image
const image = await TauriService.uploadPhotoJournalImage(file, prompt);

// Get all notes
const notes = await TauriService.getNotes();
```

## Configuration

### tauri.conf.json
Key configuration options:

- **Window Settings**: Size, resizable, title
- **Permissions**: File system access, dialog permissions
- **Bundle Settings**: App identifier, icons
- **Security**: CSP policies, allowed hosts

### Customization
- **Window Size**: Modify `width` and `height` in `tauri.conf.json`
- **App Icon**: Replace files in `src-tauri/icons/`
- **App Name**: Change `productName` in `tauri.conf.json`

## Troubleshooting

### Common Issues

#### 1. Rust Not Found
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

#### 2. WebView2 Not Found (Windows)
- Download and install WebView2 from Microsoft
- Or update Windows to latest version

#### 3. Build Errors
```bash
# Clean and rebuild
cd src-tauri
cargo clean
cargo build
```

#### 4. Permission Errors
- Check file system permissions
- Ensure app has write access to user directory

### Debug Mode
Run with debug logging:
```bash
RUST_LOG=debug npm run tauri:dev
```

## Deployment

### Creating Installers
```bash
npm run tauri:build
```

### Distribution
Built applications are in `src-tauri/target/release/bundle/`:
- **Windows**: `.msi` installer
- **macOS**: `.dmg` disk image
- **Linux**: `.deb`, `.rpm`, `.AppImage`

### Code Signing (Optional)
For production distribution, configure code signing in `tauri.conf.json`.

## Migration from Web Version

The Tauri version maintains compatibility with the existing React components:

1. **Service Layer**: Updated to use Tauri commands instead of HTTP requests
2. **Data Format**: Same JSON structure, stored locally instead of server
3. **UI Components**: No changes needed to React components
4. **Features**: All existing features work offline

## Future Enhancements

### Planned Features
- **Moodboard Support**: Full moodboard creation and management
- **Folder Management**: Advanced reference organization
- **AI Integration**: Local AI models for offline image generation
- **Sync**: Optional cloud sync for multi-device usage
- **Plugins**: Extensible plugin system

### Performance Optimizations
- **Image Processing**: Rust-based image optimization
- **Database**: SQLite for better performance with large datasets
- **Caching**: Intelligent caching for better responsiveness

## Support

For issues and questions:
1. Check this README
2. Review Tauri documentation: https://tauri.app/
3. Check Rust documentation: https://doc.rust-lang.org/
4. Review the project's GitHub issues

## License

Same license as the main Drawing Inspiration project.
