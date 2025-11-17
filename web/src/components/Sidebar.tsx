'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: 'News Feed', href: '/', icon: '📰', gradient: 'from-blue-500 to-indigo-600' },
  { name: 'Concepts', href: '/concepts/', icon: '💡', gradient: 'from-amber-500 to-orange-600' },
  { name: 'Learning Library', href: '/phrases/', icon: '📚', gradient: 'from-green-500 to-emerald-600' },
  { name: 'Settings', href: '/settings/', icon: '⚙️', gradient: 'from-slate-500 to-slate-600' },
  { name: 'Account', href: '/account/', icon: '👤', gradient: 'from-purple-500 to-pink-600' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col shadow-2xl">
      {/* Logo/Title */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              AI Daily
            </h1>
            <p className="text-xs text-slate-400 font-medium">News & Learning</p>
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
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/30'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
              )}

              {/* Icon with gradient background on hover */}
              <div className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-white/20'
                  : 'bg-slate-800 group-hover:bg-gradient-to-br group-hover:' + item.gradient
              }`}>
                <span className="text-lg">{item.icon}</span>
              </div>

              {/* Text */}
              <span className="flex-1">{item.name}</span>

              {/* Hover arrow */}
              {!isActive && (
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-slate-400">
                  →
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer with gradient */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Version</span>
            <span className="font-semibold text-slate-300">0.1.0</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Status</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 font-medium">Online</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
