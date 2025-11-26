'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useUserPreferences } from '@/lib/preferences'
import { getAllSettings } from '@/lib/api'

export default function Sidebar() {
  const pathname = usePathname()
  const { mode, setMode, isEnglishLearner } = useUserPreferences()
  const [modelName, setModelName] = useState('MiniMax-M2')
  const [providerType, setProviderType] = useState('Remote')

  const navigation = [
    { name: 'News Feed', href: '/', icon: '📰', gradient: 'from-[#f3ced8] to-[#b0416b]' },
    { name: 'Learning Library', href: '/phrases/', icon: isEnglishLearner ? '📚' : '🧠', gradient: 'from-[#cfd8ff] to-[#b7c8f2]' },
    { name: 'Sources', href: '/sources/', icon: '🌐', gradient: 'from-[#b0416b] to-[#ceb5e0]' },
    { name: 'Settings', href: '/settings/', icon: '⚙️', gradient: 'from-[#ceb5e0] to-[#b68a72]' },
    { name: 'Account', href: '/account/', icon: '👤', gradient: 'from-[#f3ced8] to-[#ceb5e0]' },
  ]

  useEffect(() => {
    // Fetch current model settings on mount
    const fetchSettings = async () => {
      try {
        // We check localStorage first for immediate update if user just changed it
        // But for persistent state, we also fetch from backend or rely on what we saved.
        // Since SettingsPage saves to DB, we fetch from DB.
        const settings = await getAllSettings()
        
        // Check for default/fallback logic
        let provider = settings.model_provider || 'local' // Default to 'local' if undefined, matching DB default
        
        if (provider === 'local') {
            setProviderType('Local')
            setModelName(settings.local_model_name || 'gpt-oss-20B')
        } else {
            setProviderType('Remote')
            // Enforce MiniMax-M2 for remote, ignoring any legacy GPT values
            const remoteModel = settings.remote_model_name
            if (remoteModel && !remoteModel.toLowerCase().includes('gpt')) {
                setModelName(remoteModel)
            } else {
                setModelName('MiniMax-M2')
            }
        }
      } catch (e) {
        console.error("Failed to fetch settings for sidebar", e)
      }
    }
    
    fetchSettings()
    
    // Listen for custom event 'settings_updated' to refresh settings
    const handleSettingsUpdated = () => {
        fetchSettings()
    }
    window.addEventListener('settings_updated', handleSettingsUpdated)
    
    return () => {
        window.removeEventListener('settings_updated', handleSettingsUpdated)
    }
  }, [pathname]) // Re-check when navigating

  return (
    <aside className="w-64 bg-gradient-to-b from-[#f9cde0] via-[#fdf2d3] to-[#cfd8ff] text-slate-900 flex flex-col shadow-2xl border-r border-white/60 relative overflow-hidden">
      
      {/* Dynamic Background Accent based on Mode */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 z-10 ${
          isEnglishLearner 
            ? 'bg-gradient-to-r from-pink-400 to-rose-500' 
            : 'bg-gradient-to-r from-blue-500 to-indigo-600'
      }`} />

      {/* Logo/Title */}
      <div className="p-6 border-b border-white/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Syunjyun Agent logo"
              width={28}
              height={28}
              priority
              className="rounded-lg object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Syunjyun Agent
            </h1>
            <p className="text-xs text-slate-500 font-medium">AI News Monitor</p>
          </div>
        </div>
      </div>

      {/* Mode Switcher - Improved Visibility */}
      <div className="px-4 pt-4 pb-0">
        <div className={`rounded-xl p-1.5 flex text-xs font-bold shadow-inner border transition-colors duration-300 ${
            isEnglishLearner 
                ? 'bg-pink-50/50 border-pink-100' 
                : 'bg-blue-50/50 border-blue-100'
        }`}>
          <button 
            onClick={() => setMode('english_learner')}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all relative overflow-hidden ${
              mode === 'english_learner' 
                ? 'bg-white text-pink-600 shadow-md ring-1 ring-pink-100' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
            }`}
          >
            <span className="text-base">📖</span>
            <span>English</span>
            {mode === 'english_learner' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-pink-400 rounded-full"></div>
            )}
          </button>
          <button 
            onClick={() => setMode('ai_learner')}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all relative overflow-hidden ${
              mode === 'ai_learner' 
                ? 'bg-white text-blue-600 shadow-md ring-1 ring-blue-100' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
            }`}
          >
            <span className="text-base">🤖</span>
            <span>AI Tech</span>
            {mode === 'ai_learner' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-full"></div>
            )}
          </button>
        </div>
        
        {/* Mode Context Hint */}
        <div className="mt-2 px-2 flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-500 opacity-70">
            {isEnglishLearner ? (
                <>
                    <span>Vocabulary</span>
                    <span>•</span>
                    <span>Grammar</span>
                    <span>•</span>
                    <span>Quiz</span>
                </>
            ) : (
                <>
                    <span>Insights</span>
                    <span>•</span>
                    <span>Trends</span>
                    <span>•</span>
                    <span>Analysis</span>
                </>
            )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white/80 text-slate-900 shadow-lg border border-white/70'
                  : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#b0416b] rounded-r-full" />
              )}

              {/* Icon with gradient background on hover */}
              <div className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-br from-[#f8edb7] to-[#cfd8ff]'
                  : 'bg-white/50 group-hover:bg-gradient-to-br group-hover:' + item.gradient
              }`}>
                <span className="text-lg">{item.icon}</span>
              </div>

              {/* Text */}
              <span className="flex-1">{item.name}</span>

              {/* Hover arrow */}
              {!isActive && (
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-slate-500">
                  →
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer with gradient */}
      <div className="p-4 border-t border-white/60">
        <div className="px-4 py-3 rounded-lg bg-white/70 border border-white/80 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Model</span>
            <span className="font-semibold text-slate-800 truncate max-w-[100px]">{modelName}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Mode</span>
            <div className={`flex items-center gap-2 font-medium ${
                providerType === 'Local' ? 'text-green-600' : 'text-blue-600'
            }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                  providerType === 'Local' ? 'bg-green-500' : 'bg-blue-500'
              }`} />
              {providerType}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
