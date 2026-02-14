use std::fs;
use std::path::{Path, PathBuf};
use std::env;
use image::DynamicImage;
use exif::{In, Tag};
use tauri::AppHandle;

const APP_NAME: &str = "QuietRoom";
const APP_DISPLAY_NAME: &str = "Quiet Room";

/// Get the user's Pictures folder for storing original images (persists after uninstall).
/// Location: %USERPROFILE%\Pictures\Quiet Room\Library (Windows)
///           ~/Pictures/Quiet Room/Library (macOS/Linux)
pub fn get_library_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
    // In dev mode, check for ./data folder first (for backward compatibility during development)
    fn find_data_dir(start: &Path) -> Option<PathBuf> {
        for dir in start.ancestors() {
            let candidate = dir.join("data");
            if candidate.is_dir() {
                return Some(candidate);
            }
        }
        None
    }

    // Dev mode: use ./data/library if it exists
    if let Ok(cwd) = env::current_dir() {
        if let Some(found) = find_data_dir(&cwd) {
            return Ok(found.join("library_images"));
        }
    }

    // Production: use Pictures folder
    let pictures_dir = dirs::picture_dir()
        .or_else(|| {
            // Fallback: construct Pictures path manually
            dirs::home_dir().map(|h| h.join("Pictures"))
        })
        .ok_or("Could not find Pictures directory")?;
    
    Ok(pictures_dir.join(APP_DISPLAY_NAME).join("Library"))
}

/// Get the app cache/data directory for thumbnails, metadata, and temp files.
/// Location: %LOCALAPPDATA%\QuietRoom (Windows)
///           ~/Library/Application Support/QuietRoom (macOS)
///           ~/.local/share/QuietRoom (Linux)
pub fn get_cache_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
    // In dev mode, check for ./data folder first
    fn find_data_dir(start: &Path) -> Option<PathBuf> {
        for dir in start.ancestors() {
            let candidate = dir.join("data");
            if candidate.is_dir() {
                return Some(candidate);
            }
        }
        None
    }

    // Dev mode: use ./data/cache if ./data exists
    if let Ok(cwd) = env::current_dir() {
        if let Some(found) = find_data_dir(&cwd) {
            return Ok(found.join("cache"));
        }
    }

    // Production: use OS app data location
    let cache_root = match env::consts::OS {
        "windows" => {
            let base = env::var_os("LOCALAPPDATA")
                .or_else(|| env::var_os("APPDATA"))
                .map(PathBuf::from)
                .or_else(|| dirs::data_local_dir());
            base.ok_or("Missing LOCALAPPDATA/APPDATA")?.join(APP_NAME)
        },
        "macos" => {
            let base = dirs::home_dir().ok_or("Missing home dir")?;
            base.join("Library").join("Application Support").join(APP_NAME)
        },
        _ => {
            // Linux and other unixy systems
            let base = dirs::home_dir()
                .map(|p| p.join(".local").join("share"))
                .or_else(|| dirs::data_local_dir())
                .ok_or("Missing home dir for cache root")?;
            base.join(APP_NAME)
        }
    };

    Ok(cache_root)
}

/// Resolve the DataRoot directory (single source of truth) - LEGACY, now points to cache_dir.
/// Kept for backward compatibility with existing code.
#[allow(dead_code)]
pub fn get_data_root() -> Result<PathBuf, Box<dyn std::error::Error>> {
    get_cache_dir()
}

// Backward-compatible alias used by existing code paths
#[allow(dead_code)]
pub fn get_data_directory() -> Result<PathBuf, Box<dyn std::error::Error>> {
    get_cache_dir()
}

