#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod logo_library;
mod file_explorer;

use tauri::{Manager, Window, WindowBuilder, WindowUrl};
use std::sync::Mutex;
use std::process::Command;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use rusqlite::{Connection, Result};
use uuid::Uuid;
use std::time::{SystemTime, UNIX_EPOCH};
use rusqlite::params;
use tauri::State;

// Store the server process ID
struct ServerState(Mutex<Option<u32>>);

// Module settings structure
#[derive(Debug, Serialize, Deserialize, Default)]
struct ModuleSettings(HashMap<String, bool>);

// Define the Artist struct
#[derive(Debug, Serialize, Clone, Deserialize)]
struct Artist {
    id: String,
    name: String,
    vjtools_id: Option<String>,
    created_at: u64,
    updated_at: u64,
    sync_status: String,
}

// Modified Logo struct to include linked artist names
#[derive(Debug, Serialize, Clone, Deserialize)]
struct Logo {
    id: String,
    name: String,
    file_path: String,
    thumbnail_path: Option<String>,
    vjtools_id: Option<String>,
    created_at: u64,
    updated_at: u64,
    sync_status: String,
    #[serde(default)]
    linked_djs: Vec<String>,
}

// Struct for Cycle Bar items
#[derive(Debug, Serialize, Clone, Deserialize)]
struct CycleItem {
    id: String,
    logo_id: String,
    name: String,
    status: String,
    order_index: u32,
}

// Struct for Schedule Feed items
#[derive(Debug, Serialize, Clone, Deserialize)]
struct ScheduleItem {
    id: String,
    time: String,
    name: String,
    event_type: String,
    duration_seconds: Option<u32>,
    linked_logo_id: Option<String>,
}

// State to hold the database connection pool
struct AppState {
    db: Mutex<Option<Connection>>,
}

// Function to initialize the database and tables
fn init_database(app_handle: &tauri::AppHandle) -> Result<Connection, Box<dyn std::error::Error>> {
    let app_dir = app_handle.path_resolver().app_data_dir()
        .ok_or_else(|| Box::<dyn std::error::Error>::from("Failed to get app data directory"))?;
    
    // Ensure the directory exists
    std::fs::create_dir_all(&app_dir)?;

    let db_path = app_dir.join("vj_local_db.sqlite");
    println!("Database path: {:?}", db_path);

    let conn = Connection::open(&db_path)?;

    // Enable Foreign Keys
    conn.execute("PRAGMA foreign_keys = ON;", [])?;

    // Create tables if they don't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS artists (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            vjtools_id TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            sync_status TEXT NOT NULL DEFAULT 'new'
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS logos (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            file_path TEXT NOT NULL UNIQUE, -- Assuming file paths should be unique locally
            thumbnail_path TEXT,
            vjtools_id TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            sync_status TEXT NOT NULL DEFAULT 'new'
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS artist_logos (
            artist_id TEXT NOT NULL,
            logo_id TEXT NOT NULL,
            is_local_override INTEGER NOT NULL DEFAULT 0, -- 0=false, 1=true. Default to synced/global link.
            FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE,
            FOREIGN KEY (logo_id) REFERENCES logos(id) ON DELETE CASCADE,
            PRIMARY KEY (artist_id, logo_id)
        )",
        [],
    )?;

    // NEW: Schedule Events Table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schedule_events (
            id TEXT PRIMARY KEY,
            event_time TEXT NOT NULL, -- Format 'HH:MM' 
            name TEXT NOT NULL,
            event_type TEXT NOT NULL, 
            duration_seconds INTEGER, -- Duration in seconds, NULL if indefinite/until next
            linked_logo_id TEXT, -- Optional link to a logo
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (linked_logo_id) REFERENCES logos(id) ON DELETE SET NULL
        )",
        [],
    )?;
    // Optional: Index on time for faster lookups
    conn.execute("CREATE INDEX IF NOT EXISTS idx_schedule_time ON schedule_events (event_time);", [])?;

    // NEW: Cycle Configuration Table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cycle_config (
            logo_id TEXT NOT NULL PRIMARY KEY, 
            order_index INTEGER NOT NULL UNIQUE, -- Defines the playback order
            status TEXT NOT NULL DEFAULT 'cycle', -- Status within the cycle itself (maybe less useful here?)
            FOREIGN KEY (logo_id) REFERENCES logos(id) ON DELETE CASCADE
        )",
        [],
    )?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_cycle_order ON cycle_config (order_index);", [])?;

    println!("Database initialized successfully.");
    Ok(conn)
}

// Simple function to get current timestamp as u64
fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs()
}

