//! Type definitions and global state for the phone upload server.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::atomic::{AtomicU16, Ordering};
use std::thread;
use tokio::sync::oneshot;
use once_cell::sync::Lazy;

/// Time-to-live for phone upload tokens (15 minutes).
pub const PHONE_TOKEN_TTL_MS: i64 = 15 * 60 * 1000;

/// Default time-to-live for phone upload sessions (10 minutes).
pub const PHONE_UPLOAD_TTL_MS: i64 = 10 * 60 * 1000;

/// Default port for the server.
pub const DEFAULT_SERVER_PORT: u16 = 8787;

/// Ports to try if the default is unavailable.
pub const FALLBACK_PORTS: [u16; 5] = [8788, 8789, 8790, 8800, 8880];

/// Currently active server port (0 means not running).
pub static ACTIVE_PORT: AtomicU16 = AtomicU16::new(0);

/// Get the currently active server port, or default if not running.
pub fn get_active_port() -> u16 {
    let port = ACTIVE_PORT.load(Ordering::SeqCst);
    if port == 0 { DEFAULT_SERVER_PORT } else { port }
}

/// Set the currently active server port.
pub fn set_active_port(port: u16) {
    ACTIVE_PORT.store(port, Ordering::SeqCst);
}

/// Global store for phone upload tokens with their expiration times.
pub static PHONE_TOKENS: Lazy<Mutex<HashMap<String, i64>>> = Lazy::new(|| Mutex::new(HashMap::new()));

/// Global state for the phone upload server.
pub static PHONE_SERVER_STATE: Lazy<Mutex<PhoneServerState>> = Lazy::new(|| Mutex::new(PhoneServerState::default()));

/// Response for phone token generation.
#[derive(Serialize)]
pub struct PhoneTokenResponse {
    pub token: String,
    pub expires_at: i64,
}

/// Response for phone upload status queries.
#[derive(Serialize, Clone)]
pub struct PhoneUploadStatusResponse {
    pub enabled: bool,
    pub expires_at: i64,
}

/// Internal state for the phone upload server.
#[derive(Default)]
pub struct PhoneServerState {
    pub running: bool,
    pub expires_at: i64,
    pub shutdown_tx: Option<oneshot::Sender<()>>,
    pub join: Option<thread::JoinHandle<()>>,
    pub generation: u64,
}

/// Information about a network interface for phone uploads.
#[derive(Serialize, Clone)]
pub struct PhoneInterface {
    pub name: String,
    pub ip: String,
    pub url: String,
    pub is_loopback: bool,
    pub is_private: bool,
    pub is_link_local: bool,
    pub is_virtual: bool,
}

/// Response containing phone upload connection information.
#[derive(Serialize)]
pub struct PhoneInfoResponse {
    pub port: u16,
    pub urls: Vec<String>,
    pub preferred_url: String,
    pub interfaces: Vec<PhoneInterface>,
}

/// Query parameters for token validation.
#[derive(Deserialize)]
pub struct TokenQuery {
    pub token: Option<String>,
}
