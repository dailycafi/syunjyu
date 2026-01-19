'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { 
  login as apiLogin, 
  register as apiRegister, 
  logout as apiLogout, 
  getSyncStatus,
  initializeApi,
  setupTauriListeners
} from '@/lib/api'
import { setupAutoUpdater } from '@/lib/updater'

interface User {
  id: string
  email?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  backendReady: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, inviteCode: string) => Promise<void>
  logout: (clearLocalData?: boolean) => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [backendReady, setBackendReady] = useState(false)

  // Initialize API and Tauri listeners
  useEffect(() => {
    const init = async () => {
      // Setup Tauri event listeners (for updates, etc.)
      setupTauriListeners()
      
      // Initialize API (detect backend - cloud or local)
      await initializeApi()
      
      // Cloud backend is always ready, no need to wait for local startup
      setBackendReady(true)
    }
    
    init()
    
    // Setup auto updater (check every 60 minutes)
    const cleanupUpdater = setupAutoUpdater(60)
    
    return () => {
      cleanupUpdater()
    }
  }, [])

  const refreshAuth = useCallback(async () => {
    // Wait for backend to be ready before checking auth
    if (!backendReady) return
    
    try {
      const status = await getSyncStatus() as any
      if (status?.logged_in && status?.user_id) {
        setUser({ id: status.user_id, email: status.email })
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to check auth status:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [backendReady])

  useEffect(() => {
    if (backendReady) {
      refreshAuth()
    }
  }, [backendReady, refreshAuth])

  const login = async (email: string, password: string) => {
    await apiLogin(email, password)
    await refreshAuth()
  }

  const register = async (email: string, password: string, inviteCode: string) => {
    await apiRegister(email, password, inviteCode)
    await refreshAuth()
  }

  const logout = async (clearLocalData: boolean = false) => {
    await apiLogout(clearLocalData)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        backendReady,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
