// Prevents additional console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader};
use std::net::TcpListener;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, State};
use tokio::time::sleep;

// ==================== Constants ====================

const PORT_RANGE_START: u16 = 8500;
const PORT_RANGE_END: u16 = 8600;
const BACKEND_STARTUP_TIMEOUT_SECS: u64 = 30;
const HEALTH_CHECK_INTERVAL_MS: u64 = 200;

// ==================== State Management ====================

/// State to hold the Python backend process and its port
struct BackendState {
    process: Mutex<Option<Child>>,
    port: Mutex<Option<u16>>,
}

impl Default for BackendState {
    fn default() -> Self {
        Self {
            process: Mutex::new(None),
            port: Mutex::new(None),
        }
    }
}

// ==================== Port Management ====================

/// Find an available port in the specified range
fn find_available_port(start: u16, end: u16) -> Option<u16> {
    for port in start..=end {
        if is_port_available(port) {
            return Some(port);
        }
    }
    None
}

/// Check if a specific port is available
fn is_port_available(port: u16) -> bool {
    TcpListener::bind(("127.0.0.1", port)).is_ok()
}

/// Check if the backend is responding on the given port
async fn is_backend_healthy(port: u16) -> bool {
    let url = format!("http://127.0.0.1:{}/health", port);
    match reqwest::get(&url).await {
        Ok(response) => response.status().is_success(),
        Err(_) => false,
    }
}

// ==================== Path Helpers ====================

/// Get the path to the Python backend directory
fn get_backend_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    if cfg!(debug_assertions) {
        // Development mode: use the python-backend directory relative to project root
        let current_dir = std::env::current_dir()
            .map_err(|e| format!("Failed to get current directory: {}", e))?;
        
        // Try different possible locations
        let possible_paths = vec![
            current_dir.join("python-backend"),
            current_dir.join("..").join("python-backend"),
        ];
        
        for path in possible_paths {
            if path.exists() {
                return Ok(path.canonicalize().unwrap_or(path));
            }
        }
        
        Err("Python backend directory not found in development mode".to_string())
    } else {
        // Production mode: look for bundled backend in Resources
        let resource_dir = app_handle
            .path_resolver()
            .resource_dir()
            .ok_or("Failed to get resource directory")?;
        
        let backend_path = resource_dir.join("python-backend");
        
        if backend_path.exists() {
            Ok(backend_path)
        } else {
            // Fallback: try alongside the executable
            let exe_path = std::env::current_exe()
                .map_err(|e| format!("Failed to get executable path: {}", e))?;
            let exe_dir = exe_path.parent()
                .ok_or("Failed to get executable directory")?;
            
            let alt_path = exe_dir.join("python-backend");
            if alt_path.exists() {
                Ok(alt_path)
            } else {
                Err(format!(
                    "Python backend not found. Tried: {:?} and {:?}",
                    backend_path, alt_path
                ))
            }
        }
    }
}

/// Get the Python executable path
fn get_python_executable(backend_path: &PathBuf) -> String {
    // First, try to use the venv Python if it exists
    let venv_python = if cfg!(target_os = "windows") {
        backend_path.join("venv").join("Scripts").join("python.exe")
    } else {
        backend_path.join("venv").join("bin").join("python")
    };
    
    if venv_python.exists() {
        return venv_python.to_string_lossy().to_string();
    }
    
    // Fallback to system Python
    if cfg!(target_os = "windows") {
        "python".to_string()
    } else {
        "python3".to_string()
    }
}

/// Get the port file path for IPC
fn get_port_file_path(app_handle: &AppHandle) -> PathBuf {
    let app_data_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .unwrap_or_else(|| PathBuf::from("."));
    
    // Ensure the directory exists
    let _ = fs::create_dir_all(&app_data_dir);
    
    app_data_dir.join("backend_port")
}

// ==================== Backend Process Management ====================

