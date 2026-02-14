//! Phone upload server lifecycle management.

use std::net::{SocketAddr, TcpListener};
use std::thread;
use std::time::Duration;
use tokio::sync::oneshot;
use chrono::Utc;
use tauri::AppHandle;
use socket2::{Socket, Domain, Type, Protocol};

use super::types::{PhoneUploadStatusResponse, PHONE_SERVER_STATE, PHONE_UPLOAD_TTL_MS, DEFAULT_SERVER_PORT, FALLBACK_PORTS, set_active_port};
use super::token::clear_phone_tokens;
use super::router::build_router;

/// Tracks whether the server is bound to localhost only or all interfaces
#[derive(Clone, Copy, PartialEq, Eq, Default)]
pub enum ServerBindMode {
    #[default]
    NotRunning,
    LocalhostOnly,   // 127.0.0.1 - extension server
    AllInterfaces,   // 0.0.0.0 - phone upload server
}

/// Global to track current bind mode (separate from PhoneServerState to avoid breaking existing logic)
static BIND_MODE: std::sync::atomic::AtomicU8 = std::sync::atomic::AtomicU8::new(0);

fn get_bind_mode() -> ServerBindMode {
    match BIND_MODE.load(std::sync::atomic::Ordering::SeqCst) {
        1 => ServerBindMode::LocalhostOnly,
        2 => ServerBindMode::AllInterfaces,
        _ => ServerBindMode::NotRunning,
    }
}

fn set_bind_mode(mode: ServerBindMode) {
    let val = match mode {
        ServerBindMode::NotRunning => 0,
        ServerBindMode::LocalhostOnly => 1,
        ServerBindMode::AllInterfaces => 2,
    };
    BIND_MODE.store(val, std::sync::atomic::Ordering::SeqCst);
}

/// Schedules automatic shutdown of the phone server after expiration.
fn schedule_auto_shutdown(generation: u64, expires_at: i64) {
    if expires_at <= 0 {
        return;
    }
    thread::spawn(move || {
        let now = Utc::now().timestamp_millis();
        if expires_at > now {
            thread::sleep(Duration::from_millis((expires_at - now) as u64));
        }
        let should_stop = match PHONE_SERVER_STATE.lock() {
            Ok(state) => state.running && state.generation == generation && state.expires_at == expires_at,
            Err(_) => false,
        };
        if should_stop {
            stop_phone_server();
        }
    });
}

/// Stops the phone upload server.
pub fn stop_phone_server() -> PhoneUploadStatusResponse {
    let (shutdown_tx, join) = match PHONE_SERVER_STATE.lock() {
        Ok(mut state) => {
            if !state.running {
                return PhoneUploadStatusResponse { enabled: false, expires_at: 0 };
            }
            state.running = false;
            state.expires_at = 0;
            (state.shutdown_tx.take(), state.join.take())
        }
        Err(_) => return PhoneUploadStatusResponse { enabled: false, expires_at: 0 },
    };

    set_bind_mode(ServerBindMode::NotRunning);
    clear_phone_tokens();

    if let Some(tx) = shutdown_tx {
        let _ = tx.send(());
    }
    if let Some(handle) = join {
        let _ = handle.join();
    }

    PhoneUploadStatusResponse { enabled: false, expires_at: 0 }
}

/// Returns the current phone upload status.
/// Note: `enabled` is true only when the server is bound to all interfaces (0.0.0.0),
/// not when it's only bound to localhost (127.0.0.1 for extension server).
pub fn phone_upload_status() -> PhoneUploadStatusResponse {
    let now = Utc::now().timestamp_millis();
    let should_stop = match PHONE_SERVER_STATE.lock() {
        Ok(state) => state.running && state.expires_at > 0 && state.expires_at <= now,
        Err(_) => false,
    };

    if should_stop {
        let _ = stop_phone_server();
    }

    // Phone uploads are only enabled when server is bound to all interfaces
    let bind_mode = get_bind_mode();
    let phone_enabled = bind_mode == ServerBindMode::AllInterfaces;

    match PHONE_SERVER_STATE.lock() {
        Ok(state) => PhoneUploadStatusResponse {
            enabled: phone_enabled && state.running,
            expires_at: if phone_enabled { state.expires_at } else { 0 },
        },
        Err(_) => PhoneUploadStatusResponse { enabled: false, expires_at: 0 },
    }
}

