use tauri::AppHandle;

use crate::server::{
    phone_info,
    phone_upload_status as read_phone_upload_status,
    set_phone_upload_enabled,
    PhoneInfoResponse,
    PhoneUploadStatusResponse,
};

#[tauri::command]
pub async fn phone_upload_status() -> Result<PhoneUploadStatusResponse, String> {
    Ok(read_phone_upload_status())
}

#[tauri::command]
pub async fn phone_upload_toggle(
    app: AppHandle,
    enabled: bool,
    duration_ms: Option<i64>,
) -> Result<PhoneUploadStatusResponse, String> {
    set_phone_upload_enabled(app, enabled, duration_ms)
}

#[tauri::command]
pub async fn phone_upload_info() -> Result<PhoneInfoResponse, String> {
    Ok(phone_info())
}
