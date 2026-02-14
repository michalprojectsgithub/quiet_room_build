use std::fs;
use tauri::State;

use crate::models::Reference;
use crate::state::AppState;

// Global custom tags storage (unassigned tags live here)
fn tags_file_path(state: &State<'_, AppState>) -> std::path::PathBuf {
    state
        .data_dir
        .join("app_data")
        .join("tags.json")
}

#[tauri::command]
pub async fn add_tag_to_reference(
    state: State<'_, AppState>,
    reference_id: String,
    tag: String,
) -> Result<Reference, String> {
    let references_file = state
        .data_dir
        .join("app_data")
        .join("references.json");

    let content = fs::read_to_string(&references_file)
        .map_err(|e| format!("Failed to read references: {}", e))?;

    let mut references: Vec<Reference> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse references: {}", e))?;

    // Find index then mutate by index to avoid borrow conflicts
    let idx = references
        .iter()
        .position(|r| r.id == reference_id)
        .ok_or_else(|| "Reference not found".to_string())?;

    // Normalize tag (trim, lower for dedupe by value, but keep original case stored)
    let trimmed = tag.trim();
    if trimmed.is_empty() {
        return Err("Tag cannot be empty".to_string());
    }

    if !references[idx].tags.iter().any(|t| t.eq_ignore_ascii_case(trimmed)) {
        references[idx].tags.push(trimmed.to_string());
    }

    let updated_reference = references[idx].clone();

    let updated_content = serde_json::to_string_pretty(&references)
        .map_err(|e| format!("Failed to serialize references: {}", e))?;
    fs::write(&references_file, updated_content)
        .map_err(|e| format!("Failed to write references: {}", e))?;

    Ok(updated_reference)
}

#[tauri::command]
pub async fn remove_tag_from_reference(
    state: State<'_, AppState>,
    reference_id: String,
    tag: String,
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

    let tag_trimmed = tag.trim();
    references[idx].tags.retain(|t| !t.eq_ignore_ascii_case(tag_trimmed));

    let updated_reference = references[idx].clone();

    let updated_content = serde_json::to_string_pretty(&references)
        .map_err(|e| format!("Failed to serialize references: {}", e))?;
    fs::write(&references_file, updated_content)
        .map_err(|e| format!("Failed to write references: {}", e))?;

    Ok(updated_reference)
}

#[tauri::command]
pub async fn set_tags_for_reference(
    state: State<'_, AppState>,
    reference_id: String,
    tags: Vec<String>,
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

    // Clean + dedupe while preserving first occurrence casing
    let mut new_tags: Vec<String> = Vec::new();
    for t in tags {
        let trimmed = t.trim();
        if trimmed.is_empty() { continue; }
        if !new_tags.iter().any(|et| et.eq_ignore_ascii_case(trimmed)) {
            new_tags.push(trimmed.to_string());
        }
    }
    references[idx].tags = new_tags;

    let updated_reference = references[idx].clone();

    let updated_content = serde_json::to_string_pretty(&references)
        .map_err(|e| format!("Failed to serialize references: {}", e))?;
    fs::write(&references_file, updated_content)
        .map_err(|e| format!("Failed to write references: {}", e))?;

    Ok(updated_reference)
}

#[tauri::command]
pub async fn list_all_tags(
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let references_file = state
        .data_dir
        .join("app_data")
        .join("references.json");

    let content = fs::read_to_string(&references_file)
        .map_err(|e| format!("Failed to read references: {}", e))?;

    let references: Vec<Reference> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse references: {}", e))?;

    // Collect unique, case-insensitive set while keeping first casing
    let mut acc: Vec<String> = Vec::new();
    for r in references {
        for t in r.tags {
            if !acc.iter().any(|et| et.eq_ignore_ascii_case(&t)) {
                acc.push(t);
            }
        }
    }
    Ok(acc)
}

#[tauri::command]
pub async fn list_custom_tags(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    // Start from tags.json (may not exist yet)
    let tags_path = tags_file_path(&state);
    let mut tags: Vec<String> = if tags_path.exists() {
        let content = fs::read_to_string(&tags_path)
            .map_err(|e| format!("Failed to read tags: {}", e))?;
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse tags: {}", e))?
    } else {
        Vec::new()
    };

    // Merge in tags observed on references, so the list is comprehensive
    let references_file = state
        .data_dir
        .join("app_data")
        .join("references.json");
    if references_file.exists() {
        let content = fs::read_to_string(&references_file)
            .map_err(|e| format!("Failed to read references: {}", e))?;
        let references: Vec<Reference> = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse references: {}", e))?;
        for r in references {
            for t in r.tags {
                if !tags.iter().any(|et| et.eq_ignore_ascii_case(&t)) {
                    tags.push(t);
                }
            }
        }
    }

    Ok(tags)
}