/// Attempts to bind a single socket to the given address with SO_REUSEADDR.
fn try_bind_socket(addr: SocketAddr) -> Result<TcpListener, std::io::Error> {
    // Use socket2 to create socket, set options BEFORE binding
    let socket = Socket::new(Domain::IPV4, Type::STREAM, Some(Protocol::TCP))?;
    
    // Set SO_REUSEADDR BEFORE binding - critical for Windows TIME_WAIT handling
    if let Err(e) = socket.set_reuse_address(true) {
        eprintln!("Warning: Failed to set SO_REUSEADDR: {}", e);
    }
    
    // Bind the socket
    let socket_addr: socket2::SockAddr = addr.into();
    socket.bind(&socket_addr)?;
    
    // Start listening
    socket.listen(128)?;
    
    // Set non-blocking mode
    socket.set_nonblocking(true)?;
    
    // Convert to std TcpListener
    Ok(socket.into())
}

/// Creates a TCP listener, trying the default port first then fallback ports.
/// Returns the listener and the port it's bound to.
fn create_listener_with_fallback(bind_ip: &str, max_retries_per_port: u32, retry_delay_ms: u64) -> Result<(TcpListener, u16), String> {
    let mut all_errors = Vec::new();
    
    // Build list of ports to try: default first, then fallbacks
    let mut ports_to_try = vec![DEFAULT_SERVER_PORT];
    ports_to_try.extend_from_slice(&FALLBACK_PORTS);
    
    for port in ports_to_try {
        let addr: SocketAddr = format!("{}:{}", bind_ip, port).parse().unwrap();
        
        for attempt in 0..=max_retries_per_port {
            if attempt > 0 {
                thread::sleep(Duration::from_millis(retry_delay_ms));
            }
            
            match try_bind_socket(addr) {
                Ok(listener) => {
                    if port != DEFAULT_SERVER_PORT {
                        println!("Using fallback port {} (default port {} unavailable)", port, DEFAULT_SERVER_PORT);
                    }
                    if attempt > 0 {
                        println!("Successfully bound to {} after {} retries", addr, attempt);
                    }
                    return Ok((listener, port));
                }
                Err(e) => {
                    let error_kind = e.kind();
                    // For permission errors, try next port immediately (no point retrying same port)
                    if error_kind == std::io::ErrorKind::PermissionDenied {
                        eprintln!("Port {} permission denied, trying next port...", port);
                        all_errors.push(format!("Port {}: permission denied", port));
                        break; // Move to next port
                    }
                    // For address in use, retry a few times then move on
                    if error_kind == std::io::ErrorKind::AddrInUse {
                        if attempt < max_retries_per_port {
                            eprintln!("Port {} in use, retrying in {}ms...", port, retry_delay_ms);
                        } else {
                            eprintln!("Port {} in use after {} retries, trying next port...", port, max_retries_per_port + 1);
                            all_errors.push(format!("Port {}: in use", port));
                        }
                        continue;
                    }
                    // Other errors
                    all_errors.push(format!("Port {}: {}", port, e));
                    break; // Move to next port
                }
            }
        }
    }
    
    Err(format!(
        "Failed to start server - all ports unavailable. Tried ports {}, {}: {}. \
         This may be caused by Windows Firewall, antivirus software, or reserved port ranges. \
         Try adding a firewall exception for this application.",
        DEFAULT_SERVER_PORT,
        FALLBACK_PORTS.iter().map(|p| p.to_string()).collect::<Vec<_>>().join(", "),
        all_errors.join("; ")
    ))
}

/// Starts a persistent server for Chrome extension (runs indefinitely, no auto-shutdown).
pub fn start_extension_server(app_handle: AppHandle) -> Result<(), String> {
    // Check if server is already running
    if let Ok(state) = PHONE_SERVER_STATE.lock() {
        if state.running {
            return Ok(()); // Already running
        }
    }

    // Extension server only needs localhost, try with port fallback
    let (listener, port) = create_listener_with_fallback("127.0.0.1", 3, 200)?;
    set_active_port(port);

    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
    let join = thread::spawn(move || {
        let runtime = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");
        runtime.block_on(async move {
            let router = build_router(app_handle);
            let server = match axum::Server::from_tcp(listener) {
                Ok(server) => server,
                Err(err) => {
                    eprintln!("Failed to start extension server: {}", err);
                    return;
                }
            };
            let server = server
                .serve(router.into_make_service_with_connect_info::<SocketAddr>())
                .with_graceful_shutdown(async move {
                    let _ = shutdown_rx.await;
                });
            if let Err(err) = server.await {
                eprintln!("Extension server error: {}", err);
            }
        });
    });

    match PHONE_SERVER_STATE.lock() {
        Ok(mut state) => {
            state.running = true;
            state.expires_at = 0; // 0 means no expiration (extension server runs forever)
            state.shutdown_tx = Some(shutdown_tx);
            state.join = Some(join);
            state.generation = state.generation.wrapping_add(1);
        }
        Err(_) => {
            return Err("Phone server state lock poisoned".to_string());
        }
    };

    set_bind_mode(ServerBindMode::LocalhostOnly);
    println!("Extension server started on http://127.0.0.1:{}", port);
    Ok(())
}

