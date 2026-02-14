use std::fs;
use tauri::State;

use crate::models::{Reference, ImageNote, ImageSource};
use crate::state::AppState;
use chrono::Utc;

#[tauri::command]
pub async fn set_image_note(
    state: State<'_, AppState>,
    reference_id: String,
    text: String,
) -> Result<Reference, String> {
    let references_file = state
        .data_dir
        .join("app_data")
        .join("references.json");

    let content = fs::read_to_string(&references_file)
        .map_err(|e| format!("Failed to read references: {}", e))?;

    let mut references: Vec<Reference> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse references: {}", e))?;

    let idx = references
        .iter()
        .position(|r| r.id == reference_id)
        .ok_or_else(|| "Reference not found".to_string())?;

    references[idx].image_note = Some(ImageNote { text, updated_at: Utc::now().timestamp_millis() });

    let updated_reference = references[idx].clone();

    let updated_content = serde_json::to_string_pretty(&references)
        .map_err(|e| format!("Failed to serialize references: {}", e))?;
    fs::write(&references_file, updated_content)
        .map_err(|e| format!("Failed to write references: {}", e))?;

    Ok(updated_reference)
}

#[tauri::command]
pub async fn delete_image_note(
    state: State<'_, AppState>,
    reference_id: String,
) -> Result<Reference, String> {
    let references_file = state
        .data_dir
        .join("app_data")
        .join("references.json");

    let content = fs::read_to_string(&references_file)
        .map_err(|e| format!("Failed to read references: {}", e))?;

    let mut references: Vec<Reference> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse references: {}", e))?;

    let idx = references
        .iter()
        .position(|r| r.id == reference_id)
        .ok_or_else(|| "Reference not found".to_string())?;

    references[idx].image_note = None;

    let updated_reference = references[idx].clone();

    let updated_content = serde_json::to_string_pretty(&references)
        .map_err(|e| format!("Failed to serialize references: {}", e))?;
    fs::write(&references_file, updated_content)
        .map_err(|e| format!("Failed to write references: {}", e))?;

    Ok(updated_reference)
}

#[tauri::command]
pub async fn set_image_source(
    state: State<'_, AppState>,
    reference_id: String,
    text: String,
) -> Result<Reference, String> {
    let references_file = state
        .data_dir
        .join("app_data")
        .join("references.json");

    let content = fs::read_to_string(&references_file)
        .map_err(|e| format!("Failed to read references: {}", e))?;

    let mut references: Vec<Reference> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse references: {}", e))?;

    let idx = references
        .iter()
        .position(|r| r.id == reference_id)
        .ok_or_else(|| "Reference not found".to_string())?;

    references[idx].image_source = Some(ImageSource { text, updated_at: Utc::now().timestamp_millis() });

    let updated_reference = references[idx].clone();

    let updated_content = serde_json::to_string_pretty(&references)
        .map_err(|e| format!("Failed to serialize references: {}", e))?;
    fs::write(&references_file, updated_content)
        .map_err(|e| format!("Failed to write references: {}", e))?;

    Ok(updated_reference)
}

#[tauri::command]
pub async fn delete_image_source(
    state: State<'_, AppState>,
    reference_id: String,
) -> Result<Reference, String> {
    let references_file = state
        .data_dir
        .join("app_data")
        .join("references.json");

    let content = fs::read_to_string(&references_file)
        .map_err(|e| format!("Failed to read references: {}", e))?;

    let mut references: Vec<Reference> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse references: {}", e))?;

    let idx = references
        .iter()
        .position(|r| r.id == reference_id)
        .ok_or_else(|| "Reference not found".to_string())?;

    references[idx].image_source = None;

    let updated_reference = references[idx].clone();

    let updated_content = serde_json::to_string_pretty(&references)
        .map_err(|e| format!("Failed to serialize references: {}", e))?;
    fs::write(&references_file, updated_content)
        .map_err(|e| format!("Failed to write references: {}", e))?;

    Ok(updated_reference)
}


