//! Upload server module for handling phone and extension uploads.
//!
//! This module provides an HTTP server for:
//! - Phone uploads via QR code/local network
//! - Chrome extension uploads
//! - Reference and photo journal image handling
//!
//! ## Module Structure
//!
//! - `types`: Type definitions and global state
//! - `network`: Network interface detection utilities
//! - `token`: Upload token validation and management
//! - `phone_server`: Server lifecycle management
//! - `phone_page`: Embedded HTML upload page
//! - `router`: Axum router configuration
//! - `handlers`: HTTP request handlers
//!   - `phone`: Phone info and token endpoints
//!   - `references`: Reference image upload handlers
//!   - `photo_journal`: Photo journal upload handlers

pub mod types;
pub mod network;
pub mod token;
pub mod phone_server;
pub mod phone_page;
pub mod router;
pub mod handlers;

// Re-export commonly used items for external use
pub use types::{PhoneUploadStatusResponse, PhoneInfoResponse};
pub use network::phone_info;
pub use phone_server::{
    phone_upload_status,
    set_phone_upload_enabled,
    start_extension_server,
};
