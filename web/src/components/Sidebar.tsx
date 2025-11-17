'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: 'News Feed', href: '/', icon: '📰' },
  { name: 'Concepts', href: '/concepts/', icon: '💡' },
  { name: 'Learning Library', href: '/phrases/', icon: '📚' },
  { name: 'Settings', href: '/settings/', icon: '⚙️' },
  { name: 'Account', href: '/account/', icon: '👤' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo/Title */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">AI Daily</h1>
        <p className="text-sm text-gray-400 mt-1">News & Learning</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 text-sm text-gray-400">
        <p>v0.1.0</p>
      </div>
    </aside>
  )
}
