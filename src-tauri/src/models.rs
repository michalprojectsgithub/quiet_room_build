use serde::{Deserialize, Serialize};

// Data structures
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PhotoJournalImage {
    pub id: String,
    pub filename: String,
    #[serde(rename = "originalName")]
    pub original_name: String,
    pub url: String,
    #[serde(rename = "uploadDate")]
    pub upload_date: String,
    pub size: u64,
    pub mimetype: String,
    pub prompt: Option<String>,
    #[serde(rename = "referenceId")]
    #[serde(default)]
    pub reference_id: Option<String>,
    #[serde(default)]
    pub rotation: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CropRect {
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Reference {
    pub id: String,
    pub filename: String,
    #[serde(rename = "originalName")]
    pub original_name: String,
    pub url: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    pub location: Option<String>,
    #[serde(rename = "folderId")]
    pub folder_id: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub image_note: Option<ImageNote>,
    #[serde(default)]
    pub image_source: Option<ImageSource>,
    #[serde(rename = "rotation")]
    #[serde(default)]
    pub rotation: i32,
    #[serde(rename = "crop")]
    #[serde(default)]
    pub crop: Option<CropRect>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Folder {
    pub id: String,
    pub name: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    pub color: Option<String>,
    #[serde(rename = "physicalPath")]
    pub physical_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Moodboard {
    pub id: String,
    pub title: String,
    pub items: Vec<MoodboardItem>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MoodboardItem {
    pub id: String,
    #[serde(rename = "type")]
    pub item_type: String, // "image", "text", "color"
    pub content: Option<String>,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    #[serde(rename = "createdAt")]
    pub created_at: Option<i64>,
    pub filename: Option<String>,
    pub url: Option<String>,
    pub original_width: Option<f64>,
    pub original_height: Option<f64>,
    pub aspect_ratio: Option<f64>,
    pub is_webp: Option<bool>,
    pub colors: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageNote {
    pub text: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageSource {
    pub text: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}
