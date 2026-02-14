# Tauri Backend - Drawing Inspiration App

This directory contains the Rust backend for the Drawing Inspiration desktop application, built with Tauri.

## Overview

The Tauri backend provides native desktop functionality including:
- File system operations for local user storage
- Image handling (thumbnails, rotation, crop) for photo journal and references
- Foldered references with tags, notes, and source metadata
- Moodboards and notes persistence
- Scanner integration on Windows
- Local HTTP server for the Chrome extension

## Architecture

### Core Components
- `main.rs` — Tauri entrypoint and command registration; starts local Axum server (127.0.0.1:8787) for the Chrome extension and phone uploads.
- `models.rs` — Data structures and serialization.
- `state.rs` — App state and data_dir initialization.
- `utils.rs` — File system helpers.
- `commands/` — Domain-organized Tauri commands.
- `server/` — HTTP server module for extension and phone uploads.
- `tauri.conf.json`, `Cargo.toml`, `build.rs` — app configuration and build.

### Module Structure (src/)
```
main.rs
models.rs
state.rs
utils.rs
commands/
  mod.rs
  photo_journal.rs
  references/
    mod.rs
    crud.rs
    files.rs
    folders.rs
    notes.rs
    tags.rs
  notes.rs
  moodboards.rs
  moodboard_upload.rs
  storage.rs
  phone_upload.rs
  system.rs              # scanner + open_url helpers
server/
  mod.rs                 # Module root with re-exports
  types.rs               # Type definitions and global state
  network.rs             # Network interface detection
  token.rs               # Token validation
  phone_server.rs        # Server lifecycle management
  phone_page.rs          # Embedded HTML upload page
  router.rs              # Axum router configuration
  handlers/
    mod.rs               # Handler module root
    phone.rs             # Phone info/token handlers
    references.rs        # Reference upload handlers
    photo_journal.rs     # Photo journal upload handlers
```

### Data Structures

The backend defines several key data structures:

```rust
// Core data types
PhotoJournalImage  // Photo journal entries
Reference          // Reference images
Folder            // Reference folders
Note              // Text notes
Moodboard         // Visual moodboards
MoodboardItem     // Individual moodboard elements
```

## Commands (by module)

### Photo Journal (`commands/photo_journal.rs`)
- `get_photo_journal_images`
- `upload_photo_journal_image`
- `delete_photo_journal_image`
- `set_photo_journal_rotation`
- `get_photo_journal_thumbnail_data`
- `clear_photo_journal_thumbnails`
- `link_photo_journal_reference`, `unlink_photo_journal_reference`

### References (`commands/references.rs`)
- `get_references`, `upload_reference`, `delete_reference`, `move_reference`
- `get_folders`, `create_folder`, `delete_folder`
- `get_image_data`, `get_thumbnail_data`
- `set_reference_rotation`, `set_reference_crop`
- Tags: `add_tag_to_reference`, `remove_tag_from_reference`, `set_tags_for_reference`, `list_all_tags`, `list_custom_tags`, `create_custom_tag`, `delete_tag_everywhere`, `rename_tag_everywhere`
- Image notes/source: `set_image_note`, `delete_image_note`, `set_image_source`, `delete_image_source`

### Notes (`commands/notes.rs`)
- `get_notes`, `create_note`, `update_note`, `delete_note`

### Moodboards (`commands/moodboards.rs`)
- `get_moodboards`, `create_moodboard`, `update_moodboard`, `delete_moodboard`, `update_moodboard_item`, `delete_moodboard_item`, `upload_moodboard_image`

### Storage/System (`commands/storage.rs`, `commands/system.rs`)
- `ping`, `get_storage_value`, `set_storage_value`
- `open_url_in_chrome`
- Scanner (Windows): `scan_artwork`, `list_scanners`, `scan_with_device`

### Phone Upload (`commands/phone_upload.rs`)
- `phone_upload_status` — Check if phone upload server is enabled
- `phone_upload_toggle` — Enable/disable phone upload server with timeout
- `phone_upload_info` — Get local network URLs for phone uploads

## HTTP Server Module (`server/`)

The server module provides an HTTP API for uploads from the Chrome extension and mobile devices.

### Module Organization

| Module | Responsibility |
|--------|----------------|
| `types.rs` | Type definitions (`PhoneTokenResponse`, `PhoneUploadStatusResponse`, `PhoneInterface`, etc.) and global state |
| `network.rs` | Network interface detection, IP enumeration, preferred URL selection |
| `token.rs` | Token validation and management for phone uploads |
| `phone_server.rs` | Server lifecycle (start/stop/status), auto-shutdown scheduling |
| `phone_page.rs` | Embedded HTML page for mobile browser uploads |
| `router.rs` | Axum router configuration with all endpoints |
| `handlers/phone.rs` | Phone info and token generation handlers |
| `handlers/references.rs` | Reference upload handlers (single and batch) |
| `handlers/photo_journal.rs` | Photo journal upload handlers (single and batch) |

