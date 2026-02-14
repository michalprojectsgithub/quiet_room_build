// References module split into submodules to keep files concise

pub mod crud;
pub mod folders;
pub mod tags;
pub mod files;
pub mod notes;

// Re-export all commands so callers can continue using `commands::...`
pub use crud::*;
pub use folders::*;
pub use tags::*;
pub use files::*;
pub use notes::*;


