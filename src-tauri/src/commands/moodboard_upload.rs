use std::fs;
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use crate::models::MoodboardItem;
use crate::state::AppState;

#[tauri::command]
pub async fn upload_moodboard_image(
    state: State<'_, AppState>,
    moodboard_id: String,
    filename: String,
    original_name: String,
    data: Vec<u8>,
) -> Result<MoodboardItem, String> {
    // Images stored in library (user-owned, persists after uninstall)
    let moodboard_dir = state.library_dir
        .join("Moodboards")
        .join(&moodboard_id);
    
    // Create moodboard directory if it doesn't exist
    if !moodboard_dir.exists() {
        fs::create_dir_all(&moodboard_dir)
            .map_err(|e| format!("Failed to create moodboard directory: {}", e))?;
    }
    
    let file_path = moodboard_dir.join(&filename);
    
    // Write the image file
    fs::write(&file_path, data)
        .map_err(|e| format!("Failed to write image: {}", e))?;
    
    // Create moodboard item
    let item = MoodboardItem {
        id: Uuid::new_v4().to_string(),
        item_type: "image".to_string(),
        content: Some(original_name.clone()),
        x: 100.0,
        y: 100.0,
        width: 200.0,
        height: 200.0,
        created_at: Some(Utc::now().timestamp_millis()),
        filename: Some(filename.clone()),
        url: Some(format!("moodboards/{}/{}", moodboard_id, filename)),
        original_width: None,
        original_height: None,
        aspect_ratio: None,
        is_webp: Some(filename.ends_with(".webp")),
        colors: None,
    };
    
    Ok(item)
}
