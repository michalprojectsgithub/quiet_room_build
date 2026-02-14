use std::fs;
use tauri::State;
use image::ImageOutputFormat;
use image::imageops::FilterType;
use base64::Engine;

use crate::state::AppState;
use crate::utils::apply_exif_orientation;

#[tauri::command]
pub async fn get_image_data(
    state: State<'_, AppState>,
    image_path: String,
) -> Result<String, String> {
    // Resolve the full path based on the image_path prefix
    let full_path = if image_path.starts_with("library/") {
        // Bundled app content (master studies, warmups) - in cache/library
        state.data_dir.join(&image_path)
    } else if image_path.starts_with("references/main/") || image_path.starts_with("references/Main/") || image_path.starts_with("references/") && !image_path.starts_with("references/folders/") {
        // Main references - in library (with legacy fallback)
        let filename = image_path.strip_prefix("references/main/")
            .or_else(|| image_path.strip_prefix("references/Main/"))
            .or_else(|| image_path.strip_prefix("references/"))
            .unwrap_or(&image_path);
        let new_path = state.library_dir.join("References").join("Main").join(filename);
        if new_path.exists() {
            new_path
        } else {
            // Legacy fallback
            let legacy_path = state.data_dir.join("users").join("devuser123").join("references").join("main").join(filename);
            if legacy_path.exists() { legacy_path } else { new_path }
        }
    } else if image_path.starts_with("references/folders/") || image_path.starts_with("references/Folders/") {
        // Folder references - in library (with legacy fallback)
        let subpath = image_path.strip_prefix("references/folders/")
            .or_else(|| image_path.strip_prefix("references/Folders/"))
            .unwrap_or(&image_path);
        let new_path = state.library_dir.join("References").join("Folders").join(subpath);
        if new_path.exists() {
            new_path
        } else {
            let legacy_path = state.data_dir.join("users").join("devuser123").join("references").join("folders").join(subpath);
            if legacy_path.exists() { legacy_path } else { new_path }
        }
    } else if image_path.starts_with("folders/") {
        // Legacy folder path - in library (with legacy fallback)
        let subpath = image_path.strip_prefix("folders/").unwrap_or(&image_path);
        let new_path = state.library_dir.join("References").join("Folders").join(subpath);
        if new_path.exists() {
            new_path
        } else {
            let legacy_path = state.data_dir.join("users").join("devuser123").join("references").join("folders").join(subpath);
            if legacy_path.exists() { legacy_path } else { new_path }
        }
    } else if image_path.starts_with("artwork_journal/") || image_path.starts_with("photo_journal/images/") {
        // Artwork journal images - in library (with legacy path support)
        let filename = image_path.strip_prefix("artwork_journal/")
            .or_else(|| image_path.strip_prefix("photo_journal/images/"))
            .unwrap_or(&image_path);
        // Try new location first
        let new_path = state.library_dir.join("Artwork Journal").join(filename);
        if new_path.exists() {
            new_path
        } else {
            // Fall back to legacy location
            let legacy_path = state.data_dir.join("users").join("devuser123").join("photo_journal").join("images").join(filename);
            if legacy_path.exists() {
                legacy_path
            } else {
                new_path // Return new path for error message
            }
        }
    } else if image_path.starts_with("moodboards/") {
        // Moodboard images - in library
        state.library_dir.join("Moodboards").join(image_path.strip_prefix("moodboards/").unwrap_or(&image_path))
    } else {
        // Default: try as filename in References/Main
        state.library_dir.join("References").join("Main").join(&image_path)
    };
    
    if !full_path.exists() {
        return Err(format!("Image file not found: {:?}", full_path));
    }
    
    let file_data = fs::read(&full_path)
        .map_err(|e| format!("Failed to read image: {}", e))?;
    
    // Determine MIME type based on file extension
    let mime_type = match full_path.extension().and_then(|ext| ext.to_str()) {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("webp") => "image/webp",
        Some("gif") => "image/gif",
        _ => "image/jpeg", // default
    };
    
    // Convert to base64 data URL
    let base64_data = base64::engine::general_purpose::STANDARD.encode(&file_data);
    let data_url = format!("data:{};base64,{}", mime_type, base64_data);
    
    Ok(data_url)
}

