//! Token validation and management for phone uploads.

use std::net::IpAddr;
use axum::http::StatusCode;
use chrono::Utc;
use super::types::PHONE_TOKENS;
use super::phone_server::phone_upload_status;

/// Clears all phone upload tokens.
pub fn clear_phone_tokens() {
    if let Ok(mut store) = PHONE_TOKENS.lock() {
        store.clear();
    }
}

/// Validates a phone upload token.
/// 
/// Returns `Ok(())` if the token is valid, or an error tuple with status code and message.
/// Loopback addresses are always allowed without a token.
pub fn validate_token(addr: IpAddr, token: Option<&str>) -> Result<(), (StatusCode, &'static str)> {
    if !addr.is_loopback() && !phone_upload_status().enabled {
        return Err((StatusCode::SERVICE_UNAVAILABLE, "Phone uploads are off"));
    }
    if addr.is_loopback() {
        return Ok(());
    }

    let token = match token {
        Some(t) if !t.is_empty() => t,
        _ => return Err((StatusCode::UNAUTHORIZED, "Missing token")),
    };

    let now = Utc::now().timestamp_millis();
    if let Ok(mut store) = PHONE_TOKENS.lock() {
        store.retain(|_, exp| *exp > now);
        if let Some(exp) = store.get(token) {
            if *exp > now {
                return Ok(());
            }
        }
    }

    Err((StatusCode::UNAUTHORIZED, "Invalid or expired token"))
}
