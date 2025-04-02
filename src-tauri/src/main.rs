#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{Manager, Window, WindowBuilder, WindowUrl};
use std::sync::Mutex;
use std::process::Command;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Store the server process ID
struct ServerState(Mutex<Option<u32>>);

// Module settings structure
#[derive(Debug, Serialize, Deserialize, Default)]
struct ModuleSettings(HashMap<String, bool>);

fn main() {
    tauri::Builder::default()
        .manage(ServerState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            start_server,
            stop_server,
            minimize_window,
            maximize_window,
            close_window,
            get_module_settings,
            save_module_settings
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
            window.on_window_event(move |event| {
                match event {
                    tauri::WindowEvent::CloseRequested { api, .. } => {
                        // Prevent closing if server is running
                        let server_state = app_handle.state::<ServerState>();
                        let server_pid = server_state.0.lock().unwrap();
                        
                        if server_pid.is_some() {
                            api.prevent_close();
                            window_clone.emit("server-running", ()).unwrap();
                        }
                    },
                    _ => {}
                }
            });
            
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