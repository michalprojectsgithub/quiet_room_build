use std::fs;
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use base64::Engine;

use crate::models::{Reference, Folder, CropRect};
use crate::state::AppState;
use std::path::Path;

fn try_salvage_json_array(content: &str) -> Option<&str> {
    let idx = content.rfind(']')?;
    Some(&content[..=idx])
}

fn write_atomic(path: &Path, content: &str) -> Result<(), String> {
    let parent = path.parent().ok_or_else(|| "Invalid path".to_string())?;
    let tmp = parent.join(format!(
        "{}.tmp-{}",
        path.file_name().and_then(|s| s.to_str()).unwrap_or("references.json"),
        Uuid::new_v4()
    ));
    fs::write(&tmp, content).map_err(|e| format!("Failed to write temp references: {}", e))?;
    let _ = fs::remove_file(path);
    fs::rename(&tmp, path).map_err(|e| format!("Failed to replace references file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_references(
    state: State<'_, AppState>,
) -> Result<Vec<Reference>, String> {
    // Metadata in cache/app_data
    let file_path = state.data_dir
        .join("app_data")
        .join("references.json");

    println!("Attempting to read references from: {:?}", file_path);
    
    if !file_path.exists() {
        return Err(format!("References file does not exist: {:?}", file_path));
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read references: {}", e))?;

    println!("Successfully read references file, content length: {}", content.len());

    let references: Vec<Reference> = match serde_json::from_str(&content) {
        Ok(v) => v,
        Err(e) => {
            if let Some(salvaged) = try_salvage_json_array(&content) {
                if let Ok(v) = serde_json::from_str::<Vec<Reference>>(salvaged) {
                    let updated_content = serde_json::to_string_pretty(&v)
                        .map_err(|e| format!("Failed to serialize references: {}", e))?;
                    write_atomic(&file_path, &updated_content)?;
                    v
                } else {
                    return Err(format!("Failed to parse references: {}", e));
                }
            } else {
                return Err(format!("Failed to parse references: {}", e));
            }
        }
    };

    println!("Successfully parsed {} references", references.len());
    Ok(references)
}

#[tauri::command]
pub async fn delete_reference(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    // Metadata in cache/app_data
    let references_file = state.data_dir
        .join("app_data")
        .join("references.json");

    let content = fs::read_to_string(&references_file)
        .map_err(|e| format!("Failed to read references: {}", e))?;

    let mut references: Vec<Reference> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse references: {}", e))?;

    let reference_to_delete = references.iter()
        .find(|r| r.id == id)
        .ok_or_else(|| "Reference not found".to_string())?;
    
    let reference_location = reference_to_delete.location.clone();
    let reference_filename = reference_to_delete.filename.clone();
    let reference_folder_id = reference_to_delete.folder_id.clone();

    references.retain(|r| r.id != id);

    let updated_content = serde_json::to_string_pretty(&references)
        .map_err(|e| format!("Failed to serialize references: {}", e))?;

    write_atomic(&references_file, &updated_content)?;

    // Delete the actual image file from library
    let image_path = if reference_location.as_ref()
        .map_or(false, |loc| loc.contains("folder/")) {
        let location_parts: Vec<&str> = reference_location.as_ref()
            .unwrap().split('/').collect();
        if location_parts.len() > 1 {
            let folder_id = location_parts[1];
            // Read folders to get folder name
            let folders_file = state.data_dir
                .join("app_data")
                .join("folders.json");
            
            let folders_content = fs::read_to_string(&folders_file)
                .map_err(|e| format!("Failed to read folders: {}", e))?;
            
            let folders: Vec<Folder> = serde_json::from_str(&folders_content)
                .map_err(|e| format!("Failed to parse folders: {}", e))?;
            
            let folder = folders.iter().find(|f| f.id == folder_id);
            if let Some(folder) = folder {
                let folder_name = folder.physical_path.as_ref().unwrap_or(&folder.name);
                state.library_dir
                    .join("References")
                    .join("Folders")
                    .join(folder_name)
                    .join(&reference_filename)
            } else {
                state.library_dir
                    .join("References")
                    .join("Folders")
                    .join(folder_id)
                    .join(&reference_filename)
            }
        } else {
            state.library_dir
                .join("References")
                .join("Folders")
                .join(&reference_folder_id.as_ref().unwrap_or(&"".to_string()))
                .join(&reference_filename)
        }
    } else {
        // Main references - in library
        state.library_dir
            .join("References")
            .join("Main")
            .join(&reference_filename)
    };

    // Delete the image file if it exists
    if image_path.exists() {
        fs::remove_file(&image_path)
            .map_err(|e| format!("Failed to delete image file: {}", e))?;
    }
    
    // Also delete thumbnail if it exists
    let thumb_path = state.data_dir
        .join("thumbnails")
        .join("references")
        .join(format!("{}.thumb-360.jpg", 
            Path::new(&reference_filename).file_stem().and_then(|s| s.to_str()).unwrap_or("unknown")));
    if thumb_path.exists() {
        let _ = fs::remove_file(&thumb_path);
    }

    Ok(())
}

#[tauri::command]
pub async fn upload_reference(
    state: State<'_, AppState>,
    filename: String,
    original_name: String,
    data: Vec<u8>,
    folder_id: Option<String>,
) -> Result<Reference, String> {
    // Get physical path for folder if needed
    let physical_path = if let Some(folder_id) = &folder_id {
        let folders_path = state.data_dir.join("app_data").join("folders.json");
        let folders_content = fs::read_to_string(&folders_path)
            .map_err(|e| format!("Failed to read folders: {}", e))?;
        
        let folders: Vec<serde_json::Value> = serde_json::from_str(&folders_content)
            .map_err(|e| format!("Failed to parse folders: {}", e))?;
        
        let folder = folders.iter()
            .find(|f| f["id"].as_str() == Some(folder_id))
            .ok_or_else(|| format!("Folder with id {} not found", folder_id))?;
        
        folder["physicalPath"].as_str()
            .ok_or_else(|| format!("Physical path not found for folder {}", folder_id))?
            .to_string()
    } else {
        String::new()
    };

    // Images stored in library (user-owned)
    let target_dir = if folder_id.is_some() {
        state.library_dir.join("References").join("Folders").join(&physical_path)
    } else {
        state.library_dir.join("References").join("Main")
    };

    // Ensure directory exists
    if !target_dir.exists() {
        fs::create_dir_all(&target_dir)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let file_path = target_dir.join(&filename);

    // Write the image file
    fs::write(&file_path, data)
        .map_err(|e| format!("Failed to write reference: {}", e))?;

    // Create reference record
    let reference = Reference {
        id: Uuid::new_v4().to_string(),
        filename: filename.clone(),
        original_name,
        url: if folder_id.is_some() {
            format!("references/folders/{}/{}", physical_path, filename)
        } else {
            format!("references/main/{}", filename)
        },
        created_at: Utc::now().timestamp(),
        location: if let Some(ref folder_id) = folder_id { 
            Some(format!("folder/{}", folder_id)) 
        } else { 
            Some("main".to_string()) 
        },
        folder_id,
        tags: Vec::new(),
        image_note: None,
        image_source: None,
        rotation: 0,
        crop: None,
    };

    // Update JSON file in cache/app_data
    let json_path = state.data_dir.join("app_data").join("references.json");
    let content = fs::read_to_string(&json_path)
        .map_err(|e| format!("Failed to read references: {}", e))?;

    let mut references: Vec<Reference> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse references: {}", e))?;

    references.insert(0, reference.clone());

    let updated_content = serde_json::to_string_pretty(&references)
        .map_err(|e| format!("Failed to serialize references: {}", e))?;

    write_atomic(&json_path, &updated_content)?;

    Ok(reference)
}

#[tauri::command]
pub async fn set_reference_rotation(
    state: State<'_, AppState>,
    reference_id: String,
    rotation: i32,
) -> Result<Reference, String> {
    let references_file = state.data_dir
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

    let r = rotation.rem_euclid(360);
    references[idx].rotation = r;
    let updated_reference = references[idx].clone();

    let updated_content = serde_json::to_string_pretty(&references)
        .map_err(|e| format!("Failed to serialize references: {}", e))?;
    write_atomic(&references_file, &updated_content)?;

    Ok(updated_reference)
}

#[tauri::command]
pub async fn set_reference_crop(
    state: State<'_, AppState>,
    reference_id: String,
    crop: Option<CropRect>,
) -> Result<Reference, String> {
    let references_file = state.data_dir
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

    if let Some(c) = &crop {
        if c.w <= 0.0 || c.h <= 0.0 {
            return Err("Crop width/height must be > 0".to_string());
        }
        if c.x < 0.0 || c.y < 0.0 || c.x > 1.0 || c.y > 1.0 {
            return Err("Crop x/y must be within [0,1]".to_string());
        }
        if c.x + c.w > 1.00001 || c.y + c.h > 1.00001 {
            return Err("Crop rectangle must fit within [0,1] bounds".to_string());
        }
    }

    references[idx].crop = crop;
    let updated_reference = references[idx].clone();

    let updated_content = serde_json::to_string_pretty(&references)
        .map_err(|e| format!("Failed to serialize references: {}", e))?;
    write_atomic(&references_file, &updated_content)?;

    Ok(updated_reference)
}

#[tauri::command]
pub async fn move_reference(
    state: State<'_, AppState>,
    reference_id: String,
    target_folder_id: String,
) -> Result<Reference, String> {
    let references_file = state.data_dir
        .join("app_data")
        .join("references.json");

    let content = fs::read_to_string(&references_file)
        .map_err(|e| format!("Failed to read references: {}", e))?;

    let mut references: Vec<Reference> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse references: {}", e))?;

    let reference_to_move = references.iter()
        .find(|r| r.id == reference_id)
        .ok_or_else(|| "Reference not found".to_string())?
        .clone();

    let target_location = if target_folder_id == "main" {
        Some("main".to_string())
    } else {
        Some(format!("folder/{}", target_folder_id))
    };

    // Get source path from library
    let source_path = if reference_to_move.location.as_ref()
        .map_or(false, |loc| loc.contains("folder/")) {
        let location_parts: Vec<&str> = reference_to_move.location.as_ref()
            .unwrap().split('/').collect();
        if location_parts.len() > 1 {
            let folder_id = location_parts[1];
            let folders_file = state.data_dir.join("app_data").join("folders.json");
            
            let folders_content = fs::read_to_string(&folders_file)
                .map_err(|e| format!("Failed to read folders: {}", e))?;
            
            let folders: Vec<serde_json::Value> = serde_json::from_str(&folders_content)
                .map_err(|e| format!("Failed to parse folders: {}", e))?;
            
            let folder = folders.iter().find(|f| f["id"].as_str() == Some(folder_id));
            if let Some(folder) = folder {
                let folder_name = folder["physicalPath"].as_str().unwrap_or(folder_id);
                state.library_dir
                    .join("References")
                    .join("Folders")
                    .join(folder_name)
                    .join(&reference_to_move.filename)
            } else {
                state.library_dir
                    .join("References")
                    .join("Folders")
                    .join(folder_id)
                    .join(&reference_to_move.filename)
            }
        } else {
            state.library_dir
                .join("References")
                .join("Folders")
                .join(&reference_to_move.folder_id.as_ref().unwrap_or(&"".to_string()))
                .join(&reference_to_move.filename)
        }
    } else {
        state.library_dir
            .join("References")
            .join("Main")
            .join(&reference_to_move.filename)
    };

    // Get target path in library
    let target_path = if target_folder_id == "main" {
        state.library_dir
            .join("References")
            .join("Main")
            .join(&reference_to_move.filename)
    } else {
        let folders_file = state.data_dir.join("app_data").join("folders.json");
        
        let folders_content = fs::read_to_string(&folders_file)
            .map_err(|e| format!("Failed to read folders: {}", e))?;
        
        let folders: Vec<serde_json::Value> = serde_json::from_str(&folders_content)
            .map_err(|e| format!("Failed to parse folders: {}", e))?;
        
        let folder = folders.iter()
            .find(|f| f["id"].as_str() == Some(&target_folder_id))
            .ok_or_else(|| format!("Folder with id {} not found", target_folder_id))?;
        
        let physical_path = folder["physicalPath"].as_str()
            .ok_or_else(|| format!("Physical path not found for folder {}", target_folder_id))?;
        
        // Ensure target folder exists
        let target_folder = state.library_dir.join("References").join("Folders").join(physical_path);
        if !target_folder.exists() {
            fs::create_dir_all(&target_folder)
                .map_err(|e| format!("Failed to create target folder: {}", e))?;
        }
        
        target_folder.join(&reference_to_move.filename)
    };

    // Move the file
    if source_path.exists() {
        fs::rename(&source_path, &target_path)
            .map_err(|e| format!("Failed to move file: {}", e))?;
    }

    // Update the reference in the list
    if let Some(reference) = references.iter_mut().find(|r| r.id == reference_id) {
        reference.location = target_location.clone();
        reference.folder_id = if target_folder_id == "main" { None } else { Some(target_folder_id.clone()) };
        reference.url = if target_folder_id == "main" {
            format!("references/main/{}", reference.filename)
        } else {
            let folders_file = state.data_dir.join("app_data").join("folders.json");
            
            let folders_content = fs::read_to_string(&folders_file)
                .map_err(|e| format!("Failed to read folders: {}", e))?;
            
            let folders: Vec<serde_json::Value> = serde_json::from_str(&folders_content)
                .map_err(|e| format!("Failed to parse folders: {}", e))?;
            
            let folder = folders.iter()
                .find(|f| f["id"].as_str() == Some(&target_folder_id))
                .ok_or_else(|| format!("Folder with id {} not found", target_folder_id))?;
            
            let physical_path = folder["physicalPath"].as_str()
                .ok_or_else(|| format!("Physical path not found for folder {}", target_folder_id))?;
            
            format!("references/folders/{}/{}", physical_path, reference.filename)
        };
    }

    let updated_content = serde_json::to_string_pretty(&references)
        .map_err(|e| format!("Failed to serialize references: {}", e))?;

    write_atomic(&references_file, &updated_content)?;

    let updated_reference = references.iter()
        .find(|r| r.id == reference_id)
        .ok_or_else(|| "Reference not found after update".to_string())?
        .clone();

    Ok(updated_reference)
}

#[tauri::command]
pub async fn read_file_for_upload(
    file_path: String,
) -> Result<String, String> {
    let file_data = fs::read(&file_path)
        .map_err(|e| format!("Failed to read file {}: {}", file_path, e))?;
    
    let base64_data = base64::engine::general_purpose::STANDARD.encode(&file_data);
    
    Ok(base64_data)
}