### HTTP Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/references` | POST | Upload single reference image |
| `/api/references/batch` | POST | Upload multiple reference images |
| `/api/photo-journal` | POST | Upload single photo journal image |
| `/api/photo-journal/batch` | POST | Upload multiple photo journal images |
| `/api/phone-token` | GET | Generate upload token |
| `/api/phone-info` | GET | Get network interface info |
| `/`, `/phone` | GET | Serve phone upload HTML page |

## Data Storage

### Directory Structure (local FS)
```
library/
└── users/
    └── devuser123/
        ├── photo_journal/
        │   ├── images/
        │   ├── thumbnails/
        │   └── photo_journal.json
        ├── references/
        │   ├── main/
        │   ├── folders/
        │   ├── thumbnails/
        │   ├── references.json
        │   ├── folders.json
        │   └── tags.json
        ├── notes/
        │   └── notes.json
        ├── moodboards/
        │   └── moodboards.json
        └── app_storage.json
```

Images are stored on disk; metadata in JSON; image bytes returned as base64 data URLs. Thumbnails are generated on demand and cached.

## Configuration

### Tauri Configuration (`tauri.conf.json`)
- Window: 1200x800 default size, resizable
- File system scope: `library` directory
- Dev CSP relaxed; updater off
- Axum server bound to `127.0.0.1:8787` (Chrome extension)

### Build Configuration (`Cargo.toml`)

Dependencies (high level):
- `tauri`, `serde`, `serde_json`, `uuid`, `chrono`, `base64`
- `image` for processing
- `axum`, `tokio`, `tower-http` for the extension server

## Development

### Prerequisites
- Rust 1.70+
- Node.js 16+
- Platform-specific build tools

### Building
```bash
# Development build
npm run tauri:dev

# Production build
npm run tauri:build
```

### Testing / Debug
```bash
cargo test
RUST_LOG=debug npm run tauri:dev
```

### Adding New Commands

When adding new functionality:

1. **Choose the appropriate domain module**:
   - Photo journal features → `commands/photo_journal.rs`
   - Reference management → `commands/references.rs`
   - Note operations → `commands/notes.rs`
   - Moodboard features → `commands/moodboards.rs`
   - Storage/utilities → `commands/storage.rs`

2. **Add the command function** with proper `#[tauri::command]` attribute

3. **Register in main.rs** by adding to the `invoke_handler` macro

4. **Update this README** with the new command documentation

### Module Guidelines

- **Single Responsibility**: Each module handles one domain
- **Consistent Error Handling**: Use descriptive error messages
- **Proper Imports**: Import only what's needed from other modules
- **Documentation**: Add doc comments for complex functions

## Error Handling

The backend implements comprehensive error handling:
- File system errors are caught and converted to user-friendly messages
- JSON parsing errors are handled gracefully
- Missing files return appropriate error responses
- All errors are logged for debugging

## Security Considerations
- File system access is restricted to the `library` directory.
- User data stored locally; no external DB.
- Input validation on all command parameters.

## Performance
- Efficient file I/O and JSON serialization
- Cached thumbnails for photo journal and references
- Prefetching for viewer full images

## Platform Support

- **Windows**: Full support
- **macOS**: Full support  
- **Linux**: Full support (Ubuntu 18.04+)

## Troubleshooting

### Common Issues

#### File Permission Errors
- Ensure the app has write access to the library directory
- Check antivirus software isn't blocking file operations

#### Image Loading Issues
- Verify image files exist in the correct directories
- Check file permissions on image files
- Ensure proper MIME type detection

#### JSON Parsing Errors
- Validate JSON file structure
- Check for corrupted metadata files
- Recreate JSON files if corrupted

### Debug Tips
- Enable debug logging: `RUST_LOG=debug`
- Check Tauri console for error messages
- Verify file paths in error messages
- Test with minimal data sets

## Future Enhancements
- Export/import user library
- Automatic backups
- Image compression/optimization
- Optional authentication/multi-user
- Additional metadata extraction

## Contributing

When modifying the backend:
1. Follow Rust best practices
2. Add proper error handling
3. Choose the appropriate domain module for new commands
4. Update this README for new commands
5. Test on all supported platforms
6. Maintain backward compatibility
7. Keep modules focused on their domain responsibility

---

**Last Updated**: 2026-02-04  
**Version**: 1.0.0  
**Maintainer**: Development Team