#[tauri::command]
pub async fn create_custom_tag(state: State<'_, AppState>, name: String) -> Result<Vec<String>, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Tag cannot be empty".to_string());
    }

    let tags_path = tags_file_path(&state);
    // Ensure parent directory exists
    if let Some(parent) = tags_path.parent() { let _ = fs::create_dir_all(parent); }

    let mut tags: Vec<String> = if tags_path.exists() {
        let content = fs::read_to_string(&tags_path)
            .map_err(|e| format!("Failed to read tags: {}", e))?;
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse tags: {}", e))?
    } else {
        Vec::new()
    };

    if !tags.iter().any(|t| t.eq_ignore_ascii_case(trimmed)) {
        tags.push(trimmed.to_string());
    }

    let updated = serde_json::to_string_pretty(&tags)
        .map_err(|e| format!("Failed to serialize tags: {}", e))?;
    fs::write(&tags_path, updated).map_err(|e| format!("Failed to write tags: {}", e))?;

    Ok(tags)
}

#[tauri::command]
pub async fn delete_tag_everywhere(state: State<'_, AppState>, name: String) -> Result<(), String> {
    let tag = name.trim();
    if tag.is_empty() { return Err("Tag cannot be empty".to_string()); }

    // Remove from tags.json
    let tags_path = tags_file_path(&state);
    if tags_path.exists() {
        let content = fs::read_to_string(&tags_path)
            .map_err(|e| format!("Failed to read tags: {}", e))?;
        let mut tags: Vec<String> = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse tags: {}", e))?;
        tags.retain(|t| !t.eq_ignore_ascii_case(tag));
        let updated = serde_json::to_string_pretty(&tags)
            .map_err(|e| format!("Failed to serialize tags: {}", e))?;
        fs::write(&tags_path, updated).map_err(|e| format!("Failed to write tags: {}", e))?;
    }

    // Remove from all references
    let references_file = state
        .data_dir
        .join("app_data")
        .join("references.json");
    if references_file.exists() {
        let content = fs::read_to_string(&references_file)
            .map_err(|e| format!("Failed to read references: {}", e))?;
        let mut references: Vec<Reference> = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse references: {}", e))?;
        for r in references.iter_mut() {
            r.tags.retain(|t| !t.eq_ignore_ascii_case(tag));
        }
        let updated = serde_json::to_string_pretty(&references)
            .map_err(|e| format!("Failed to serialize references: {}", e))?;
        fs::write(&references_file, updated)
            .map_err(|e| format!("Failed to write references: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn rename_tag_everywhere(
    state: State<'_, AppState>,
    old_name: String,
    new_name: String,
) -> Result<(), String> {
    let old = old_name.trim();
    let newn = new_name.trim();
    if old.is_empty() || newn.is_empty() { return Err("Tag names cannot be empty".to_string()); }
    // Allow case-only renames by only short-circuiting when strings are exactly the same
    if old == newn { return Ok(()); }

    // Update tags.json
    let tags_path = tags_file_path(&state);
    if tags_path.exists() {
        let content = fs::read_to_string(&tags_path)
            .map_err(|e| format!("Failed to read tags: {}", e))?;
        let mut tags: Vec<String> = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse tags: {}", e))?;
        let mut replaced = false;
        for t in tags.iter_mut() {
            if t.eq_ignore_ascii_case(old) {
                *t = newn.to_string();
                replaced = true;
            }
        }
        if !replaced {
            // If old wasn't present, ensure new is present at least once
            if !tags.iter().any(|t| t.eq_ignore_ascii_case(&newn)) {
                tags.push(newn.to_string());
            }
        }
        // Dedupe (case-insensitive), keep first occurrence
        let mut dedup: Vec<String> = Vec::new();
        for t in tags.into_iter() {
            if !dedup.iter().any(|et| et.eq_ignore_ascii_case(&t)) {
                dedup.push(t);
            }
        }
        let updated = serde_json::to_string_pretty(&dedup)
            .map_err(|e| format!("Failed to serialize tags: {}", e))?;
        fs::write(&tags_path, updated).map_err(|e| format!("Failed to write tags: {}", e))?;
    }

    // Update references.json
    let references_file = state
        .data_dir
        .join("app_data")
        .join("references.json");
    if references_file.exists() {
        let content = fs::read_to_string(&references_file)
            .map_err(|e| format!("Failed to read references: {}", e))?;
        let mut references: Vec<Reference> = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse references: {}", e))?;
        for r in references.iter_mut() {
            // replace case-insensitive and dedupe
            let mut out: Vec<String> = Vec::new();
            for t in r.tags.iter() {
                if t.eq_ignore_ascii_case(old) {
                    if !out.iter().any(|et| et.eq_ignore_ascii_case(newn)) {
                        out.push(newn.to_string());
                    }
                } else {
                    if !out.iter().any(|et| et.eq_ignore_ascii_case(t)) {
                        out.push(t.clone());
                    }
                }
            }
            r.tags = out;
        }
        let updated = serde_json::to_string_pretty(&references)
            .map_err(|e| format!("Failed to serialize references: {}", e))?;
        fs::write(&references_file, updated)
            .map_err(|e| format!("Failed to write references: {}", e))?;
    }

    Ok(())
}


