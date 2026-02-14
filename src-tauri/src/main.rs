// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Module declarations
mod models;
mod state;
mod utils;
mod commands;
mod server;

// Re-export commonly used types
pub use models::*;
pub use state::AppState;

use tauri::Manager;

fn load_window_icon() -> Option<tauri::Icon> {
    // Embed the icon at compile time so dev/build always use the latest file
    let bytes = include_bytes!("../icons/icon.png");
    let img = image::load_from_memory(bytes).ok()?.into_rgba8();
    let w = img.width();
    let h = img.height();
    Some(tauri::Icon::Rgba {
        rgba: img.into_raw(),
        width: w,
        height: h,
    })
}

fn main() {
    let app_state = AppState::new().expect("Failed to initialize app state");
    println!("CacheDir: {}", app_state.data_dir.display());
    println!("LibraryDir: {}", app_state.library_dir.display());

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            // Storage commands
            commands::ping,
            commands::get_storage_value,
            commands::set_storage_value,
            
            // Photo journal commands
            commands::get_photo_journal_images,
            commands::upload_photo_journal_image,
            commands::delete_photo_journal_image,
            commands::get_photo_journal_thumbnail_data,
            commands::clear_photo_journal_thumbnails,
            commands::link_photo_journal_reference,
            commands::unlink_photo_journal_reference,
            commands::set_photo_journal_rotation,
            
            // References commands
            commands::get_references,
            commands::delete_reference,
            commands::upload_reference,
            commands::move_reference,
            commands::set_reference_rotation,
            commands::set_reference_crop,
            commands::get_folders,
            commands::create_folder,
            commands::delete_folder,
            commands::get_image_data,
            commands::get_thumbnail_data,
            commands::read_file_for_upload,
            // Tags commands
            commands::add_tag_to_reference,
            commands::remove_tag_from_reference,
            commands::set_tags_for_reference,
            commands::list_all_tags,
            commands::list_custom_tags,
            commands::create_custom_tag,
            commands::delete_tag_everywhere,
            commands::rename_tag_everywhere,
            // Reference image notes
            commands::set_image_note,
            commands::delete_image_note,
            commands::set_image_source,
            commands::delete_image_source,
            
            // Notes commands
            commands::get_notes,
            commands::create_note,
            commands::update_note,
            commands::delete_note,
            
            // Moodboards commands
            commands::get_moodboards,
            commands::create_moodboard,
            commands::update_moodboard,
            commands::delete_moodboard,
            commands::update_moodboard_item,
            commands::delete_moodboard_item,
            commands::upload_moodboard_image
            ,
            // System commands
            commands::open_url_in_chrome,
            commands::phone_upload_status,
            commands::phone_upload_toggle,
            commands::phone_upload_info,
            commands::scan_artwork,
            commands::list_scanners,
            commands::scan_with_device,
            commands::list_warmups,
            commands::get_warmup_image_data,
            commands::list_warmups
        ])
        .setup(|app| {
            // Force window icon at runtime (helps with Windows/dev caching quirks)
            if let Some(window) = app.get_window("main") {
                if let Some(icon) = load_window_icon() {
                    let _ = window.set_icon(icon);
                }
            }
            {
                // Seed packaged default data (library) on first run if no users data exists
                let handle = app.handle();
                let state = app.state::<AppState>();
                if let Err(err) = crate::utils::seed_default_data(&handle, &state.data_dir) {
                    eprintln!("Failed to seed default data: {}", err);
                }
            }
            // Start extension server for Chrome extension uploads
            {
                let handle = app.handle();
                if let Err(err) = crate::server::start_extension_server(handle) {
                    eprintln!("Failed to start extension server: {}", err);
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
