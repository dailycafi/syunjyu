'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'

import { useUserPreferences } from '@/lib/preferences'
import { getAllSettings } from '@/lib/api'
import { config } from '@/lib/config'

// Elegant SVG Icons
const Icons = {
  // News Feed - newspaper/article icon
  news: (className?: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8M18 18h-8M10 6h8M10 10h8" />
    </svg>
  ),
  // Learning Library - book with bookmark
  library: (className?: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  ),
  // AI/Brain icon for AI learner mode
  brain: (className?: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4.5a2.5 2.5 0 00-4.96-.46 2.5 2.5 0 00-1.98 3 2.5 2.5 0 00-1.32 4.24 3 3 0 00.34 5.58 2.5 2.5 0 002.96 3.08A2.5 2.5 0 0012 19.5V4.5z" />
      <path d="M12 4.5a2.5 2.5 0 014.96-.46 2.5 2.5 0 011.98 3 2.5 2.5 0 011.32 4.24 3 3 0 01-.34 5.58 2.5 2.5 0 01-2.96 3.08A2.5 2.5 0 0012 19.5" />
      <path d="M12 4.5v15" />
    </svg>
  ),
  // Sources - globe with connections
  globe: (className?: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
  // Settings - refined gear
  settings: (className?: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  // Account - user with circle
  user: (className?: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 10-16 0" />
    </svg>
  ),
  // English mode - open book
  book: (className?: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  ),
  // AI Tech mode - sparkles/AI
  sparkles: (className?: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
      <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
    </svg>
  ),
}

type NavItem = {
  name: string
  href: string
  icon: (className?: string) => ReactNode
  gradient: string
}

export default function Sidebar({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname()
  const { mode, setMode, isEnglishLearner } = useUserPreferences()
  const [modelName, setModelName] = useState(config.DEFAULT_MODEL_NAME)
  const [providerType, setProviderType] = useState('Remote')

  const navigation: NavItem[] = [
    { name: 'News Feed', href: '/', icon: Icons.news, gradient: 'from-[#f3ced8] to-[#b0416b]' },
    { name: 'Learning Library', href: '/phrases/', icon: isEnglishLearner ? Icons.library : Icons.brain, gradient: 'from-[#cfd8ff] to-[#b7c8f2]' },
    { name: 'Sources', href: '/sources/', icon: Icons.globe, gradient: 'from-[#b0416b] to-[#ceb5e0]' },
    { name: 'Settings', href: '/settings/', icon: Icons.settings, gradient: 'from-[#ceb5e0] to-[#b68a72]' },
    { name: 'Account', href: '/account/', icon: Icons.user, gradient: 'from-[#f3ced8] to-[#ceb5e0]' },
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
            let localName = settings.local_model_name
            // If no model set, or if it's one of the old defaults, upgrade to Qwen
            if (!localName || localName === 'local_medium' || localName === 'gpt-oss-20B') {
                localName = 'Qwen 3 (14B)'
            }
            setModelName(localName)
        } else {
            setProviderType('Remote')
            // Use config default for remote, ignoring any legacy GPT values
            const remoteModel = settings.remote_model_name
            if (remoteModel && !remoteModel.toLowerCase().includes('gpt')) {
                setModelName(remoteModel)
            } else {
                setModelName(config.DEFAULT_MODEL_NAME)
            }
        }

        // Demo Mode Override
        // If NEXT_PUBLIC_DEMO_MODE is 'true', force display to Local / Qwen 3 (14B)
        if (config.IS_DEMO_MODE) {
            setProviderType('Local')
            setModelName('Qwen 3 (14B)')
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

  if (isMobile) {
    return (
      <aside className="w-full bg-gradient-to-r from-[#f9cde0] via-[#fdf2d3] to-[#cfd8ff] text-slate-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-white/60 relative shrink-0 z-50 flex items-center justify-between px-2 py-2">
        
        {/* Simplified Navigation for Mobile */}
        <nav className="flex-1 flex items-center justify-around">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            // For Settings/Account in mobile view, we might want to hide them or keep them?
            // Let's show top 4 items or just icons
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-slate-900'
                    : 'text-slate-500 hover:bg-white/30'
                }`}
              >
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-br from-[#f8edb7] to-[#cfd8ff] shadow-sm'
                    : 'bg-transparent'
                }`}>
                  {item.icon('w-5 h-5')}
                </div>
                <span className="text-[10px] font-medium">{item.name.split(' ')[0]}</span>
              </Link>
            )
          })}
        </nav>

        {/* Quick Mode Toggle for Mobile */}
        <div className="border-l border-white/50 pl-2 ml-2">
             <button 
                onClick={() => setMode(isEnglishLearner ? 'ai_learner' : 'english_learner')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/60 shadow-sm active:scale-95 transition-all text-slate-600"
             >
                {isEnglishLearner ? Icons.book('w-5 h-5') : Icons.sparkles('w-5 h-5')}
             </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-64 h-full bg-gradient-to-b from-[#f9cde0] via-[#fdf2d3] to-[#cfd8ff] text-slate-900 flex flex-col shadow-2xl border-r border-white/60 relative overflow-hidden">
      
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
            <h1 className="text-xl font-bold text-slate-900 font-brand tracking-tight">
              Syunjyun Agent
            </h1>
            <p className="text-xs text-slate-500 font-tagline font-medium tracking-wide">AI News Monitor</p>
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
            {Icons.book('w-4 h-4')}
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
            {Icons.sparkles('w-4 h-4')}
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
                {item.icon('w-[18px] h-[18px]')}
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
