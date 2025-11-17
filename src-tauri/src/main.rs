// Prevents additional console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::State;

// State to hold the Python backend process
struct PythonBackend(Mutex<Option<Child>>);

/// Start the Python backend server
#[tauri::command]
fn start_python_backend(state: State<PythonBackend>) -> Result<String, String> {
    let mut backend = state.0.lock().unwrap();

    // Check if already running
    if let Some(ref mut child) = *backend {
        if let Ok(None) = child.try_wait() {
            return Ok("Python backend is already running".to_string());
        }
    }

    // Get the path to the Python backend
    // In development: use the python-backend directory
    // In production: bundle the Python backend with the app
    let backend_path = if cfg!(debug_assertions) {
        // Development mode
        std::env::current_dir()
            .unwrap()
            .join("..")
            .join("python-backend")
    } else {
        // Production mode - look for bundled backend
        // This would need to be adjusted based on your packaging strategy
        std::env::current_exe()
            .unwrap()
            .parent()
            .unwrap()
            .join("python-backend")
    };

    let app_script = backend_path.join("app.py");

    // Start Python backend as a subprocess
    #[cfg(target_os = "windows")]
    let python_cmd = "python";

    #[cfg(not(target_os = "windows"))]
    let python_cmd = "python3";

    let child = Command::new(python_cmd)
        .arg(app_script)
        .current_dir(&backend_path)
        .spawn()
        .map_err(|e| format!("Failed to start Python backend: {}", e))?;

    *backend = Some(child);

    Ok("Python backend started successfully".to_string())
}

/// Stop the Python backend server
#[tauri::command]
fn stop_python_backend(state: State<PythonBackend>) -> Result<String, String> {
    let mut backend = state.0.lock().unwrap();

    if let Some(mut child) = backend.take() {
        child
            .kill()
            .map_err(|e| format!("Failed to stop Python backend: {}", e))?;
        Ok("Python backend stopped".to_string())
    } else {
        Ok("Python backend is not running".to_string())
    }
}

/// Check if Python backend is running
#[tauri::command]
fn check_python_backend(state: State<PythonBackend>) -> bool {
    let mut backend = state.0.lock().unwrap();

    if let Some(ref mut child) = *backend {
        if let Ok(None) = child.try_wait() {
            return true;
        }
    }

    false
}

fn main() {
    tauri::Builder::default()
        .manage(PythonBackend(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            start_python_backend,
            stop_python_backend,
            check_python_backend,
        ])
        .setup(|app| {
            // Auto-start Python backend on app startup
            let handle = app.handle();
            tauri::async_runtime::spawn(async move {
                // Wait a bit for the window to initialize
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

                // Start the backend
                let state = handle.state::<PythonBackend>();
                if let Err(e) = start_python_backend(state) {
                    eprintln!("Failed to auto-start Python backend: {}", e);
                }
            });

            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                // Stop Python backend when app is closing
                let state = event.window().state::<PythonBackend>();
                let _ = stop_python_backend(state);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
