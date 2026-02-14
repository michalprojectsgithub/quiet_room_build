use std::fs;
use std::path::Path;
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use base64::Engine;
use image::ImageFormat;
use crate::models::PhotoJournalImage;
use crate::state::AppState;
use crate::utils::apply_exif_orientation;

#[tauri::command]
pub async fn get_photo_journal_images(
    state: State<'_, AppState>,
) -> Result<Vec<PhotoJournalImage>, String> {
    // Metadata stored in cache/app_data
    let file_path = state.data_dir
        .join("app_data")
        .join("photo_journal.json");

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read photo journal: {}", e))?;

    let images: Vec<PhotoJournalImage> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse photo journal: {}", e))?;

    Ok(images)
}

#[tauri::command]
pub async fn upload_photo_journal_image(
    state: State<'_, AppState>,
    filename: String,
    original_name: String,
    data: Vec<u8>,
    prompt: Option<String>,
) -> Result<PhotoJournalImage, String> {
    // Original images stored in library (user-owned, persists after uninstall)
    let images_dir = state.library_dir.join("Artwork Journal");
    
    // Ensure images directory exists
    if !images_dir.exists() {
        fs::create_dir_all(&images_dir)
            .map_err(|e| format!("Failed to create images directory: {}", e))?;
    }
    let file_path = images_dir.join(&filename);

    // Write the image file
    fs::write(&file_path, data)
        .map_err(|e| format!("Failed to write image: {}", e))?;

    // Create image record
    let mime = if let Some(ext) = Path::new(&filename).extension().and_then(|s| s.to_str()) {
        match ext.to_ascii_lowercase().as_str() {
            "png" => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            "webp" => "image/webp",
            _ => "image/jpeg",
        }
    } else {
        "image/jpeg"
    }
    .to_string();

    let image = PhotoJournalImage {
        id: Uuid::new_v4().to_string(),
        filename: filename.clone(),
        original_name,
        // Store URL as artwork_journal/{filename} for frontend path resolution
        url: format!("artwork_journal/{}", filename),
        upload_date: Utc::now().to_rfc3339(),
        size: file_path.metadata().map_err(|e| format!("Failed to get file size: {}", e))?.len(),
        mimetype: mime,
        prompt,
        reference_id: None,
        rotation: 0,
    };

    // Update JSON file in cache/app_data
    let json_path = state.data_dir.join("app_data").join("photo_journal.json");
    let mut images: Vec<PhotoJournalImage> = if json_path.exists() {
        match fs::read_to_string(&json_path) {
            Ok(content) => match serde_json::from_str(&content) {
                Ok(list) => list,
                Err(_) => Vec::new(),
            },
            Err(_) => Vec::new(),
        }
    } else {
        Vec::new()
    };

    images.insert(0, image.clone());

    let updated_content = serde_json::to_string_pretty(&images)
        .map_err(|e| format!("Failed to serialize photo journal: {}", e))?;

    fs::write(&json_path, updated_content)
        .map_err(|e| format!("Failed to write photo journal: {}", e))?;

    Ok(image)
}