#[tauri::command]
pub async fn get_thumbnail_data(
    state: State<'_, AppState>,
    image_path: String,
) -> Result<String, String> {
    // Resolve the full path based on the image_path prefix
    let full_path = if image_path.starts_with("references/main/") || image_path.starts_with("references/Main/") {
        let filename = image_path.strip_prefix("references/main/")
            .or_else(|| image_path.strip_prefix("references/Main/"))
            .unwrap_or(&image_path);
        state.library_dir.join("References").join("Main").join(filename)
    } else if image_path.starts_with("references/folders/") || image_path.starts_with("references/Folders/") {
        let subpath = image_path.strip_prefix("references/folders/")
            .or_else(|| image_path.strip_prefix("references/Folders/"))
            .unwrap_or(&image_path);
        state.library_dir.join("References").join("Folders").join(subpath)
    } else if image_path.starts_with("folders/") {
        let subpath = image_path.strip_prefix("folders/").unwrap_or(&image_path);
        state.library_dir.join("References").join("Folders").join(subpath)
    } else {
        // Default: try as filename in References/Main
        state.library_dir.join("References").join("Main").join(&image_path)
    };
    
    if !full_path.exists() {
        return Err(format!("Image file not found: {:?}", full_path));
    }
    
    // Thumbnails stored in cache
    let thumbnails_dir = state.data_dir
        .join("thumbnails")
        .join("references");
    
    if !thumbnails_dir.exists() {
        fs::create_dir_all(&thumbnails_dir)
            .map_err(|e| format!("Failed to create thumbnails directory: {}", e))?;
    }
    
    // Generate thumbnail filename based on original image filename and size
    let thumb_size = 360u32;
    let thumbnail_filename = format!("{}.thumb-{}.jpg", 
        full_path.file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown"),
        thumb_size
    );
    
    let thumbnail_path = thumbnails_dir.join(&thumbnail_filename);
    
    // Check if thumbnail already exists
    if thumbnail_path.exists() {
        let thumbnail_data = fs::read(&thumbnail_path)
            .map_err(|e| format!("Failed to read thumbnail: {}", e))?;
        
        let base64_data = base64::engine::general_purpose::STANDARD.encode(&thumbnail_data);
        let data_url = format!("data:image/jpeg;base64,{}", base64_data);
        
        return Ok(data_url);
    }
    
    // Generate new thumbnail
    let img = image::open(&full_path)
        .map_err(|e| format!("Failed to open image: {}", e))?;
    
    // Apply EXIF orientation correction
    let oriented_img = apply_exif_orientation(img, &full_path);
    
    // Resize to thumbnail size (maintaining aspect ratio) with higher quality
    let thumbnail = oriented_img.resize(thumb_size, thumb_size, FilterType::Lanczos3);
    
    // Save thumbnail as JPEG with better quality
    let mut output = Vec::new();
    thumbnail
        .write_to(&mut std::io::Cursor::new(&mut output), ImageOutputFormat::Jpeg(85))
        .map_err(|e| format!("Failed to encode thumbnail: {}", e))?;
    fs::write(&thumbnail_path, &output)
        .map_err(|e| format!("Failed to save thumbnail: {}", e))?;
    
    // Read the saved thumbnail and return as base64
    let thumbnail_data = fs::read(&thumbnail_path)
        .map_err(|e| format!("Failed to read generated thumbnail: {}", e))?;
    
    let base64_data = base64::engine::general_purpose::STANDARD.encode(&thumbnail_data);
    let data_url = format!("data:image/jpeg;base64,{}", base64_data);
    
    Ok(data_url)
}
