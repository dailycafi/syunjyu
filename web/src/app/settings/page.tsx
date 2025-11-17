'use client'

import { useEffect, useState } from 'react'
import {
  getAllSettings,
  updateSetting,
  getLocalModels,
  getRemoteProviders,
  exportPDF,
} from '@/lib/api'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [localModels, setLocalModels] = useState<any[]>([])
  const [remoteProviders, setRemoteProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [settingsData, modelsData, providersData] = await Promise.all([
        getAllSettings(),
        getLocalModels(),
        getRemoteProviders(),
      ])

      setSettings(settingsData)
      setLocalModels(modelsData.models || [])
      setRemoteProviders(providersData.providers || [])
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (key: string, value: string) => {
    setSaving(true)
    try {
      await updateSetting(key, value)
      setSettings((prev) => ({ ...prev, [key]: value }))
      alert('Setting saved successfully!')
    } catch (error) {
      console.error('Failed to save setting:', error)
      alert('Failed to save setting')
    } finally {
      setSaving(false)
    }
  }

  const handleExportPDF = async (type: 'news' | 'concepts' | 'phrases') => {
    try {
      const blob = await exportPDF({ type })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_export.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export PDF:', error)
      alert('Failed to export PDF')
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
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="space-y-6">
        {/* Model Provider Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Model Settings</h2>

          {/* Provider choice */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Provider
            </label>
            <select
              value={settings.model_provider || 'local'}
              onChange={(e) => handleSave('model_provider', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="local">Local Model</option>
              <option value="remote">Remote API</option>
            </select>
          </div>

          {/* Local model selection */}
          {settings.model_provider === 'local' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Local Model
              </label>
              <select
                value={settings.local_model_name || 'local_medium'}
                onChange={(e) => handleSave('local_model_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {localModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} - {model.description}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-500">
                Note: Local models are preset. No download required.
              </p>
            </div>
          )}

          {/* Remote provider selection */}
          {settings.model_provider === 'remote' && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remote Provider
                </label>
                <select
                  value={settings.remote_provider || 'openai'}
                  onChange={(e) => handleSave('remote_provider', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {remoteProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key inputs */}
              <div className="space-y-4">
                {remoteProviders.map((provider) => (
                  <div key={provider.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {provider.name} API Key
                    </label>
                    <input
                      type="password"
                      value={settings[`${provider.id}_api_key`] || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          [`${provider.id}_api_key`]: e.target.value,
                        }))
                      }
                      onBlur={(e) =>
                        handleSave(`${provider.id}_api_key`, e.target.value)
                      }
                      placeholder="Enter API key"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* PDF Export */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Export Data</h2>
          <p className="text-gray-600 mb-4">
            Export your data as PDF files for offline viewing.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleExportPDF('news')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
            >
              Export News
            </button>
            <button
              onClick={() => handleExportPDF('concepts')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
            >
              Export Concepts
            </button>
            <button
              onClick={() => handleExportPDF('phrases')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
            >
              Export Phrases
            </button>
          </div>
        </div>

        {/* Auto-sync */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Synchronization</h2>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.auto_sync_enabled === 'true'}
              onChange={(e) =>
                handleSave('auto_sync_enabled', e.target.checked ? 'true' : 'false')
              }
              className="w-5 h-5 text-primary rounded focus:ring-primary"
            />
            <span className="text-gray-700">
              Enable automatic synchronization (when logged in)
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}
