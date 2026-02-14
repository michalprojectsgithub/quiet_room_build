//! Handlers for reference image uploads (single and batch).

use axum::{
    extract::{ConnectInfo, Multipart, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde_json::json;
use std::fs;
use std::net::SocketAddr;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use crate::models::Reference;
use crate::server::token::validate_token;
use crate::server::types::TokenQuery;

fn read_references(json_path: &std::path::Path) -> Vec<Reference> {
    match fs::read_to_string(json_path) {
        Ok(content) if !content.trim().is_empty() => {
            serde_json::from_str(&content).unwrap_or_else(|_| Vec::new())
        }
        _ => Vec::new(),
    }
}

fn write_references(json_path: &std::path::Path, references: &[Reference]) -> Result<(), String> {
    let content = serde_json::to_string_pretty(&references)
        .map_err(|e| format!("Failed to serialize references: {}", e))?;
    fs::write(json_path, content).map_err(|e| format!("Failed to write references.json: {}", e))
}

fn ensure_references_paths(app_handle: &AppHandle) -> Result<(std::path::PathBuf, std::path::PathBuf), String> {
    let state = app_handle.state::<crate::AppState>();
    let images_dir = state.library_dir.join("References").join("Main");
    let app_data_dir = state.data_dir.join("app_data");
    let json_path = app_data_dir.join("references.json");

    fs::create_dir_all(&images_dir)
        .map_err(|e| format!("Failed to create References dir: {}", e))?;
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app_data dir: {}", e))?;
    if !json_path.exists() {
        fs::write(&json_path, "[]").map_err(|e| format!("Failed to create references.json: {}", e))?;
    }

    Ok((images_dir, json_path))
}

fn unique_filename_if_needed(images_dir: &std::path::Path, filename: &str) -> String {
    let mut candidate = filename.to_string();
    if images_dir.join(&candidate).exists() {
        let extension = filename
            .rsplit('.')
            .next()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty() && *s != filename)
            .unwrap_or("jpg");
        candidate = format!("{}-{}.{}", Utc::now().timestamp_millis(), Uuid::new_v4(), extension);
    }
    candidate
}

fn build_reference(filename: String, original_name: String) -> Reference {
    Reference {
        id: Uuid::new_v4().to_string(),
        filename: filename.clone(),
        original_name,
        url: format!("references/main/{}", filename),
        created_at: Utc::now().timestamp(),
        location: Some("main".to_string()),
        folder_id: None,
        tags: Vec::new(),
        image_note: None,
        image_source: None,
        rotation: 0,
        crop: None,
    }
}

/// Handler for POST /api/references - uploads a single reference image.
pub async fn upload_reference_handler(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Query(params): Query<TokenQuery>,
    State(app_handle): State<AppHandle>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    if let Err(err) = validate_token(addr.ip(), params.token.as_deref()) {
        return err.into_response();
    }

    let (images_dir, json_path) = match ensure_references_paths(&app_handle) {
        Ok(paths) => paths,
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, err).into_response(),
    };

    let mut filename: Option<String> = None;
    let mut original_name: Option<String> = None;
    let mut bytes: Option<Vec<u8>> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().map(|s| s.to_string());
        if name.as_deref() == Some("image") {
            let fname = field
                .file_name()
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("image-{}.jpg", Uuid::new_v4()));
            original_name = Some(fname.clone());
            filename = Some(fname);
            match field.bytes().await {
                Ok(data) => bytes = Some(data.to_vec()),
                Err(_) => return (StatusCode::BAD_REQUEST, "Invalid image").into_response(),
            }
        }
    }

    let filename = match filename {
        Some(f) => f,
        None => return (StatusCode::BAD_REQUEST, "Missing file").into_response(),
    };
    let data = match bytes {
        Some(b) => b,
        None => return (StatusCode::BAD_REQUEST, "Missing data").into_response(),
    };
    let original_name = original_name.unwrap_or_else(|| filename.clone());

    let filename = unique_filename_if_needed(&images_dir, &filename);
    let file_path = images_dir.join(&filename);
    if let Err(e) = fs::write(&file_path, &data) {
        eprintln!("Failed writing reference image: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "Write error").into_response();
    }

    let mut references = read_references(&json_path);
    let reference = build_reference(filename.clone(), original_name.clone());
    references.insert(0, reference.clone());

    if let Err(e) = write_references(&json_path, &references) {
        return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
    }

    let _ = app_handle.emit_all("references_updated", json!({
        "id": reference.id,
        "filename": reference.filename,
        "originalName": reference.original_name,
        "url": reference.url,
        "createdAt": reference.created_at
    }));

    (StatusCode::OK, Json(json!({
        "success": true,
        "filename": reference.filename,
        "id": reference.id
    }))).into_response()
}

/// Handler for POST /api/references/batch - uploads multiple reference images.
pub async fn upload_reference_batch_handler(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Query(params): Query<TokenQuery>,
    State(app_handle): State<AppHandle>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    if let Err(err) = validate_token(addr.ip(), params.token.as_deref()) {
        return err.into_response();
    }

    let (images_dir, json_path) = match ensure_references_paths(&app_handle) {
        Ok(paths) => paths,
        Err(err) => return (StatusCode::INTERNAL_SERVER_ERROR, err).into_response(),
    };

    let mut references = read_references(&json_path);
    let mut successes: Vec<serde_json::Value> = Vec::new();
    let mut failures: Vec<serde_json::Value> = Vec::new();
    let mut idx: usize = 0;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().map(|s| s.to_string());
        if name.as_deref() != Some("image") {
            continue;
        }

        let original_name = field
            .file_name()
            .map(|s| s.to_string())
            .unwrap_or_else(|| format!("image-{}.jpg", Uuid::new_v4()));

        let extension = original_name
            .rsplit('.')
            .next()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty() && *s != original_name)
            .unwrap_or("jpg");

        let filename = format!("{}-{}.{}", Utc::now().timestamp_millis(), Uuid::new_v4(), extension);

        let data = match field.bytes().await {
            Ok(data) => data.to_vec(),
            Err(_) => {
                failures.push(json!({
                    "index": idx,
                    "originalName": original_name,
                    "error": "Invalid image"
                }));
                idx += 1;
                continue;
            }
        };

        let file_path = images_dir.join(&filename);
        if let Err(e) = fs::write(&file_path, &data) {
            eprintln!("Failed writing reference image: {}", e);
            failures.push(json!({
                "index": idx,
                "originalName": original_name,
                "error": "Write error"
            }));
            idx += 1;
            continue;
        }

        let reference = build_reference(filename.clone(), original_name.clone());
        references.insert(0, reference.clone());

        successes.push(json!({
            "index": idx,
            "id": reference.id,
            "filename": reference.filename,
            "originalName": reference.original_name
        }));

        let _ = app_handle.emit_all("references_updated", json!({
            "id": reference.id,
            "filename": reference.filename,
            "originalName": reference.original_name,
            "url": reference.url,
            "createdAt": reference.created_at
        }));

        idx += 1;
    }

    if let Err(e) = write_references(&json_path, &references) {
        return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
    }

    (StatusCode::OK, Json(json!({
        "success": !successes.is_empty(),
        "count": successes.len(),
        "items": successes,
        "failures": failures
    }))).into_response()
}
