use std::fs;
use std::path::Path;
use serde::{Serialize, Deserialize};
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize)]
pub struct LogoLibraryConfig {
    path: String,
}

impl LogoLibraryConfig {
    pub fn load(app: &AppHandle) -> Result<Self, String> {
        let config_path = get_config_path(app)?;
        if !config_path.exists() {
            return Ok(LogoLibraryConfig { path: String::new() });
        }

        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config: {}", e))?;
            
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse config: {}", e))
    }

    pub fn save(&self, app: &AppHandle) -> Result<(), String> {
        let config_path = get_config_path(app)?;
        
        // Ensure parent directory exists
        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }

        let content = serde_json::to_string(self)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;
            
        fs::write(&config_path, content)
            .map_err(|e| format!("Failed to write config: {}", e))
    }
}

fn get_config_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path_resolver()
        .app_config_dir()
        .ok_or_else(|| "Failed to get config directory".to_string())
        .map(|p| p.join("logo_library_config.json"))
}

#[tauri::command]
pub async fn get_logo_library_path(app: AppHandle) -> Result<String, String> {
    LogoLibraryConfig::load(&app).map(|config| config.path)
}

#[tauri::command]
pub async fn save_logo_library_path(path: String, app: AppHandle) -> Result<(), String> {
    let config = LogoLibraryConfig { path };
    config.save(&app)
}

#[tauri::command]
pub async fn ensure_logo_library_directory(path: String) -> Result<(), String> {
    let path = Path::new(&path);
    if !path.exists() {
        fs::create_dir_all(path)
            .map_err(|e| format!("Failed to create logo library directory: {}", e))?;
    }
    Ok(())
}
