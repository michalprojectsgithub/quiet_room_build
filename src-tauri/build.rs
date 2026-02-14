fn main() {
    // Skip tauri-build completely for now
    println!("cargo:rerun-if-changed=src/main.rs");
}
