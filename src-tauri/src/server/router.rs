//! Axum router configuration for upload server.

use axum::{
    http::Method,
    response::Html,
    routing::{get, post},
    Router,
};
use tauri::AppHandle;
use tower_http::cors::{Any, CorsLayer};

use super::handlers::{
    phone_info_handler,
    phone_token_handler,
    ping_handler,
    upload_reference_handler,
    upload_reference_batch_handler,
    upload_photo_journal_handler,
    upload_photo_journal_batch_handler,
};
use super::phone_page::PHONE_UPLOAD_HTML;

/// Build the Axum router with all API routes and shared state.
pub fn build_router(app_handle: AppHandle) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    Router::new()
        .route("/api/ping", get(ping_handler))
        .route("/api/phone-info", get(phone_info_handler))
        .route("/api/phone-token", get(phone_token_handler))
        .route("/api/references", post(upload_reference_handler))
        .route("/api/references/batch", post(upload_reference_batch_handler))
        .route("/api/photo-journal", post(upload_photo_journal_handler))
        .route("/api/photo-journal/batch", post(upload_photo_journal_batch_handler))
        .route("/phone", get(|| async { Html(PHONE_UPLOAD_HTML) }))
        .with_state(app_handle)
        .layer(cors)
}
