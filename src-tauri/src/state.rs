use std::path::PathBuf;
use crate::utils::{get_cache_dir, get_library_dir, ensure_directories};

// App state
pub struct AppState {
    /// Cache directory for thumbnails, metadata JSON files, and temp data.
    /// Location: %LOCALAPPDATA%\QuietRoom (can be cleared on uninstall)
    pub data_dir: PathBuf,  // Kept as data_dir for backward compatibility
    
    /// Library directory for original user images (persists after uninstall).
    /// Location: %USERPROFILE%\Pictures\Quiet Room\Library
    pub library_dir: PathBuf,
}

impl AppState {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let data_dir = get_cache_dir()?;
        let library_dir = get_library_dir()?;
        ensure_directories(&library_dir, &data_dir)?;
        Ok(AppState { data_dir, library_dir })
    }
}