/// Ensure all required directories exist in both library and cache locations.
pub fn ensure_directories(library_dir: &Path, cache_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    // Library directories (user-owned, original images)
    let library_dirs = [
        library_dir.to_path_buf(),
        library_dir.join("Artwork Journal"),
        library_dir.join("References"),
        library_dir.join("References").join("Main"),
        library_dir.join("References").join("Folders"),
        library_dir.join("Moodboards"),
    ];

    for dir in &library_dirs {
        fs::create_dir_all(dir)?;
    }

    // Cache directories (app data, thumbnails, metadata)
    let cache_dirs = [
        cache_dir.to_path_buf(),
        cache_dir.join("thumbnails"),
        cache_dir.join("thumbnails").join("artwork_journal"),
        cache_dir.join("thumbnails").join("references"),
        cache_dir.join("thumbnails").join("moodboards"),
        cache_dir.join("app_data"),
    ];

    for dir in &cache_dirs {
        fs::create_dir_all(dir)?;
    }

    // Create initial JSON files if they don't exist (in cache/app_data)
    let app_data_dir = cache_dir.join("app_data");
    
    let photo_journal_file = app_data_dir.join("photo_journal.json");
    if !photo_journal_file.exists() {
        fs::write(&photo_journal_file, "[]")?;
    }

    let references_file = app_data_dir.join("references.json");
    if !references_file.exists() {
        fs::write(&references_file, "[]")?;
    }

    let folders_file = app_data_dir.join("folders.json");
    if !folders_file.exists() {
        fs::write(&folders_file, "[]")?;
    }

    let notes_file = app_data_dir.join("notes.json");
    if !notes_file.exists() {
        fs::write(&notes_file, "[]")?;
    }

    let moodboards_file = app_data_dir.join("moodboards.json");
    if !moodboards_file.exists() {
        fs::write(&moodboards_file, "[]")?;
    }

    Ok(())
}

/// Legacy function - kept for compatibility, now calls ensure_directories
#[allow(dead_code)]
pub fn ensure_data_directory(data_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    // In legacy mode, data_dir is the cache_dir, derive library_dir
    let library_dir = get_library_dir()?;
    ensure_directories(&library_dir, data_dir)
}

/// Recursively copy a directory tree; skip existing files to avoid clobbering user data.
fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), Box<dyn std::error::Error>> {
    if !src.exists() {
        return Ok(());
    }
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let from = entry.path();
        let to = dst.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir_recursive(&from, &to)?;
        } else {
            if let Some(parent) = to.parent() {
                fs::create_dir_all(parent)?;
            }
            if !to.exists() {
                fs::copy(&from, &to)?;
            }
        }
    }
    Ok(())
}

/// Seed data_dir with packaged `library` contents if no user data exists yet.
pub fn seed_default_data(app: &AppHandle, data_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let users_dir = data_dir.join("users");
    let master_dir = data_dir.join("master_studies");
    let warmups_dir = data_dir.join("warmups");

    // Seed if we don't have users yet, or if core assets (master_studies/warmups) are missing.
    if users_dir.exists() && master_dir.exists() && warmups_dir.exists() {
        return Ok(()); // already seeded
    }

    // Use path resolver to locate packaged "library" resource directory
    let resolver = app.path_resolver();
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Some(p) = resolver.resolve_resource("library") {
        candidates.push(p);
    }
    if let Some(res_dir) = resolver.resource_dir() {
        candidates.push(res_dir.join("library"));
        candidates.push(res_dir.join("_up_").join("library")); // installer extraction location on Windows
    }

    for source in candidates {
        if source.exists() {
            println!("Seeding data from {:?}", source);
            copy_dir_recursive(&source, data_dir)?;
            break;
        }
    }

    Ok(())
}

// Image orientation utility function
pub fn apply_exif_orientation(img: DynamicImage, file_path: &Path) -> DynamicImage {
    // Try to read EXIF data
    let file = match std::fs::File::open(file_path) {
        Ok(file) => file,
        Err(_) => return img, // If we can't open the file, return original image
    };

    let mut bufreader = std::io::BufReader::new(&file);
    let exifreader = exif::Reader::new();
    
    let exif = match exifreader.read_from_container(&mut bufreader) {
        Ok(exif) => exif,
        Err(_) => return img, // If no EXIF data, return original image
    };

    // Get orientation from EXIF
    let orientation = match exif.get_field(Tag::Orientation, In::PRIMARY) {
        Some(orientation) => orientation.value.get_uint(0).unwrap_or(1),
        None => 1, // Default to normal orientation
    };

    // Apply orientation transformation
    match orientation {
        1 => img, // Normal orientation
        2 => img.fliph(), // Horizontal flip
        3 => img.rotate180(), // 180° rotation
        4 => img.flipv(), // Vertical flip
        5 => img.rotate90().fliph(), // 90° CW + horizontal flip
        6 => img.rotate90(), // 90° CW
        7 => img.rotate270().fliph(), // 90° CCW + horizontal flip
        8 => img.rotate270(), // 90° CCW
        _ => img, // Unknown orientation, return original
    }
}
