/**
 * Tauri Updater Integration
 * Handles automatic update checking and installation
 */

import { isTauri } from './tauri'

interface UpdateManifest {
  version: string
  date?: string
  body?: string
}

interface UpdateResult {
  shouldUpdate: boolean
  manifest?: UpdateManifest
}

/**
 * Check if updates are available
 */
export async function checkForUpdates(): Promise<UpdateResult> {
  if (!isTauri()) {
    return { shouldUpdate: false }
  }

  try {
    const { checkUpdate } = await import('@tauri-apps/api/updater')
    const result = await checkUpdate()
    return {
      shouldUpdate: result.shouldUpdate,
      manifest: result.manifest ? {
        version: result.manifest.version,
        date: result.manifest.date,
        body: result.manifest.body,
      } : undefined
    }
  } catch (error) {
    console.error('[Updater] Failed to check for updates:', error)
    return { shouldUpdate: false }
  }
}

/**
 * Install the available update and relaunch the app
 */
export async function installUpdate(): Promise<boolean> {
  if (!isTauri()) {
    return false
  }

  try {
    const { installUpdate } = await import('@tauri-apps/api/updater')
    const { relaunch } = await import('@tauri-apps/api/process')
    
    await installUpdate()
    await relaunch()
    return true
  } catch (error) {
    console.error('[Updater] Failed to install update:', error)
    return false
  }
}

/**
 * Check for updates and show a dialog if available
 * @param silent If true, don't show any UI if no update is available
 */
export async function checkAndPromptUpdate(silent: boolean = true): Promise<void> {
  const result = await checkForUpdates()
  
  if (!result.shouldUpdate) {
    if (!silent) {
      // Could show a "You're up to date" toast here
      console.log('[Updater] App is up to date')
    }
    return
  }

  const manifest = result.manifest
  const version = manifest?.version || 'unknown'
  const notes = manifest?.body || '修复了一些问题并改进了性能。'

  // The Tauri updater dialog will handle this automatically if dialog: true in config
  // But we can also handle it manually here for more control
  console.log(`[Updater] Update available: v${version}`)
  console.log(`[Updater] Release notes: ${notes}`)
}

/**
 * Setup automatic update checking
 * Call this once when the app starts
 */
export function setupAutoUpdater(intervalMinutes: number = 60): () => void {
  if (!isTauri()) {
    return () => {}
  }

  // Check immediately on startup (after a short delay)
  const initialTimeout = setTimeout(() => {
    checkAndPromptUpdate(true)
  }, 5000)

  // Then check periodically
  const interval = setInterval(() => {
    checkAndPromptUpdate(true)
  }, intervalMinutes * 60 * 1000)

  // Return cleanup function
  return () => {
    clearTimeout(initialTimeout)
    clearInterval(interval)
  }
}
