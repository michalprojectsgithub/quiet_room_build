use std::fs;
use std::path::Path;
use tauri::State;
use crate::models::{Moodboard, MoodboardItem};
use crate::state::AppState;

// Helper function to safely write moodboards with backup
fn write_moodboards_with_backup(file_path: &Path, moodboards: &Vec<Moodboard>) -> Result<(), String> {
    let content = serde_json::to_string_pretty(moodboards)
        .map_err(|e| format!("Failed to serialize moodboards: {}", e))?;
    
    // Create backup before writing
    let backup_path = file_path.with_extension("json.backup");
    if file_path.exists() {
        fs::copy(file_path, &backup_path)
            .map_err(|e| format!("Failed to create backup: {}", e))?;
    }
    
    // Write new content
    fs::write(file_path, content)
        .map_err(|e| format!("Failed to write moodboards: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_moodboards(
    state: State<'_, AppState>,
) -> Result<Vec<Moodboard>, String> {
    // Metadata in cache/app_data
    let file_path = state.data_dir
        .join("app_data")
        .join("moodboards.json");

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read moodboards: {}", e))?;

    // Handle empty file or whitespace-only content
    let moodboards: Vec<Moodboard> = if content.trim().is_empty() {
        Vec::new()
    } else {
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse moodboards: {} (content: '{}')", e, content))?
    };

    Ok(moodboards)
}

#[tauri::command]
pub async fn create_moodboard(
    state: State<'_, AppState>,
    title: String,
) -> Result<Moodboard, String> {
    // Metadata in cache/app_data
    let app_data_dir = state.data_dir.join("app_data");
    
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app_data directory: {}", e))?;
    }
    
    let file_path = app_data_dir.join("moodboards.json");
    
    // Read existing moodboards
    let mut moodboards = if file_path.exists() {
        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read moodboards: {}", e))?;
        
        // Handle empty file or whitespace-only content
        if content.trim().is_empty() {
            Vec::new()
        } else {
            serde_json::from_str::<Vec<Moodboard>>(&content)
                .map_err(|e| format!("Failed to parse moodboards: {} (content: '{}')", e, content))?
        }
    } else {
        Vec::new()
    };
    
    // Create new moodboard
    let new_moodboard = Moodboard {
        id: chrono::Utc::now().timestamp_millis().to_string(),
        title,
        items: Vec::new(),
        created_at: chrono::Utc::now().timestamp_millis(),
        updated_at: Some(chrono::Utc::now().timestamp_millis()),
    };
    
    // Add to beginning of list
    moodboards.insert(0, new_moodboard.clone());
    
    // Save back to file with backup
    write_moodboards_with_backup(&file_path, &moodboards)?;
    
    Ok(new_moodboard)
}

#[tauri::command]
pub async fn update_moodboard(
    state: State<'_, AppState>,
    moodboard_id: String,
    title: String,
    items: Vec<MoodboardItem>,
) -> Result<Moodboard, String> {
    let file_path = state.data_dir
        .join("app_data")
        .join("moodboards.json");
    
    if !file_path.exists() {
        return Err("Moodboards file not found".to_string());
    }
    
    // Read existing moodboards
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read moodboards: {}", e))?;
    let mut moodboards: Vec<Moodboard> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse moodboards: {}", e))?;
    
    // Find and update the moodboard
    let mut updated_moodboard = None;
    for moodboard in &mut moodboards {
        if moodboard.id == moodboard_id {
            moodboard.title = title;
            moodboard.items = items;
            moodboard.updated_at = Some(chrono::Utc::now().timestamp_millis());
            updated_moodboard = Some(moodboard.clone());
            break;
        }
    }
    
    if let Some(moodboard) = updated_moodboard {
        // Save back to file with backup
        write_moodboards_with_backup(&file_path, &moodboards)?;
        
        Ok(moodboard)
    } else {
        Err("Moodboard not found".to_string())
    }
}

#[tauri::command]
pub async fn delete_moodboard(
    state: State<'_, AppState>,
    moodboard_id: String,
) -> Result<(), String> {
    let file_path = state.data_dir
        .join("app_data")
        .join("moodboards.json");
    
    if !file_path.exists() {
        return Err("Moodboards file not found".to_string());
    }
    
    // Read existing moodboards
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read moodboards: {}", e))?;
    let mut moodboards: Vec<Moodboard> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse moodboards: {}", e))?;
    
    // Remove the moodboard and delete its directory with files
    moodboards.retain(|m| m.id != moodboard_id);

    // Attempt to delete the moodboard's directory from library if it exists
    let board_dir = state.library_dir
        .join("Moodboards")
        .join(&moodboard_id);
    if board_dir.exists() {
        if let Err(e) = fs::remove_dir_all(&board_dir) {
            eprintln!("Warning: failed to delete moodboard directory {:?}: {}", board_dir, e);
        }
    }
    
    // Save back to file with backup
    write_moodboards_with_backup(&file_path, &moodboards)?;
    
    Ok(())
}

#[tauri::command]
pub async fn update_moodboard_item(
    state: State<'_, AppState>,
    moodboard_id: String,
    item_id: String,
    x: Option<f64>,
    y: Option<f64>,
    width: Option<f64>,
    height: Option<f64>,
) -> Result<Moodboard, String> {
    let file_path = state.data_dir
        .join("app_data")
        .join("moodboards.json");
    
    if !file_path.exists() {
        return Err("Moodboards file not found".to_string());
    }
    
    // Read existing moodboards
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read moodboards: {}", e))?;
    let mut moodboards: Vec<Moodboard> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse moodboards: {}", e))?;
    
    // Find and update the specific item
    let mut updated_moodboard = None;
    for moodboard in &mut moodboards {
        if moodboard.id == moodboard_id {
            // Find the specific item to update
            for item in &mut moodboard.items {
                if item.id == item_id {
                    // Update only the provided fields
                    if let Some(new_x) = x {
                        item.x = new_x;
                    }
                    if let Some(new_y) = y {
                        item.y = new_y;
                    }
                    if let Some(new_width) = width {
                        item.width = new_width;
                    }
                    if let Some(new_height) = height {
                        item.height = new_height;
                    }
                    break;
                }
            }
            moodboard.updated_at = Some(chrono::Utc::now().timestamp_millis());
            updated_moodboard = Some(moodboard.clone());
            break;
        }
    }
    
    if let Some(moodboard) = updated_moodboard {
        // Save back to file with backup
        write_moodboards_with_backup(&file_path, &moodboards)?;
        
        Ok(moodboard)
    } else {
        Err("Moodboard not found".to_string())
    }
}

#[tauri::command]
pub async fn delete_moodboard_item(
    state: State<'_, AppState>,
    moodboard_id: String,
    item_id: String,
) -> Result<Moodboard, String> {
    let file_path = state.data_dir
        .join("app_data")
        .join("moodboards.json");

    if !file_path.exists() {
        return Err("Moodboards file not found".to_string());
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read moodboards: {}", e))?;
    let mut moodboards: Vec<Moodboard> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse moodboards: {}", e))?;

    let mut updated_moodboard = None;
    for moodboard in &mut moodboards {
        if moodboard.id == moodboard_id {
            // Find the item we are deleting to get its file path
            if let Some(pos) = moodboard.items.iter().position(|item| item.id == item_id) {
                let item = moodboard.items[pos].clone();
                // Remove from list first
                moodboard.items.remove(pos);

                // Attempt to delete the physical file if url present and looks like a moodboard path
                if let Some(url) = item.url.clone() {
                    // Expecting something like "moodboards/{id}/{filename}"
                    if url.starts_with("moodboards/") {
                        let subpath = url.strip_prefix("moodboards/").unwrap_or(&url);
                        let full_path = state.library_dir
                            .join("Moodboards")
                            .join(subpath);
                        if full_path.exists() {
                            if let Err(e) = fs::remove_file(&full_path) {
                                eprintln!("Warning: failed to delete moodboard item file {:?}: {}", full_path, e);
                            }
                        }
                    }
                }

                moodboard.updated_at = Some(chrono::Utc::now().timestamp_millis());
                updated_moodboard = Some(moodboard.clone());
            }
            break;
        }
    }

    if let Some(moodboard) = updated_moodboard {
        write_moodboards_with_backup(&file_path, &moodboards)?;
        Ok(moodboard)
    } else {
        Err("Moodboard or item not found".to_string())
    }
}
