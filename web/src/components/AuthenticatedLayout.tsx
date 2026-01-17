'use client'

import { useAuth } from '@/lib/auth'
import LoginScreen from './LoginScreen'
import Sidebar from './Sidebar'
import { useEffect, useState } from 'react'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

// 启动画面组件
function StartupScreen({ status, error }: { status: string; error?: string }) {
  const tips = [
    '正在唤醒 AI 助手...',
    '准备学习资料中...',
    '连接知识库...',
    '初始化完成，即将进入...',
  ]
  
  const [tipIndex, setTipIndex] = useState(0)
  
  useEffect(() => {
    if (status === 'error') return
    
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length)
    }, 2000)
    
    return () => clearInterval(interval)
  }, [status, tips.length])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        {/* 渐变光晕 */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
        
        {/* 星星点缀 */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/40 rounded-full animate-twinkle"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* 主要内容 */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        {/* Logo / 图标 */}
        <div className="relative">
          {/* 外圈光环 */}
          <div className="absolute inset-0 w-32 h-32 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 blur-xl opacity-50 animate-spin-slow" />
          
          {/* Logo 容器 */}
          <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-[#f3ced8] via-[#f8edb7] to-[#cfd8ff] shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform">
            <span className="text-5xl">📚</span>
          </div>
        </div>

        {/* 标题 */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            AI Daily
          </h1>
          <p className="text-white/60 text-lg">
            你的 AI 学习伴侣
          </p>
        </div>

        {/* 加载状态 */}
        {status === 'error' ? (
          <div className="flex flex-col items-center gap-4 mt-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <p className="text-red-300 text-center max-w-xs">
              {error || '启动失败，请重试'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              重新加载
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 mt-4">
            {/* 进度指示器 */}
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full bg-white/30 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            
            {/* 提示文字 */}
            <p className="text-white/70 text-sm h-5 transition-opacity duration-300">
              {tips[tipIndex]}
            </p>
          </div>
        )}
      </div>

      {/* 底部版本信息 */}
      <div className="absolute bottom-8 text-white/30 text-xs">
        v0.1.0
      </div>

      {/* 自定义动画样式 */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
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
      setStartupError(event.payload?.error || '后端启动失败')
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f3ced8] via-[#f8edb7] to-[#cfd8ff]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/50 rounded-full" />
            <div className="w-16 h-16 border-4 border-t-[#b0416b] rounded-full animate-spin absolute top-0 left-0" />
          </div>
          <p className="text-slate-600 font-medium">验证登录状态...</p>
        </div>
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