use logo_library::{get_logo_library_path, save_logo_library_path, ensure_logo_library_directory};
use file_explorer::list_directory_contents;

fn main() {
    let state = AppState {
        db: Mutex::new(None),
    };

    tauri::Builder::default()
        .manage(ServerState(Mutex::new(None)))
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            start_server,
            stop_server,
            minimize_window,
            maximize_window,
            close_window,
            get_module_settings,
            save_module_settings,
            greet,
            add_artist,
            get_artists,
            add_logo,
            get_logos,
            link_logo_to_artist,
            unlink_logo_from_artist,
            get_logos_for_artist,
            get_cycle_items,
            get_schedule_items,
            add_schedule_event,
            set_cycle_config,
            // Logo library commands
            get_logo_library_path,
            save_logo_library_path,
            ensure_logo_library_directory,
            // File explorer commands
            list_directory_contents
        ])
        .setup(|app| {
            // Check if the window already exists
            if app.get_window("main").is_some() {
                return Ok(());
            }
            
            // Create the main window
            let window = WindowBuilder::new(
                app,
                "main",
                WindowUrl::App("index.html".into())
            )
            .title("VJ.Tools")
            .inner_size(1200.0, 800.0)
            .resizable(true)
            .decorations(false)
            .center()
            .build()?;
            
            // Set up window event listeners
            let app_handle = app.handle();
            let window_clone = window.clone();
            let handle_for_event = app_handle.clone();
            
            window.on_window_event(move |event| {
                match event {
                    tauri::WindowEvent::CloseRequested { api, .. } => {
                        let server_state = handle_for_event.state::<ServerState>();
                        let server_pid = server_state.0.lock().unwrap();
                        
                        if server_pid.is_some() {
                            api.prevent_close();
                            window_clone.emit("server-running", ()).unwrap();
                        }
                    },
                    _ => {}
                }
            });

            // Register keyboard shortcuts
            let app_handle_clone = app_handle.clone();
            window.on_menu_event(move |event| {
                if event.menu_item_id() == "save-layout" {
                    if let Some(win) = app_handle_clone.get_window("main") {
                        let _ = win.emit("save-layout", ());
                    }
                }
            });

            let app_handle_clone = app_handle.clone();
            window.listen("keydown", move |event| {
                if let Some(payload) = event.payload() {
                    if let Ok(key_event) = serde_json::from_str::<serde_json::Value>(payload) {
                        if let Some(key) = key_event.get("key").and_then(|k| k.as_str()) {
                            if key == "r" && key_event.get("ctrlKey").and_then(|k| k.as_bool()).unwrap_or(false) {
                                if let Some(win) = app_handle_clone.get_window("main") {
                                    let _ = win.emit("reset-layout", ());
                                }
                            }
                        }
                    }
                }
            });

            let app_handle_clone = app_handle.clone();
            window.listen("keydown", move |event| {
                if let Some(payload) = event.payload() {
                    if let Ok(key_event) = serde_json::from_str::<serde_json::Value>(payload) {
                        if let Some(key) = key_event.get("key").and_then(|k| k.as_str()) {
                            if key == "l" && key_event.get("ctrlKey").and_then(|k| k.as_bool()).unwrap_or(false) {
                                if let Some(win) = app_handle_clone.get_window("main") {
                                    let _ = win.emit("toggle-layout-lock", ());
                                }
                            }
                        }
                    }
                }
            });

            let app_handle_clone = app_handle.clone();
            window.listen("keydown", move |event| {
                if let Some(payload) = event.payload() {
                    if let Ok(key_event) = serde_json::from_str::<serde_json::Value>(payload) {
                        if let Some(key) = key_event.get("key").and_then(|k| k.as_str()) {
                            if key == "F12" {
                                if let Some(win) = app_handle_clone.get_window("main") {
                                    win.open_devtools();
                                }
                            }
                        }
                    }
                }
            });
            
            // Initialize the database connection on setup
            let conn = init_database(&app_handle)
                .expect("Failed to initialize database");
            let app_state: tauri::State<AppState> = app_handle.state();
            *app_state.db.lock().unwrap() = Some(conn);
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn start_server(window: Window, state: tauri::State<ServerState>) -> Result<(), String> {
    // Check if server is already running
    let mut server_pid = state.0.lock().unwrap();
    if server_pid.is_some() {
        return Err("Server is already running".to_string());
    }
    
    // Start the server process
    let output = Command::new("node")
        .arg("src/server/index.js")
        .spawn()
        .map_err(|e| e.to_string())?;
    
    // Store the process ID
    *server_pid = Some(output.id());
    
    // Notify the frontend
    window.emit("server-started", ()).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn stop_server(window: Window, state: tauri::State<ServerState>) -> Result<(), String> {
    // Get the server process ID
    let mut server_pid = state.0.lock().unwrap();
    let pid = server_pid.take().ok_or("Server is not running")?;
    
    // Kill the process
    #[cfg(target_os = "windows")]
    {
        Command::new("taskkill")
            .args(&["/F", "/PID", &pid.to_string()])
            .output()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("kill")
            .arg("-9")
            .arg(pid.to_string())
            .output()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("kill")
            .arg("-9")
            .arg(pid.to_string())
            .output()
            .map_err(|e| e.to_string())?;
    }
    
    // Notify the frontend
    window.emit("server-stopped", ()).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn minimize_window(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn maximize_window(window: Window) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn close_window(window: Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_module_settings() -> Result<HashMap<String, bool>, String> {
    // In a real app, this would load from a config file or database
    Ok(HashMap::new())
}

#[tauri::command]
async fn save_module_settings(settings: HashMap<String, bool>) -> Result<(), String> {
    // In a real app, this would save to a config file or database
    println!("Saving module settings: {:?}", settings);
    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Command to add a new artist
#[tauri::command]
fn add_artist(name: String, state: tauri::State<AppState>) -> Result<String, String> {
    let new_id = Uuid::new_v4().to_string();
    let now = current_timestamp();

    let maybe_conn = state.db.lock().unwrap();
    if let Some(conn) = maybe_conn.as_ref() {
        match conn.execute(
            "INSERT INTO artists (id, name, created_at, updated_at, sync_status) VALUES (?1, ?2, ?3, ?4, ?5)",
            (&new_id, &name, &now, &now, "new"),
        ) {
            Ok(_) => Ok(new_id), // Return the new artist's ID on success
            Err(e) => Err(format!("Failed to add artist: {}", e)),
        }
    } else {
        Err("Database connection not available".to_string())
    }
}

// Command to get all artists
#[tauri::command]
fn get_artists(state: tauri::State<AppState>) -> Result<Vec<Artist>, String> {
    let maybe_conn = state.db.lock().unwrap();
    if let Some(conn) = maybe_conn.as_ref() {
        let mut stmt = conn.prepare("SELECT id, name, vjtools_id, created_at, updated_at, sync_status FROM artists ORDER BY name ASC")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let artist_iter = stmt.query_map([], |row| {
            Ok(Artist {
                id: row.get(0)?,
                name: row.get(1)?,
                vjtools_id: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                sync_status: row.get(5)?,
            })
        }).map_err(|e| format!("Failed to query artists: {}", e))?;

        let artists = artist_iter.collect::<Result<Vec<Artist>, rusqlite::Error>>()
            .map_err(|e| format!("Failed to collect artists: {}", e))?;
        
        Ok(artists)
    } else {
        Err("Database connection not available".to_string())
    }
}

// Command to add a new logo
#[tauri::command]
fn add_logo(name: String, file_path: String, thumbnail_path: Option<String>, state: tauri::State<AppState>) -> Result<String, String> {
    let new_id = Uuid::new_v4().to_string();
    let now = current_timestamp();

    let maybe_conn = state.db.lock().unwrap();
    if let Some(conn) = maybe_conn.as_ref() {
        match conn.execute(
            "INSERT INTO logos (id, name, file_path, thumbnail_path, created_at, updated_at, sync_status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            (
                &new_id,
                &name,
                &file_path,
                &thumbnail_path,
                &now,
                &now,
                "new",
            ),
        ) {
            Ok(_) => Ok(new_id), // Return the new logo's ID
            Err(e) => {
                 // Check for UNIQUE constraint violation on file_path
                if let rusqlite::Error::SqliteFailure(ref err, _) = e {
                    if err.code == rusqlite::ErrorCode::ConstraintViolation {
                        // Consider finding the existing logo ID and returning it, or just returning an error
                         return Err(format!("Logo with file path '{}' already exists.", file_path));
                    }
                }
                Err(format!("Failed to add logo: {}", e))
            },
        }
    } else {
        Err("Database connection not available".to_string())
    }
}

// Command to get all logos
#[tauri::command]
fn get_logos(state: tauri::State<AppState>) -> Result<Vec<Logo>, String> {
    let maybe_conn = state.db.lock().unwrap();
    if let Some(conn) = maybe_conn.as_ref() {
        // 1. Fetch all logos
        let mut stmt_logos = conn.prepare("SELECT id, name, file_path, thumbnail_path, vjtools_id, created_at, updated_at, sync_status FROM logos ORDER BY name ASC")
            .map_err(|e| format!("Failed to prepare logo query: {}", e))?;
        
        let logo_iter = stmt_logos.query_map([], |row| {
            // Temporarily create struct without linked_djs
            Ok(Logo {
                id: row.get(0)?,
                name: row.get(1)?,
                file_path: row.get(2)?,
                thumbnail_path: row.get(3)?,
                vjtools_id: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                sync_status: row.get(7)?,
                linked_djs: Vec::new(), // Initialize as empty for now
            })
        }).map_err(|e| format!("Failed to query logos: {}", e))?;

        let mut logos = logo_iter.collect::<Result<Vec<Logo>, rusqlite::Error>>()
            .map_err(|e| format!("Failed to collect logos: {}", e))?;

        // 2. Fetch all artist links (logo_id, artist_name)
        let mut stmt_links = conn.prepare("SELECT al.logo_id, a.name FROM artist_logos al JOIN artists a ON al.artist_id = a.id")
             .map_err(|e| format!("Failed to prepare link query: {}", e))?;

        let link_iter = stmt_links.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        }).map_err(|e| format!("Failed to query links: {}", e))?;

        // 3. Group links by logo_id
        let mut links_map: HashMap<String, Vec<String>> = HashMap::new();
        for result in link_iter {
            match result {
                Ok((logo_id, artist_name)) => {
                    links_map.entry(logo_id).or_default().push(artist_name);
                }
                Err(e) => return Err(format!("Failed to process link row: {}", e)),
            }
        }

        // 4. Populate linked_djs in logos
        for logo in logos.iter_mut() {
            if let Some(djs) = links_map.get(&logo.id) {
                logo.linked_djs = djs.clone();
            }
        }
        
        Ok(logos)
    } else {
        Err("Database connection not available".to_string())
    }
}

// Command to link a logo to an artist
#[tauri::command]
fn link_logo_to_artist(artist_id: String, logo_id: String, is_override: Option<bool>, state: tauri::State<AppState>) -> Result<(), String> {
    let is_local_override = is_override.unwrap_or(false) as i32; // Default to false (0)

    let maybe_conn = state.db.lock().unwrap();
    if let Some(conn) = maybe_conn.as_ref() {
        // Use INSERT OR IGNORE to avoid errors if the link already exists
        // If it exists, we might want to update `is_local_override` in a separate step if needed, but ignore is simpler for now.
        match conn.execute(
            "INSERT OR IGNORE INTO artist_logos (artist_id, logo_id, is_local_override) VALUES (?1, ?2, ?3)",
            (&artist_id, &logo_id, &is_local_override),
        ) {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to link logo to artist: {}", e)),
        }
    } else {
        Err("Database connection not available".to_string())
    }
}

// Command to unlink a logo from an artist
#[tauri::command]
fn unlink_logo_from_artist(artist_id: String, logo_id: String, state: tauri::State<AppState>) -> Result<(), String> {
    let maybe_conn = state.db.lock().unwrap();
    if let Some(conn) = maybe_conn.as_ref() {
        match conn.execute(
            "DELETE FROM artist_logos WHERE artist_id = ?1 AND logo_id = ?2",
            (&artist_id, &logo_id),
        ) {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to unlink logo from artist: {}", e)),
        }
    } else {
        Err("Database connection not available".to_string())
    }
}

// Command to get all logos linked to a specific artist
#[tauri::command]
fn get_logos_for_artist(artist_id: String, state: tauri::State<AppState>) -> Result<Vec<Logo>, String> {
    let maybe_conn = state.db.lock().unwrap();
    if let Some(conn) = maybe_conn.as_ref() {
        let mut stmt = conn.prepare(
            "SELECT l.id, l.name, l.file_path, l.thumbnail_path, l.vjtools_id, l.created_at, l.updated_at, l.sync_status 
             FROM logos l
             INNER JOIN artist_logos al ON l.id = al.logo_id
             WHERE al.artist_id = ?1
             ORDER BY l.name ASC"
        ).map_err(|e| format!("Failed to prepare query: {}", e))?;

        let logo_iter = stmt.query_map([&artist_id], |row| {
             Ok(Logo {
                id: row.get(0)?,
                name: row.get(1)?,
                file_path: row.get(2)?,
                thumbnail_path: row.get(3)?,
                vjtools_id: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                sync_status: row.get(7)?,
                linked_djs: Vec::new(),
            })
        }).map_err(|e| format!("Failed to query logos for artist: {}", e))?;

        let logos = logo_iter.collect::<Result<Vec<Logo>, rusqlite::Error>>()
            .map_err(|e| format!("Failed to collect logos: {}", e))?;
        
        Ok(logos)
    } else {
        Err("Database connection not available".to_string())
    }
}

// --- Schedule Commands ---

#[tauri::command]
fn get_schedule_items(state: State<AppState>) -> Result<Vec<ScheduleItem>, String> {
    let maybe_conn = state.db.lock().unwrap();
    if let Some(conn) = maybe_conn.as_ref() {
        let mut stmt = conn.prepare(
                "SELECT id, event_time, name, event_type, duration_seconds, linked_logo_id 
                 FROM schedule_events ORDER BY event_time ASC"
            ).map_err(|e| format!("Schedule Query Prepare Failed: {}", e))?;

        let item_iter = stmt.query_map([], |row| {
            Ok(ScheduleItem {
                id: row.get(0)?,
                time: row.get(1)?,
                name: row.get(2)?,
                event_type: row.get(3)?,
                duration_seconds: row.get(4)?,
                linked_logo_id: row.get(5)?,
                // created_at/updated_at omitted for brevity
            })
        }).map_err(|e| format!("Schedule Query Map Failed: {}", e))?;

        item_iter.collect::<Result<Vec<ScheduleItem>>>()
                 .map_err(|e| format!("Schedule Collect Failed: {}", e))
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn add_schedule_event(
    event_time: String, 
    name: String, 
    event_type: String, 
    duration_seconds: Option<u32>, 
    linked_logo_id: Option<String>,
    state: State<AppState>
) -> Result<String, String> {
    let new_id = Uuid::new_v4().to_string();
    let now = current_timestamp();
    // TODO: Validate event_time format ("HH:MM")?

    let maybe_conn = state.db.lock().unwrap();
    if let Some(conn) = maybe_conn.as_ref() {
        conn.execute(
            "INSERT INTO schedule_events (id, event_time, name, event_type, duration_seconds, linked_logo_id, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![new_id, event_time, name, event_type, duration_seconds, linked_logo_id, now, now],
        ).map_err(|e| format!("Failed to add schedule event: {}", e))?;
        Ok(new_id)
    } else {
        Err("Database connection not available".to_string())
    }
}

// --- Cycle Commands ---

#[tauri::command]
fn get_cycle_items(state: State<AppState>) -> Result<Vec<CycleItem>, String> {
    let maybe_conn = state.db.lock().unwrap();
    if let Some(conn) = maybe_conn.as_ref() {
        let mut stmt = conn.prepare(
                "SELECT cc.logo_id, l.name, cc.status, cc.order_index 
                 FROM cycle_config cc 
                 JOIN logos l ON cc.logo_id = l.id 
                 ORDER BY cc.order_index ASC"
            ).map_err(|e| format!("Cycle Query Prepare Failed: {}", e))?;

        let item_iter = stmt.query_map([], |row| {
            let logo_id: String = row.get(0)?;
            Ok(CycleItem {
                id: logo_id.clone(), // Use logo_id as the item's unique ID
                logo_id: logo_id,
                name: row.get(1)?,
                status: row.get(2)?,
                order_index: row.get(3)?,
            })
        }).map_err(|e| format!("Cycle Query Map Failed: {}", e))?;

        item_iter.collect::<Result<Vec<CycleItem>>>()
                 .map_err(|e| format!("Cycle Collect Failed: {}", e))
    } else {
        Err("Database connection not available".to_string())
    }
}

// Command to overwrite the entire cycle configuration
#[derive(Deserialize)]
struct CycleConfigPayload {
    logo_ids: Vec<String>,
}

#[tauri::command]
fn set_cycle_config(payload: CycleConfigPayload, state: State<AppState>) -> Result<(), String> {
    let mut maybe_conn_lock = state.db.lock().unwrap();
    if let Some(conn) = maybe_conn_lock.as_mut() {
        // Use a transaction for atomic update
        let tx = conn.transaction().map_err(|e| format!("Transaction Begin Failed: {}", e))?;
        
        // 1. Clear existing cycle config
        tx.execute("DELETE FROM cycle_config", [])
            .map_err(|e| format!("Failed to clear cycle config: {}", e))?;

        // 2. Insert new ordered items
        for (index, logo_id) in payload.logo_ids.iter().enumerate() {
            tx.execute(
                "INSERT INTO cycle_config (logo_id, order_index, status) VALUES (?1, ?2, ?3)",
                params![logo_id, index as u32, "cycle"], // Default status to 'cycle'
            ).map_err(|e| format!("Failed to insert cycle item {}: {}", logo_id, e))?;
        }

        tx.commit().map_err(|e| format!("Transaction Commit Failed: {}", e))
    } else {
        Err("Database connection not available".to_string())
    }
} 