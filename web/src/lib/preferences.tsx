'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getAllSettings, updateSetting } from '@/lib/api'

export type UserMode = 'english_learner' | 'ai_learner'

interface UserPreferencesContextType {
  mode: UserMode
  setMode: (mode: UserMode) => void
  isEnglishLearner: boolean
  isAiLearner: boolean
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined)

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<UserMode>('english_learner')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // 1. Priority: Local Storage (Immediate)
    const savedMode = localStorage.getItem('user_mode') as UserMode
    if (savedMode && (savedMode === 'english_learner' || savedMode === 'ai_learner')) {
      setMode(savedMode)
    }

    // 2. Sync: Server Settings (Source of Truth)
    // This ensures persistence across devices if using the synced backend
    getAllSettings()
      .then((settings) => {
        const remoteMode = settings['user_mode'] as UserMode
        // Only override local if remote is set and valid
        if (remoteMode && (remoteMode === 'english_learner' || remoteMode === 'ai_learner')) {
          setMode(remoteMode)
          localStorage.setItem('user_mode', remoteMode)
        }
      })
      .catch((err) => {
        console.warn('Failed to sync user preferences from server:', err)
      })
      
    setMounted(true)
  }, [])

  const handleSetMode = (newMode: UserMode) => {
    // Optimistic update
    setMode(newMode)
    localStorage.setItem('user_mode', newMode)
    
    // Persist to backend
    updateSetting('user_mode', newMode).catch((err) => {
      console.error('Failed to persist user mode to server:', err)
    })
  }

  return (
    <UserPreferencesContext.Provider value={{ 
      mode, 
      setMode: handleSetMode,
      isEnglishLearner: mode === 'english_learner',
      isAiLearner: mode === 'ai_learner'
    }}>
      {children}
    </UserPreferencesContext.Provider>
  )
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext)
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider')
  }
  return context
}
