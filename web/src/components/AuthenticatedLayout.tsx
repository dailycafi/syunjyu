'use client'

import { useAuth } from '@/lib/auth'
import LoginScreen from './LoginScreen'
import Sidebar from './Sidebar'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth()

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f3ced8] via-[#f8edb7] to-[#cfd8ff]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/50 rounded-full" />
            <div className="w-16 h-16 border-4 border-t-[#b0416b] rounded-full animate-spin absolute top-0 left-0" />
          </div>
          <p className="text-slate-600 font-medium">Loading...</p>
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
