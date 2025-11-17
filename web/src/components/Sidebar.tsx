'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: 'News Feed', href: '/', icon: '📰', gradient: 'from-[#f3ced8] to-[#b0416b]' },
  { name: 'Concepts', href: '/concepts/', icon: '💡', gradient: 'from-[#f8edb7] to-[#f3d5b5]' },
  { name: 'Learning Library', href: '/phrases/', icon: '📚', gradient: 'from-[#cfd8ff] to-[#b7c8f2]' },
  { name: 'Settings', href: '/settings/', icon: '⚙️', gradient: 'from-[#ceb5e0] to-[#b68a72]' },
  { name: 'Account', href: '/account/', icon: '👤', gradient: 'from-[#f3ced8] to-[#ceb5e0]' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-gradient-to-b from-[#f9cde0] via-[#fdf2d3] to-[#cfd8ff] text-slate-900 flex flex-col shadow-2xl border-r border-white/60">
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
            <span className="font-semibold text-slate-800">swift-llm</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Mode</span>
            <div className="flex items-center gap-2 text-emerald-600 font-medium">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Local
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
