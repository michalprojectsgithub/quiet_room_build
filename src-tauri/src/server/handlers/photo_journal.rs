//! Handlers for photo journal image uploads (single and batch).

use axum::{
    extract::{Multipart, Query, ConnectInfo, State},
    response::IntoResponse,
    http::StatusCode,
};
use tauri::{AppHandle, Manager};
use std::net::SocketAddr;
use std::fs;
use uuid::Uuid;
use chrono::Utc;

use crate::server::types::TokenQuery;
use crate::server::token::validate_token;

/// Handler for POST /api/photo-journal - uploads a single photo journal image.
pub async fn upload_photo_journal_handler(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Query(params): Query<TokenQuery>,
    State(app_handle): State<AppHandle>,
    mut multipart: Multipart
) -> impl IntoResponse {
    if let Err(err) = validate_token(addr.ip(), params.token.as_deref()) {
        return err.into_response();
    }

    // Expect a single field named 'image'
    let mut filename: Option<String> = None;
    let mut bytes: Option<Vec<u8>> = None;
    let mut original_name: Option<String> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().map(|s| s.to_string());
        if name.as_deref() == Some("image") {
            let fname = field.file_name().map(|s| s.to_string())
                .unwrap_or_else(|| format!("image-{}.jpg", Uuid::new_v4()));
            original_name = Some(fname.clone());
            let extension = fname.rsplit('.').next().unwrap_or("jpg");
            filename = Some(format!("{}-{}.{}", Utc::now().timestamp_millis(), Uuid::new_v4(), extension));
            match field.bytes().await {
                Ok(data) => bytes = Some(data.to_vec()),
                Err(_) => return (StatusCode::BAD_REQUEST, "Invalid image").into_response(),
            }
        }
    }

    let filename = match filename { Some(f) => f, None => return (StatusCode::BAD_REQUEST, "Missing file").into_response() };
    let data = match bytes { Some(b) => b, None => return (StatusCode::BAD_REQUEST, "Missing data").into_response() };
    let original_name = original_name.unwrap_or_else(|| filename.clone());

    let state = app_handle.state::<crate::AppState>();
    let images_dir = state.library_dir.join("Artwork Journal");
    let app_data_dir = state.data_dir.join("app_data");
    let json_path = app_data_dir.join("photo_journal.json");

    if let Err(e) = fs::create_dir_all(&images_dir) {
        eprintln!("Failed creating Artwork Journal dir: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "FS error").into_response();
    }
    if let Err(e) = fs::create_dir_all(&app_data_dir) {
        eprintln!("Failed creating app_data dir: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "FS error").into_response();
    }

    let file_path = images_dir.join(&filename);
    if let Err(e) = fs::write(&file_path, &data) {
        eprintln!("Failed writing file: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "Write error").into_response();
    }

    let mime = match std::path::Path::new(&filename).extension().and_then(|s| s.to_str()) {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        _ => "image/jpeg",
    };

    let record = serde_json::json!({
        "id": Uuid::new_v4().to_string(),
        "filename": filename,
        "originalName": original_name,
        "url": format!("artwork_journal/{}", file_path.file_name().unwrap().to_string_lossy()),
        "uploadDate": Utc::now().to_rfc3339(),
        "size": file_path.metadata().map(|m| m.len()).unwrap_or(0),
        "mimetype": mime,
        "prompt": serde_json::Value::Null,
        "referenceId": serde_json::Value::Null,
        "rotation": 0
    });

    let mut images: Vec<serde_json::Value> = match fs::read_to_string(&json_path) {
        Ok(content) if !content.trim().is_empty() => serde_json::from_str(&content).unwrap_or_else(|_| Vec::new()),
        _ => Vec::new(),
    };
    images.insert(0, record.clone());

    if let Err(e) = fs::write(&json_path, serde_json::to_string_pretty(&images).unwrap_or("[]".to_string())) {
        eprintln!("Failed updating photo_journal.json: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "JSON write error").into_response();
    }

    let _ = app_handle.emit_all("photo_journal_updated", record.clone());

    (StatusCode::OK, axum::Json(record)).into_response()
}

/// Handler for POST /api/photo-journal/batch - uploads multiple photo journal images.
pub async fn upload_photo_journal_batch_handler(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Query(params): Query<TokenQuery>,
    State(app_handle): State<AppHandle>,
    mut multipart: Multipart
) -> impl IntoResponse {
    if let Err(err) = validate_token(addr.ip(), params.token.as_deref()) {
        return err.into_response();
    }

    let state = app_handle.state::<crate::AppState>();
    let images_dir = state.library_dir.join("Artwork Journal");
    let app_data_dir = state.data_dir.join("app_data");
    let json_path = app_data_dir.join("photo_journal.json");

    if let Err(e) = fs::create_dir_all(&images_dir) {
        eprintln!("Failed creating Artwork Journal dir: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "FS error").into_response();
    }
    if let Err(e) = fs::create_dir_all(&app_data_dir) {
        eprintln!("Failed creating app_data dir: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "FS error").into_response();
    }

    let mut images: Vec<serde_json::Value> = match fs::read_to_string(&json_path) {
        Ok(content) if !content.trim().is_empty() => serde_json::from_str(&content).unwrap_or_else(|_| Vec::new()),
        _ => Vec::new(),
    };

    let mut successes: Vec<serde_json::Value> = Vec::new();
    let mut failures: Vec<serde_json::Value> = Vec::new();
    let mut idx: usize = 0;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().map(|s| s.to_string());
        if name.as_deref() != Some("image") {
            continue;
        }

        let original_name = field.file_name().map(|s| s.to_string())
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
                failures.push(serde_json::json!({
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
            eprintln!("Failed writing file: {}", e);
            failures.push(serde_json::json!({
                "index": idx,
                "originalName": original_name,
                "error": "Write error"
            }));
            idx += 1;
            continue;
        }

        let mime = match std::path::Path::new(&filename).extension().and_then(|s| s.to_str()) {
            Some("png") => "image/png",
            Some("jpg") | Some("jpeg") => "image/jpeg",
            Some("webp") => "image/webp",
            _ => "image/jpeg",
        };

        let record = serde_json::json!({
            "id": Uuid::new_v4().to_string(),
            "filename": filename,
            "originalName": original_name,
            "url": format!("artwork_journal/{}", file_path.file_name().unwrap().to_string_lossy()),
            "uploadDate": Utc::now().to_rfc3339(),
            "size": file_path.metadata().map(|m| m.len()).unwrap_or(0),
            "mimetype": mime,
            "prompt": serde_json::Value::Null,
            "referenceId": serde_json::Value::Null,
            "rotation": 0
        });

        images.insert(0, record.clone());
        successes.push(serde_json::json!({
            "index": idx,
            "id": record["id"],
            "filename": record["filename"],
            "originalName": record["originalName"]
        }));

        let _ = app_handle.emit_all("photo_journal_updated", record.clone());
        idx += 1;
    }

    if let Err(e) = fs::write(&json_path, serde_json::to_string_pretty(&images).unwrap_or("[]".to_string())) {
        eprintln!("Failed updating photo_journal.json: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, "JSON write error").into_response();
    }

    let resp = serde_json::json!({
        "success": !successes.is_empty(),
        "count": successes.len(),
        "items": successes,
        "failures": failures
    });

    (StatusCode::OK, axum::Json(resp)).into_response()
}
