//! Network utilities for detecting local IP addresses and interfaces.

use std::net::IpAddr;
use local_ip_address::list_afinet_netifas;
use super::types::{PhoneInterface, PhoneInfoResponse, get_active_port};

/// Checks if a network interface name indicates a virtual adapter.
pub fn is_virtual_name(name: &str) -> bool {
    let n = name.to_lowercase();
    n.contains("virtual")
        || n.contains("vmware")
        || n.contains("hyper-v")
        || n.contains("vbox")
        || n.contains("loopback")
        || n.contains("docker")
        || n.contains("wsl")
        || n.contains("bridge")
}

/// Returns a list of local IPv4 interfaces with their properties.
pub fn local_ipv4s() -> Vec<PhoneInterface> {
    let port = get_active_port();
    let mut interfaces = Vec::new();
    if let Ok(list) = list_afinet_netifas() {
        for (name, ip) in list {
            let ip_v4 = match ip {
                IpAddr::V4(v4) => v4,
                _ => continue,
            };
            let is_loopback = ip_v4.is_loopback();
            let is_private = ip_v4.is_private();
            let is_link_local = ip_v4.is_link_local();
            let is_virtual = is_virtual_name(&name);
            let ip_str = ip_v4.to_string();
            interfaces.push(PhoneInterface {
                name,
                ip: ip_str.clone(),
                url: format!("http://{}:{}/phone", ip_str, port),
                is_loopback,
                is_private,
                is_link_local,
                is_virtual,
            });
        }
    }
    interfaces
}

/// Picks the preferred URL from a list of interfaces.
/// Prefers non-loopback, non-link-local, private, non-virtual interfaces.
pub fn pick_preferred(interfaces: &[PhoneInterface]) -> Option<String> {
    let mut candidates: Vec<&PhoneInterface> = interfaces.iter().collect();
    candidates.sort_by_key(|i| (
        i.is_loopback,
        i.is_link_local,
        !i.is_private,
        i.is_virtual
    ));
    candidates.first().map(|i| i.url.clone())
}

/// Returns complete phone upload connection information.
pub fn phone_info() -> PhoneInfoResponse {
    let port = get_active_port();
    let mut interfaces = local_ipv4s();

    if interfaces.is_empty() {
        interfaces.push(PhoneInterface {
            name: "loopback".to_string(),
            ip: "127.0.0.1".to_string(),
            url: format!("http://127.0.0.1:{}/phone", port),
            is_loopback: true,
            is_private: false,
            is_link_local: false,
            is_virtual: false,
        });
    }

    let urls: Vec<String> = interfaces.iter().map(|i| i.url.clone()).collect();
    let preferred_url = pick_preferred(&interfaces).unwrap_or_else(|| urls[0].clone());

    PhoneInfoResponse { port, urls, preferred_url, interfaces }
}