/// Starts the phone upload server with a timeout.
fn start_phone_server(app_handle: AppHandle, duration_ms: i64) -> Result<PhoneUploadStatusResponse, String> {
    // Phone server needs to be accessible from LAN, try with port fallback
    let (listener, port) = create_listener_with_fallback("0.0.0.0", 3, 200)?;
    set_active_port(port);

    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
    let join = thread::spawn(move || {
        let runtime = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");
        runtime.block_on(async move {
            let router = build_router(app_handle);
            let server = match axum::Server::from_tcp(listener) {
                Ok(server) => server,
                Err(err) => {
                    eprintln!("Failed to start phone upload server: {}", err);
                    return;
                }
            };
            let server = server
                .serve(router.into_make_service_with_connect_info::<SocketAddr>())
                .with_graceful_shutdown(async move {
                    let _ = shutdown_rx.await;
                });
            if let Err(err) = server.await {
                eprintln!("Phone upload server error: {}", err);
            }
        });
    });

    let (generation, expires_at) = match PHONE_SERVER_STATE.lock() {
        Ok(mut state) => {
            state.running = true;
            state.expires_at = Utc::now().timestamp_millis() + duration_ms;
            state.shutdown_tx = Some(shutdown_tx);
            state.join = Some(join);
            state.generation = state.generation.wrapping_add(1);
            (state.generation, state.expires_at)
        }
        Err(_) => {
            return Err("Phone server state lock poisoned".to_string());
        }
    };

    set_bind_mode(ServerBindMode::AllInterfaces);
    println!("Phone upload server started on http://0.0.0.0:{}", port);
    schedule_auto_shutdown(generation, expires_at);
    Ok(PhoneUploadStatusResponse { enabled: true, expires_at })
}

/// Enables or disables phone uploads.
pub fn set_phone_upload_enabled(
    app_handle: AppHandle,
    enabled: bool,
    duration_ms: Option<i64>,
) -> Result<PhoneUploadStatusResponse, String> {
    if !enabled {
        // When disabling, stop the current server and restart extension server on localhost
        let _ = stop_phone_server();
        // Give Windows time to fully release the port
        thread::sleep(Duration::from_millis(100));
        // Restart extension server on localhost for Chrome extension
        return match start_extension_server(app_handle) {
            Ok(_) => Ok(PhoneUploadStatusResponse { enabled: false, expires_at: 0 }),
            Err(e) => Err(e),
        };
    }

    let duration = duration_ms.unwrap_or(PHONE_UPLOAD_TTL_MS).max(0);
    if duration == 0 {
        let _ = stop_phone_server();
        // Give Windows time to fully release the port
        thread::sleep(Duration::from_millis(100));
        return match start_extension_server(app_handle) {
            Ok(_) => Ok(PhoneUploadStatusResponse { enabled: false, expires_at: 0 }),
            Err(e) => Err(e),
        };
    }

    // Check if we need to restart the server on a different interface
    let current_bind_mode = get_bind_mode();
    
    // If server is bound to localhost only (extension server), we need to restart on all interfaces
    if current_bind_mode == ServerBindMode::LocalhostOnly {
        // Stop the localhost-only server
        stop_phone_server();
        // Give Windows time to fully release the port
        thread::sleep(Duration::from_millis(100));
        // Start on all interfaces for phone access
        return start_phone_server(app_handle, duration);
    }

    let now = Utc::now().timestamp_millis();
    let (should_start, generation, expires_at) = match PHONE_SERVER_STATE.lock() {
        Ok(mut state) => {
            if state.running {
                state.expires_at = now + duration;
                state.generation = state.generation.wrapping_add(1);
                (false, state.generation, state.expires_at)
            } else {
                (true, 0, 0)
            }
        }
        Err(_) => return Err("Phone server state lock poisoned".to_string()),
    };

    if should_start {
        return start_phone_server(app_handle, duration);
    }

    schedule_auto_shutdown(generation, expires_at);
    Ok(phone_upload_status())
}
