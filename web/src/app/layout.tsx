import './globals.css'
import type { Metadata } from 'next'
import { UserPreferencesProvider } from '@/lib/preferences'
import { ToastProvider } from '@/components/Toast'
import { AuthProvider } from '@/lib/auth'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'

export const metadata: Metadata = {
  title: 'Syunjyu',
  description: 'Syunjyu · Your AI-powered learning companion',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white h-screen w-screen overflow-hidden font-sans antialiased selection:bg-pink-500/30 selection:text-pink-900">
        <AuthProvider>
          <UserPreferencesProvider>
            <ToastProvider>
              <AuthenticatedLayout>
                {children}
              </AuthenticatedLayout>
            </ToastProvider>
          </UserPreferencesProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
