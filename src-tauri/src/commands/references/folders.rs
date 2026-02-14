use std::fs;
use tauri::State;
use uuid::Uuid;
use chrono::Utc;

use crate::models::{Folder, Reference};
use crate::state::AppState;

#[tauri::command]
pub async fn get_folders(
    state: State<'_, AppState>,
) -> Result<Vec<Folder>, String> {
    // Metadata in cache/app_data
    let file_path = state.data_dir
        .join("app_data")
        .join("folders.json");

    println!("Attempting to read folders from: {:?}", file_path);
    
    if !file_path.exists() {
        return Err(format!("Folders file does not exist: {:?}", file_path));
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read folders: {}", e))?;

    println!("Successfully read folders file, content length: {}", content.len());

    let folders: Vec<Folder> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse folders: {}", e))?;

    println!("Successfully parsed {} folders", folders.len());
    Ok(folders)
}

#[tauri::command]
pub async fn create_folder(
    state: State<'_, AppState>,
    name: String,
) -> Result<Folder, String> {
    // Metadata in cache/app_data
    let folders_file = state.data_dir
        .join("app_data")
        .join("folders.json");

    // Read current folders
    let mut folders = if folders_file.exists() {
        let content = fs::read_to_string(&folders_file)
            .map_err(|e| format!("Failed to read folders: {}", e))?;
        serde_json::from_str::<Vec<Folder>>(&content)
            .map_err(|e| format!("Failed to parse folders: {}", e))?
    } else {
        Vec::new()
    };

    // Check if folder with same name already exists
    if folders.iter().any(|f| f.name == name) {
        return Err(format!("Folder with name '{}' already exists", name));
    }

    // Create new folder
    let new_folder = Folder {
        id: Uuid::new_v4().to_string(),
        name: name.clone(),
        created_at: Utc::now().timestamp_millis(),
        color: Some("#8b5cf6".to_string()), // Default purple color
        physical_path: Some(name.clone()),
    };

    // Add to folders list
    folders.push(new_folder.clone());

    // Write updated folders to file
    let updated_content = serde_json::to_string_pretty(&folders)
        .map_err(|e| format!("Failed to serialize folders: {}", e))?;
    
    fs::write(&folders_file, updated_content)
        .map_err(|e| format!("Failed to write folders: {}", e))?;

    // Create physical folder directory in library (user-owned)
    let folder_dir = state.library_dir
        .join("References")
        .join("Folders")
        .join(&name);
    
    fs::create_dir_all(&folder_dir)
        .map_err(|e| format!("Failed to create folder directory: {}", e))?;

    println!("Successfully created folder: {}", name);
    Ok(new_folder)
}

#[tauri::command]
pub async fn delete_folder(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    // Metadata in cache/app_data
    let folders_file = state.data_dir
        .join("app_data")
        .join("folders.json");

    // Read current folders
    let mut folders = if folders_file.exists() {
        let content = fs::read_to_string(&folders_file)
            .map_err(|e| format!("Failed to read folders: {}", e))?;
        serde_json::from_str::<Vec<Folder>>(&content)
            .map_err(|e| format!("Failed to parse folders: {}", e))?
    } else {
        return Err("No folders found".to_string());
    };

    // Find the folder to delete and get its name
    let folder_name = folders.iter()
        .find(|f| f.id == id)
        .map(|f| f.physical_path.as_ref().unwrap_or(&f.name).clone())
        .ok_or_else(|| format!("Folder with id {} not found", id))?;

    // Remove folder from list
    folders.retain(|f| f.id != id);

    // Write updated folders to file
    let updated_content = serde_json::to_string_pretty(&folders)
        .map_err(|e| format!("Failed to serialize folders: {}", e))?;
    
    fs::write(&folders_file, updated_content)
        .map_err(|e| format!("Failed to write folders: {}", e))?;

    // Delete physical folder directory from library
    let folder_dir = state.library_dir
        .join("References")
        .join("Folders")
        .join(&folder_name);
    
    if folder_dir.exists() {
        fs::remove_dir_all(&folder_dir)
            .map_err(|e| format!("Failed to delete folder directory: {}", e))?;
    }

    // Also remove any references that belong to this folder
    let references_file = state.data_dir
        .join("app_data")
        .join("references.json");

    if references_file.exists() {
        let content = fs::read_to_string(&references_file)
            .map_err(|e| format!("Failed to read references: {}", e))?;
        
        let mut references: Vec<Reference> = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse references: {}", e))?;

        // Remove references that belong to this folder
        let initial_count = references.len();
        references.retain(|r| r.folder_id.as_ref().map_or(true, |fid| fid != &id));
        let removed_count = initial_count - references.len();

        if removed_count > 0 {
            // Write updated references to file
            let updated_references_content = serde_json::to_string_pretty(&references)
                .map_err(|e| format!("Failed to serialize references: {}", e))?;
            
            fs::write(&references_file, updated_references_content)
                .map_err(|e| format!("Failed to write references: {}", e))?;
            
            println!("Removed {} references from deleted folder", removed_count);
        }
    }

    println!("Successfully deleted folder: {}", folder_name);
    Ok(())
}
