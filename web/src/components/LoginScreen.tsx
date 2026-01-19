'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'

// 经典歌词作为英语学习示例 (Daily Quotes) - 筛选与智慧、记忆、语言相关的歌词
const QUOTES = [
  "Never be so kind, you forget to be clever.", // Marjorie - 强调智慧
  "What if I told you I'm a mastermind?", // Mastermind - 隐喻AI的策划能力
  "I remember it all too well.", // All Too Well - 记忆与知识库
  "Are you ready for it?", // ...Ready For It? - 迎接新知识/AI时代
  "It's a new soundtrack, I could dance to this beat.", // Welcome to New York - 适应新语言环境
  "Long story short, I survived.", // long story short - 学习过程中的坚持
  "Speak now.", // Speak Now - 鼓励开口说英语
  "I wanna be defined by the things that I love.", // Daylight - 学习兴趣
  "The rest of the world was black and white, but we were in screaming color.", // Out of the Woods - 语言带来的丰富视角
  "Ask me what I learned from all those years." // Karma - 总结与成长
]

export default function LoginScreen() {
  const { login, register, isLoading } = useAuth()
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentQuote, setCurrentQuote] = useState(0)

  useEffect(() => {
    setMounted(true)
    // 轮换歌词
    const interval = setInterval(() => {
      setCurrentQuote(prev => (prev + 1) % QUOTES.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (!isLoginMode && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!isLoginMode && password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!isLoginMode && !inviteCode.trim()) {
      setError('Invite code is required')
      return
    }

    setSubmitting(true)
    try {
      if (isLoginMode) {
        await login(email, password)
      } else {
        await register(email, password, inviteCode.trim())
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode)
    setError('')
    setConfirmPassword('')
    setInviteCode('')
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-white">
      {/* 左侧 - 品牌形象区域 (桌面端显示) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0f172a]">
        {/* 高级感渐变背景 - 隐喻 Eras 色彩但更深邃 */}
        <div 
          className="absolute inset-0 opacity-90"
          style={{
            background: `
              radial-gradient(circle at 100% 0%, #b0416b 0%, transparent 40%),
              radial-gradient(circle at 0% 100%, #2e1065 0%, transparent 40%),
              radial-gradient(circle at 50% 50%, #1e1b4b 0%, #0f172a 100%)
            `,
          }}
        />
        
        {/* 噪点纹理叠加，增加质感 */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

        {/* 内容 */}
        <div className="relative z-10 flex flex-col justify-between w-full h-full p-16 xl:p-20 text-white">
          {/* 顶部 Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#f3ced8] to-[#b0416b] flex items-center justify-center shadow-lg shadow-pink-900/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Syunjyu
            </h1>
          </div>

          {/* 中间 - 动态 Quote */}
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-8 bg-pink-400/50"></span>
              <p className="text-xs font-semibold tracking-[0.2em] text-pink-200/80 uppercase">
                Daily Inspiration
              </p>
            </div>
            
            <div className="relative h-32"> {/* 固定高度防止跳动 */}
              <p 
                key={currentQuote}
                className="text-3xl xl:text-4xl font-serif leading-tight text-white/95 animate-in fade-in slide-in-from-bottom-4 duration-700"
              >
                "{QUOTES[currentQuote]}"
              </p>
            </div>
            
            <p className="mt-8 text-lg text-slate-400 font-light max-w-sm">
              Your AI-powered companion for mastering English through culture and conversation.
            </p>
          </div>

          {/* 底部版权 */}
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <span>© 2024 Syunjyu</span>
            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
            <span>AI Learning Agent</span>
          </div>
        </div>
      </div>

      {/* 右侧 - 登录表单 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white relative">
        <div className="w-full max-w-[420px] px-6 py-12">
          {/* 移动端 Logo (仅移动端显示) */}
          <div className="lg:hidden mb-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#b0416b] flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900">Syunjyu</span>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              {isLoginMode ? 'Welcome back' : 'Start your journey'}
            </h2>
            <p className="text-slate-500 mt-2 text-base">
              {isLoginMode 
                ? 'Enter your details to access your learning space.' 
                : 'Create an account to begin your AI learning experience.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#b0416b] focus:ring-1 focus:ring-[#b0416b] transition-all bg-slate-50 focus:bg-white"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#b0416b] focus:ring-1 focus:ring-[#b0416b] transition-all bg-slate-50 focus:bg-white"
                autoComplete={isLoginMode ? 'current-password' : 'new-password'}
              />
            </div>

            {!isLoginMode && (
              <>
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#b0416b] focus:ring-1 focus:ring-[#b0416b] transition-all bg-slate-50 focus:bg-white"
                    autoComplete="new-password"
                  />
                </div>
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Invite Code
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter your invite code"
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#b0416b] focus:ring-1 focus:ring-[#b0416b] transition-all bg-slate-50 focus:bg-white"
                    autoComplete="off"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-start gap-2">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || isLoading}
              className="w-full py-3.5 rounded-lg font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #b0416b 0%, #8b2c50 100%)',
              }}
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isLoginMode ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm">
              {isLoginMode ? "New to Syunjyu?" : 'Already have an account?'}
              <button
                type="button"
                onClick={toggleMode}
                className="ml-2 font-semibold text-[#b0416b] hover:text-[#8b2c50] transition-colors"
              >
                {isLoginMode ? 'Create an account' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
