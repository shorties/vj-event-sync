use std::fs;
use std::path::Path;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct FileItem {
    name: String,
    path: String,
    #[serde(rename = "type")]
    item_type: String,
}

#[tauri::command]
pub async fn list_directory_contents(path: String) -> Result<Vec<FileItem>, String> {
    let path = Path::new(&path);
    
    if !path.exists() {
        return Err("Path does not exist".to_string());
    }
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }
    
    let mut items = Vec::new();
    
    match fs::read_dir(path) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    let file_type = if entry.path().is_dir() {
                        "directory"
                    } else {
                        "file"
                    };
                    
                    items.push(FileItem {
                        name: entry.file_name().to_string_lossy().into_owned(),
                        path: entry.path().to_string_lossy().into_owned(),
                        item_type: file_type.to_string(),
                    });
                }
            }
            Ok(items)
        },
        Err(e) => Err(format!("Failed to read directory: {}", e))
    }
}