#[tauri::command]
pub async fn delete_photo_journal_image(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    // Metadata in cache/app_data
    let json_path = state.data_dir.join("app_data").join("photo_journal.json");
    let content = fs::read_to_string(&json_path)
        .map_err(|e| format!("Failed to read photo journal: {}", e))?;

    let mut images: Vec<PhotoJournalImage> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse photo journal: {}", e))?;

    // Delete original image from library
    if let Some(image) = images.iter().find(|img| img.id == id) {
        let file_path = state.library_dir.join("Artwork Journal").join(&image.filename);
        if file_path.exists() {
            fs::remove_file(&file_path)
                .map_err(|e| format!("Failed to delete image file: {}", e))?;
        }
        
        // Also delete thumbnail if it exists
        let thumb_stem = Path::new(&image.filename)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown");
        let thumbnails_dir = state.data_dir.join("thumbnails").join("artwork_journal");
        let legacy_thumb = thumbnails_dir.join(format!("{}.thumb.png", thumb_stem));
        let v2_thumb = thumbnails_dir.join(format!("{}.thumb.v2.360.png", thumb_stem));
        if legacy_thumb.exists() {
            let _ = fs::remove_file(&legacy_thumb);
        }
        if v2_thumb.exists() {
            let _ = fs::remove_file(&v2_thumb);
        }
    }

    images.retain(|img| img.id != id);

    let updated_content = serde_json::to_string_pretty(&images)
        .map_err(|e| format!("Failed to serialize photo journal: {}", e))?;

    fs::write(&json_path, updated_content)
        .map_err(|e| format!("Failed to write photo journal: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn set_photo_journal_rotation(
    state: State<'_, AppState>,
    id: String,
    rotation: i32,
) -> Result<PhotoJournalImage, String> {
    let json_path = state.data_dir.join("app_data").join("photo_journal.json");
    let content = fs::read_to_string(&json_path)
        .map_err(|e| format!("Failed to read photo journal: {}", e))?;

    let mut images: Vec<PhotoJournalImage> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse photo journal: {}", e))?;

    let idx = images.iter().position(|img| img.id == id)
        .ok_or_else(|| "Image not found".to_string())?;

    images[idx].rotation = rotation;
    let updated = images[idx].clone();

    let updated_content = serde_json::to_string_pretty(&images)
        .map_err(|e| format!("Failed to serialize photo journal: {}", e))?;

    fs::write(&json_path, updated_content)
        .map_err(|e| format!("Failed to write photo journal: {}", e))?;

    Ok(updated)
}

#[tauri::command]
pub async fn get_photo_journal_thumbnail_data(
    state: State<'_, AppState>,
    image_path: String,
) -> Result<String, String> {
    // Resolve the full path to the original image
    // image_path is like "artwork_journal/{filename}" or legacy "photo_journal/images/{filename}"
    let filename = if image_path.starts_with("artwork_journal/") {
        image_path.strip_prefix("artwork_journal/").unwrap_or(&image_path)
    } else if image_path.starts_with("photo_journal/images/") {
        image_path.strip_prefix("photo_journal/images/").unwrap_or(&image_path)
    } else {
        &image_path
    };
    
    // Try new library location first
    let full_path = state.library_dir.join("Artwork Journal").join(filename);
    
    // Fall back to legacy location if not found in new location
    let full_path = if full_path.exists() {
        full_path
    } else {
        // Check legacy dev location
        let legacy_path = state.data_dir.join("users").join("devuser123").join("photo_journal").join("images").join(filename);
        if legacy_path.exists() {
            legacy_path
        } else {
            // Return the expected new path for the error message
            return Err(format!("Image file not found: {:?}", full_path));
        }
    };
    
    // Thumbnails stored in cache
    let thumbnails_dir = state.data_dir
        .join("thumbnails")
        .join("artwork_journal");
    
    if !thumbnails_dir.exists() {
        fs::create_dir_all(&thumbnails_dir)
            .map_err(|e| format!("Failed to create thumbnails directory: {}", e))?;
    }
    
    // Generate thumbnail filename
    let thumbnail_max_size: u32 = 360;
    let thumbnail_filename = format!("{}.thumb.v2.{}.png", 
        full_path.file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown"),
        thumbnail_max_size
    );
    
    let thumbnail_path = thumbnails_dir.join(&thumbnail_filename);
    
    // Check if thumbnail already exists
    if thumbnail_path.exists() {
        let thumbnail_data = fs::read(&thumbnail_path)
            .map_err(|e| format!("Failed to read thumbnail: {}", e))?;
        
        let base64_data = base64::engine::general_purpose::STANDARD.encode(&thumbnail_data);
        let data_url = format!("data:image/png;base64,{}", base64_data);
        
        return Ok(data_url);
    }
    
    // Generate new thumbnail
    let img_bytes = fs::read(&full_path)
        .map_err(|e| format!("Failed to read image bytes: {}", e))?;

    let dyn_img = match image::load_from_memory(&img_bytes) {
        Ok(img) => img,
        Err(_) => image::open(&full_path)
            .map_err(|e| format!("Failed to open image: {}", e))?,
    };
    
    // Apply EXIF orientation correction
    let oriented_img = apply_exif_orientation(dyn_img, &full_path);
    
    // Resize to thumbnail size (360x360 max, maintaining aspect ratio) with a sharper filter
    let thumbnail = oriented_img.resize(thumbnail_max_size, thumbnail_max_size, image::imageops::FilterType::Lanczos3);
    
    // Save thumbnail as PNG
    thumbnail.save_with_format(&thumbnail_path, ImageFormat::Png)
        .map_err(|e| format!("Failed to save thumbnail: {}", e))?;
    
    // Read and return as base64
    let thumbnail_data = fs::read(&thumbnail_path)
        .map_err(|e| format!("Failed to read generated thumbnail: {}", e))?;
    
    let base64_data = base64::engine::general_purpose::STANDARD.encode(&thumbnail_data);
    let data_url = format!("data:image/png;base64,{}", base64_data);
    
    Ok(data_url)
}

#[tauri::command]
pub async fn clear_photo_journal_thumbnails(
    state: State<'_, AppState>,
) -> Result<(), String> {
    let thumbnails_dir = state.data_dir
        .join("thumbnails")
        .join("artwork_journal");
    
    if thumbnails_dir.exists() {
        fs::remove_dir_all(&thumbnails_dir)
            .map_err(|e| format!("Failed to remove thumbnails directory: {}", e))?;
    }
    
    // Recreate the directory
    fs::create_dir_all(&thumbnails_dir)
        .map_err(|e| format!("Failed to create thumbnails directory: {}", e))?;
    
    Ok(())
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn unlink_photo_journal_reference(
    state: State<'_, AppState>,
    photoId: String,
) -> Result<(), String> {
    let json_path = state.data_dir.join("app_data").join("photo_journal.json");
    let content = fs::read_to_string(&json_path)
        .map_err(|e| format!("Failed to read photo journal: {}", e))?;

    let mut data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse photo journal: {}", e))?;

    let arr = data.as_array_mut().ok_or_else(|| "Photo journal JSON is not an array".to_string())?;
    let mut found = false;
    for item in arr.iter_mut() {
        if let Some(obj) = item.as_object_mut() {
            if obj.get("id").and_then(|v| v.as_str()) == Some(&photoId) {
                obj.insert("referenceId".to_string(), serde_json::Value::Null);
                found = true;
                break;
            }
        }
    }

    if !found {
        return Err("Photo not found".to_string());
    }

    let updated_content = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize photo journal: {}", e))?;

    fs::write(&json_path, updated_content)
        .map_err(|e| format!("Failed to write photo journal: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn link_photo_journal_reference(
    state: State<'_, AppState>,
    photo_id: String,
    reference_id: String,
) -> Result<(), String> {
    let json_path = state.data_dir.join("app_data").join("photo_journal.json");
    let content = fs::read_to_string(&json_path)
        .map_err(|e| format!("Failed to read photo journal: {}", e))?;

    let mut data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse photo journal: {}", e))?;

    let arr = data.as_array_mut().ok_or_else(|| "Photo journal JSON is not an array".to_string())?;
    let mut found = false;
    for item in arr.iter_mut() {
        if let Some(obj) = item.as_object_mut() {
            if obj.get("id").and_then(|v| v.as_str()) == Some(&photo_id) {
                obj.insert("referenceId".to_string(), serde_json::Value::String(reference_id.clone()));
                found = true;
                break;
            }
        }
    }

    if !found {
        return Err("Photo not found".to_string());
    }

    let updated_content = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize photo journal: {}", e))?;

    fs::write(&json_path, updated_content)
        .map_err(|e| format!("Failed to write photo journal: {}", e))?;

    Ok(())
}
