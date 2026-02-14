use std::fs;
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use crate::models::Note;
use crate::state::AppState;

#[tauri::command]
pub async fn get_notes(
    state: State<'_, AppState>,
) -> Result<Vec<Note>, String> {
    // Notes metadata in cache/app_data
    let file_path = state.data_dir
        .join("app_data")
        .join("notes.json");

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read notes: {}", e))?;

    let notes: Vec<Note> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse notes: {}", e))?;

    Ok(notes)
}

#[tauri::command]
pub async fn create_note(
    state: State<'_, AppState>,
    title: String,
    content: String,
) -> Result<Note, String> {
    let json_path = state.data_dir
        .join("app_data")
        .join("notes.json");
    
    let file_content = fs::read_to_string(&json_path)
        .map_err(|e| format!("Failed to read notes: {}", e))?;

    let mut notes: Vec<Note> = serde_json::from_str(&file_content)
        .map_err(|e| format!("Failed to parse notes: {}", e))?;

    let now = Utc::now().timestamp();
    let note = Note {
        id: Uuid::new_v4().to_string(),
        title,
        content,
        created_at: now,
        updated_at: now,
    };

    notes.insert(0, note.clone());

    let updated_content = serde_json::to_string_pretty(&notes)
        .map_err(|e| format!("Failed to serialize notes: {}", e))?;

    fs::write(&json_path, updated_content)
        .map_err(|e| format!("Failed to write notes: {}", e))?;

    Ok(note)
}

#[tauri::command]
pub async fn update_note(
    state: State<'_, AppState>,
    id: String,
    title: Option<String>,
    content: Option<String>,
) -> Result<Note, String> {
    let json_path = state.data_dir
        .join("app_data")
        .join("notes.json");
    
    let file_content = fs::read_to_string(&json_path)
        .map_err(|e| format!("Failed to read notes: {}", e))?;

    let mut notes: Vec<Note> = serde_json::from_str(&file_content)
        .map_err(|e| format!("Failed to parse notes: {}", e))?;

    if let Some(note) = notes.iter_mut().find(|n| n.id == id) {
        if let Some(new_title) = title {
            note.title = new_title;
        }
        if let Some(new_content) = content {
            note.content = new_content;
        }
        note.updated_at = Utc::now().timestamp();

        let note_clone = note.clone();
        
        let updated_content = serde_json::to_string_pretty(&notes)
            .map_err(|e| format!("Failed to serialize notes: {}", e))?;

        fs::write(&json_path, updated_content)
            .map_err(|e| format!("Failed to write notes: {}", e))?;

        Ok(note_clone)
    } else {
        Err("Note not found".to_string())
    }
}

#[tauri::command]
pub async fn delete_note(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let json_path = state.data_dir
        .join("app_data")
        .join("notes.json");
    
    let file_content = fs::read_to_string(&json_path)
        .map_err(|e| format!("Failed to read notes: {}", e))?;

    let mut notes: Vec<Note> = serde_json::from_str(&file_content)
        .map_err(|e| format!("Failed to parse notes: {}", e))?;

    notes.retain(|note| note.id != id);

    let updated_content = serde_json::to_string_pretty(&notes)
        .map_err(|e| format!("Failed to serialize notes: {}", e))?;

    fs::write(&json_path, updated_content)
        .map_err(|e| format!("Failed to write notes: {}", e))?;

    Ok(())
}
