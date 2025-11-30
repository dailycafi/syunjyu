'use client'

import { useEffect, useState } from 'react'
import { register, login, logout, sync, getSyncStatus } from '@/lib/api'
import { useToast } from '@/components/Toast'

export default function AccountPage() {
  const { showToast } = useToast()
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadSyncStatus()
  }, [])

  const loadSyncStatus = async () => {
    setLoading(true)
    try {
      const status = await getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('Failed to load sync status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await register(email, password)
      }

      showToast(isLogin ? 'Logged in successfully!' : 'Registered successfully!', 'success')
      setEmail('')
      setPassword('')
      loadSyncStatus()
    } catch (error) {
      console.error('Auth failed:', error)
      showToast('Authentication failed', 'error')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      showToast('Logged out successfully', 'success')
      loadSyncStatus()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await sync()
      showToast(
        `Sync completed! Uploaded: ${result.uploaded}, Downloaded: ${result.downloaded}`,
        'success'
      )
      loadSyncStatus()
    } catch (error) {
      console.error('Sync failed:', error)
      showToast('Sync failed. Please check your connection and try again.', 'error')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Account & Sync</h1>

      {syncStatus?.logged_in ? (
        /* Logged In View */
        <div className="space-y-6">
          {/* Account info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Account</h2>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">User ID:</span> {syncStatus.user_id}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Status:</span>{' '}
                <span className="text-green-600">Logged In</span>
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="mt-4 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
            >
              Logout
            </button>
          </div>

          {/* Sync status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Synchronization</h2>

            <div className="space-y-3 mb-6">
              <p className="text-gray-700">
                <span className="font-medium">Last Sync:</span>{' '}
                {syncStatus.last_sync
                  ? new Date(syncStatus.last_sync).toLocaleString()
                  : 'Never'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Auto Sync:</span>{' '}
                {syncStatus.auto_sync ? (
                  <span className="text-green-600">Enabled</span>
                ) : (
                  <span className="text-gray-500">Disabled</span>
                )}
              </p>
            </div>

            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? 'Syncing...' : '🔄 Sync Now'}
            </button>

            <p className="mt-4 text-sm text-gray-600">
              Sync will upload your local changes (starred news, concepts, phrases)
              and download changes from the server.
            </p>
          </div>
        </div>
      ) : (
        /* Not Logged In View */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            {isLogin ? 'Login' : 'Create Account'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition font-medium"
            >
              {isLogin ? 'Login' : 'Register'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline text-sm"
            >
              {isLogin
                ? "Don't have an account? Register"
                : 'Already have an account? Login'}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Login to enable cloud synchronization of your data across devices.
              All data is stored locally by default.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
