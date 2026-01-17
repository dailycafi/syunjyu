/**
 * Tauri API wrapper for type-safe access to Tauri functions
 * This module provides TypeScript types and helper functions for Tauri integration
 */

// ==================== Types ====================

export interface BackendInfo {
  status: 'ready' | 'running' | 'healthy' | 'unhealthy' | 'stopped'
  port: number
  message: string
}

export interface TauriApi {
  invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
  event: {
    listen: <T>(event: string, handler: (event: { payload: T }) => void) => Promise<() => void>
    emit: (event: string, payload?: unknown) => Promise<void>
  }
  path: {
    appDataDir: () => Promise<string>
    resourceDir: () => Promise<string>
  }
}

// ==================== Tauri Detection ====================

/**
 * Check if we're running inside Tauri
 */
export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false
  return !!(window as any).__TAURI__
}

/**
 * Get the Tauri API object (if available)
 */
export const getTauriApi = (): TauriApi | null => {
  if (!isTauri()) return null
  return (window as any).__TAURI__ as TauriApi
}

// ==================== Backend Commands ====================

/**
 * Start the Python backend server
 */
export const startBackend = async (): Promise<BackendInfo> => {
  const tauri = getTauriApi()
  if (!tauri) {
    throw new Error('Not running in Tauri context')
  }
  return tauri.invoke<BackendInfo>('start_backend')
}

/**
 * Stop the Python backend server
 */
export const stopBackend = async (): Promise<string> => {
  const tauri = getTauriApi()
  if (!tauri) {
    throw new Error('Not running in Tauri context')
  }
  return tauri.invoke<string>('stop_backend')
}

/**
 * Get the current backend port
 */
export const getBackendPort = async (): Promise<number | null> => {
  const tauri = getTauriApi()
  if (!tauri) return null
  
  try {
    return await tauri.invoke<number | null>('get_backend_port')
  } catch {
    return null
  }
}

/**
 * Check backend health status
 */
export const checkBackendHealth = async (): Promise<BackendInfo> => {
  const tauri = getTauriApi()
  if (!tauri) {
    throw new Error('Not running in Tauri context')
  }
  return tauri.invoke<BackendInfo>('check_backend_health')
}

// ==================== Event Listeners ====================

/**
 * Listen for backend ready event
 */
export const onBackendReady = (callback: (info: BackendInfo) => void): (() => void) | null => {
  const tauri = getTauriApi()
  if (!tauri) return null
  
  let unlisten: (() => void) | null = null
  
  tauri.event.listen<BackendInfo>('backend-ready', (event) => {
    callback(event.payload)
  }).then((fn) => {
    unlisten = fn
  })
  
  // Return cleanup function
  return () => {
    if (unlisten) unlisten()
  }
}

/**
 * Listen for backend error event
 */
export const onBackendError = (callback: (error: { error: string }) => void): (() => void) | null => {
  const tauri = getTauriApi()
  if (!tauri) return null
  
  let unlisten: (() => void) | null = null
  
  tauri.event.listen<{ error: string }>('backend-error', (event) => {
    callback(event.payload)
  }).then((fn) => {
    unlisten = fn
  })
  
  // Return cleanup function
  return () => {
    if (unlisten) unlisten()
  }
}

// ==================== Utility Functions ====================

/**
 * Wait for backend to be ready with timeout
 */
export const waitForBackend = async (timeoutMs: number = 30000): Promise<BackendInfo> => {
  const tauri = getTauriApi()
  if (!tauri) {
    throw new Error('Not running in Tauri context')
  }
  
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const health = await checkBackendHealth()
      if (health.status === 'healthy' || health.status === 'ready') {
        return health
      }
    } catch {
      // Ignore errors and retry
    }
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  throw new Error(`Backend did not become ready within ${timeoutMs}ms`)
}
