use std::fs;
use tauri::State;
use crate::state::AppState;

#[tauri::command]
pub async fn ping() -> Result<String, String> {
    Ok("pong".to_string())
}

// (Removed) generate_image command

// Storage commands for app preferences
#[tauri::command]
pub async fn get_storage_value(
    state: State<'_, AppState>,
    key: String,
) -> Result<Option<String>, String> {
    let storage_file = state.data_dir.join("app_data").join("app_storage.json");
    
    if !storage_file.exists() {
        return Ok(None);
    }
    
    let content = fs::read_to_string(&storage_file)
        .map_err(|e| format!("Failed to read storage: {}", e))?;
    
    let storage: std::collections::HashMap<String, String> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse storage: {}", e))?;
    
    Ok(storage.get(&key).cloned())
}

#[tauri::command]
pub async fn set_storage_value(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    let storage_file = state.data_dir.join("app_data").join("app_storage.json");
    
    let mut storage: std::collections::HashMap<String, String> = if storage_file.exists() {
        let content = fs::read_to_string(&storage_file)
            .map_err(|e| format!("Failed to read storage: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse storage: {}", e))?
    } else {
        std::collections::HashMap::new()
    };
    
    storage.insert(key, value);
    
    let updated_content = serde_json::to_string_pretty(&storage)
        .map_err(|e| format!("Failed to serialize storage: {}", e))?;
    
    fs::write(&storage_file, updated_content)
        .map_err(|e| format!("Failed to write storage: {}", e))?;
    
    Ok(())
}
