// Commands module - organizes all Tauri commands by domain

pub mod photo_journal;
pub mod references;
pub mod notes;
pub mod moodboards;
pub mod moodboard_upload;
pub mod storage;
pub mod system;
pub mod phone_upload;
pub use system::scan_artwork;
pub use system::list_scanners;
pub use system::scan_with_device;
pub use system::list_warmups;
pub use system::get_warmup_image_data;
pub use photo_journal::set_photo_journal_rotation;

// Re-export all commands for easy access
pub use photo_journal::*;
pub use references::*;
pub use notes::*;
pub use moodboards::*;
pub use moodboard_upload::*;
pub use storage::*;
pub use system::*;
pub use phone_upload::*;