'use client'

import { useAuth } from '@/lib/auth'
import LoginScreen from './LoginScreen'
import Sidebar from './Sidebar'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

// Taylor Swift lyrics for the loading screen
const lyrics = [
  "Long story short, I survived.",
  "We are never getting back together.",
  "Shake it off.",
  "It's me, hi, I'm the problem, it's me.",
  "In my dreams, you're touching my face.",
  "I knew you were trouble when you walked in.",
  "We were both young when I first saw you.",
  "Band-aids don't fix bullet holes.",
  "Look what you made me do.",
  "I think I've seen this film before.",
  "All's well that ends well to end up with you.",
  "I'm only me when I'm with you.",
  "Today was a fairytale.",
  "This is me trying.",
  "You belong with me.",
  "Fearless.",
]

function StartupScreen({ status, error }: { status: string; error?: string }) {
  const [currentLyric, setCurrentLyric] = useState(0)
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (status === 'error') return

    // Rotate lyrics
    const lyricInterval = setInterval(() => {
      setCurrentLyric((prev) => (prev + 1) % lyrics.length)
    }, 3000)

    // Animate dots
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 400)

    return () => {
      clearInterval(lyricInterval)
      clearInterval(dotInterval)
    }
  }, [status])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] overflow-hidden relative">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a]/80" />
      
      {/* Animated background lines */}
      <div className="absolute inset-0 overflow-hidden opacity-[0.03]">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-px bg-white"
            style={{
              top: `${20 + i * 15}%`,
              left: 0,
              right: 0,
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{
              duration: 2,
              delay: i * 0.2,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-8 max-w-lg">
        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-800 flex items-center justify-center shadow-2xl">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 rounded-full border border-neutral-600"
              style={{
                background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.1), transparent)',
              }}
            />
          </div>
        </motion.div>

        {/* Brand name */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-2xl font-light tracking-[0.3em] text-neutral-300 mb-16 uppercase"
        >
          Syunjyu
        </motion.h1>

        {/* Lyric display */}
        <div className="h-20 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {status === 'error' ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <p className="text-red-400/80 text-sm mb-4">
                  {error || 'Something went wrong'}
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 text-xs tracking-widest uppercase text-neutral-400 border border-neutral-700 rounded-full hover:border-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  Retry
                </motion.button>
              </motion.div>
            ) : (
              <motion.p
                key={currentLyric}
                initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="text-neutral-500 text-center text-sm italic font-light tracking-wide"
              >
                "{lyrics[currentLyric]}"
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Loading indicator */}
        {status !== 'error' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 flex items-center gap-3"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 h-1 rounded-full bg-neutral-600"
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
            <span className="text-neutral-600 text-xs tracking-wider w-16">
              Loading{dots}
            </span>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 text-neutral-700 text-[10px] tracking-[0.2em] uppercase"
      >
        © Syunjyu
      </motion.footer>
    </div>
  )
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { isAuthenticated, isLoading, backendReady } = useAuth()
  const [startupError, setStartupError] = useState<string | null>(null)

  // 监听后端错误事件
  useEffect(() => {
    if (typeof window === 'undefined') return

    const tauri = (window as any).__TAURI__
    if (!tauri?.event?.listen) return

    const unlisten = tauri.event.listen('backend-error', (event: any) => {
      setStartupError(event.payload?.error || 'Backend startup failed')
    })

    return () => {
      unlisten.then((fn: () => void) => fn())
    }
  }, [])

  // 等待后端启动
  if (!backendReady) {
    return <StartupScreen status={startupError ? 'error' : 'loading'} error={startupError || undefined} />
  }

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 rounded-full border border-neutral-700 border-t-neutral-400"
          />
          <p className="text-neutral-600 text-xs tracking-widest uppercase">
            Authenticating
          </p>
        </motion.div>
      </div>
    )
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />
  }

  // Show authenticated layout with sidebar
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Desktop Sidebar - Only visible on md+ screens */}
      <div className="hidden md:block h-full shrink-0">
        <Sidebar isMobile={false} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-gray-50">
        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative w-full">
          {children}
        </main>

        {/* Mobile Bottom Navigation - Only visible on small screens */}
        <div className="md:hidden shrink-0 relative z-50 bg-white border-t border-gray-100 safe-area-bottom">
          <Sidebar isMobile={true} />
        </div>
      </div>
    </div>
  )
}