/// Start the Python backend server
#[tauri::command]
async fn start_backend(
    app_handle: AppHandle,
    state: State<'_, BackendState>,
) -> Result<BackendInfo, String> {
    // Check if already running - use a scope to release the lock before await
    let (is_running, current_port) = {
        let process = state.process.lock().unwrap();
        let port = state.port.lock().unwrap();
        
        let running = process.is_some();
        let p = *port;
        (running, p)
    };
    
    if is_running {
        if let Some(p) = current_port {
            // Verify it's actually responding
            if is_backend_healthy(p).await {
                return Ok(BackendInfo {
                    status: "running".to_string(),
                    port: p,
                    message: "Backend is already running".to_string(),
                });
            }
        }
    }
    
    // Find an available port
    let port = find_available_port(PORT_RANGE_START, PORT_RANGE_END)
        .ok_or("No available port found in range 8500-8600")?;
    
    // Get paths
    let backend_path = get_backend_path(&app_handle)?;
    let python_exe = get_python_executable(&backend_path);
    let app_script = backend_path.join("app.py");
    
    if !app_script.exists() {
        return Err(format!("Backend script not found: {:?}", app_script));
    }
    
    println!("[Tauri] Starting Python backend on port {}", port);
    println!("[Tauri] Backend path: {:?}", backend_path);
    println!("[Tauri] Python executable: {}", python_exe);
    
    // Start Python backend with the specified port
    let child = Command::new(&python_exe)
        .arg(&app_script)
        .arg("--port")
        .arg(port.to_string())
        .current_dir(&backend_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start Python backend: {}. Python: {}", e, python_exe))?;
    
    // Store the process and port
    {
        let mut process_lock = state.process.lock().unwrap();
        let mut port_lock = state.port.lock().unwrap();
        *process_lock = Some(child);
        *port_lock = Some(port);
    }
    
    // Write port to file for frontend to read
    let port_file = get_port_file_path(&app_handle);
    fs::write(&port_file, port.to_string())
        .map_err(|e| format!("Failed to write port file: {}", e))?;
    
    // Wait for backend to be ready
    let start_time = std::time::Instant::now();
    let timeout = Duration::from_secs(BACKEND_STARTUP_TIMEOUT_SECS);
    
    while start_time.elapsed() < timeout {
        if is_backend_healthy(port).await {
            println!("[Tauri] Backend is healthy on port {}", port);
            
            // Emit event to frontend
            let _ = app_handle.emit_all("backend-ready", BackendInfo {
                status: "ready".to_string(),
                port,
                message: "Backend started successfully".to_string(),
            });
            
            return Ok(BackendInfo {
                status: "ready".to_string(),
                port,
                message: "Backend started successfully".to_string(),
            });
        }
        
        // Check if process has exited - use scope to release lock before await
        let process_status = {
            let mut process_lock = state.process.lock().unwrap();
            if let Some(ref mut child) = *process_lock {
                match child.try_wait() {
                    Ok(Some(status)) => {
                        // Process has exited
                        let exit_code = status.code().unwrap_or(-1);
                        
                        // Try to capture stderr for debugging
                        let stderr_msg = if let Some(stderr) = child.stderr.take() {
                            let reader = BufReader::new(stderr);
                            reader.lines()
                                .take(10)
                                .filter_map(|l| l.ok())
                                .collect::<Vec<_>>()
                                .join("\n")
                        } else {
                            String::new()
                        };
                        
                        Some(Err(format!(
                            "Backend process exited with code {}. Stderr: {}",
                            exit_code, stderr_msg
                        )))
                    }
                    Ok(None) => None, // Still running
                    Err(e) => Some(Err(format!("Failed to check process status: {}", e))),
                }
            } else {
                None
            }
        };
        
        if let Some(result) = process_status {
            // If we got an error, return it directly
            return result;
        }
        
        sleep(Duration::from_millis(HEALTH_CHECK_INTERVAL_MS)).await;
    }
    
    Err(format!(
        "Backend failed to start within {} seconds",
        BACKEND_STARTUP_TIMEOUT_SECS
    ))
}

/// Stop the Python backend server
#[tauri::command]
fn stop_backend(
    app_handle: AppHandle,
    state: State<BackendState>,
) -> Result<String, String> {
    let mut process_lock = state.process.lock().unwrap();
    let mut port_lock = state.port.lock().unwrap();
    
    if let Some(mut child) = process_lock.take() {
        // Try graceful shutdown first on Unix
        #[cfg(unix)]
        {
            // Send SIGTERM
            unsafe {
                libc::kill(child.id() as i32, libc::SIGTERM);
            }
            // Wait a bit for graceful shutdown
            std::thread::sleep(Duration::from_millis(500));
        }
        
        // Force kill if still running
        match child.try_wait() {
            Ok(Some(_)) => {
                // Already exited
            }
            _ => {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
        
        println!("[Tauri] Backend stopped");
    }
    
    // Clear port
    *port_lock = None;
    
    // Remove port file
    let port_file = get_port_file_path(&app_handle);
    let _ = fs::remove_file(port_file);
    
    Ok("Backend stopped".to_string())
}

/// Get the current backend port
#[tauri::command]
fn get_backend_port(state: State<BackendState>) -> Option<u16> {
    let port_lock = state.port.lock().unwrap();
    *port_lock
}

/// Check backend health status
#[tauri::command]
async fn check_backend_health(state: State<'_, BackendState>) -> Result<BackendInfo, String> {
    // Get port in a scope to release lock before await
    let port = {
        let port_lock = state.port.lock().unwrap();
        *port_lock
    };
    
    match port {
        Some(p) => {
            if is_backend_healthy(p).await {
                Ok(BackendInfo {
                    status: "healthy".to_string(),
                    port: p,
                    message: "Backend is responding".to_string(),
                })
            } else {
                Ok(BackendInfo {
                    status: "unhealthy".to_string(),
                    port: p,
                    message: "Backend is not responding".to_string(),
                })
            }
        }
        None => Ok(BackendInfo {
            status: "stopped".to_string(),
            port: 0,
            message: "Backend is not running".to_string(),
        }),
    }
}

// ==================== Data Types ====================

#[derive(Clone, Serialize, Deserialize)]
struct BackendInfo {
    status: String,
    port: u16,
    message: String,
}

// ==================== Application Entry Point ====================

fn main() {
    tauri::Builder::default()
        .manage(BackendState::default())
        .invoke_handler(tauri::generate_handler![
            start_backend,
            stop_backend,
            get_backend_port,
            check_backend_health,
        ])
        .setup(|app| {
            let handle = app.handle();
            
            // Auto-start Python backend on app startup
            tauri::async_runtime::spawn(async move {
                // Small delay for window initialization
                sleep(Duration::from_millis(500)).await;
                
                // Start the backend
                let state = handle.state::<BackendState>();
                match start_backend(handle.clone(), state).await {
                    Ok(info) => {
                        println!("[Tauri] Backend auto-started: {:?}", info.message);
                    }
                    Err(e) => {
                        eprintln!("[Tauri] Failed to auto-start backend: {}", e);
                        // Emit error event to frontend
                        let _ = handle.emit_all("backend-error", serde_json::json!({
                            "error": e
                        }));
                    }
                }
            });
            
            Ok(())
        })
        .on_window_event(|event| {
            match event.event() {
                tauri::WindowEvent::CloseRequested { .. } => {
                    // Stop Python backend when app is closing
                    let state = event.window().state::<BackendState>();
                    let handle = event.window().app_handle();
                    let _ = stop_backend(handle, state);
                }
                tauri::WindowEvent::Destroyed => {
                    // Cleanup on window destroy as well
                    let state = event.window().state::<BackendState>();
                    let handle = event.window().app_handle();
                    let _ = stop_backend(handle, state);
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
