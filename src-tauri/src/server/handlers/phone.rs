//! Handlers for phone/extension server info endpoints.

use axum::{
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde_json::json;
use uuid::Uuid;

use crate::server::network::phone_info;
use crate::server::types::{
    PhoneTokenResponse,
    PHONE_TOKENS,
    PHONE_TOKEN_TTL_MS,
    get_active_port,
};
use crate::server::phone_upload_status;

/// Handler for GET /api/ping - returns a simple ok response with port.
pub async fn ping_handler() -> impl IntoResponse {
    Json(json!({
        "status": "ok",
        "port": get_active_port()
    }))
}

/// Handler for GET /api/phone-info - returns connection URLs for phone uploads.
pub async fn phone_info_handler() -> impl IntoResponse {
    Json(phone_info())
}

/// Handler for GET /api/phone-token - returns a short-lived upload token.
pub async fn phone_token_handler() -> impl IntoResponse {
    let status = phone_upload_status();
    if !status.enabled {
        return (StatusCode::SERVICE_UNAVAILABLE, "Phone uploads are off").into_response();
    }

    let token = Uuid::new_v4().to_string();
    let expires_at = Utc::now().timestamp_millis() + PHONE_TOKEN_TTL_MS;

    if let Ok(mut store) = PHONE_TOKENS.lock() {
        store.insert(token.clone(), expires_at);
    } else {
        return (StatusCode::INTERNAL_SERVER_ERROR, "Token store unavailable").into_response();
    }

    (StatusCode::OK, Json(PhoneTokenResponse { token, expires_at })).into_response()
}
