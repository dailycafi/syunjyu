'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/Toast'
import {
  getAllSettings,
  updateSetting,
  exportPDF,
  getLocalModels,
} from '@/lib/api'
import { config } from '@/lib/config'

export default function SettingsPage() {
  const { showToast } = useToast()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [localModels, setLocalModels] = useState<any[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  
  // Local connection state
  const [localHost, setLocalHost] = useState('127.0.0.1')
  const [localPort, setLocalPort] = useState('8500')

  useEffect(() => {
    // Load local connection settings from localStorage
    if (typeof window !== 'undefined') {
      const savedHost = localStorage.getItem('custom_api_host')
      const savedPort = localStorage.getItem('custom_api_port')
      if (savedHost) setLocalHost(savedHost)
      if (savedPort) setLocalPort(savedPort)
    }
    
    loadData()
    loadModels()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const settingsData = await getAllSettings()
      setSettings(settingsData)
    } catch (error) {
      console.error('Failed to load settings:', error)
      // Even if backend is down, we allow changing local settings
    } finally {
      setLoading(false)
    }
  }

  const loadModels = async () => {
    setLoadingModels(true)
    try {
      const res = await getLocalModels()
      if (res && res.models) {
        setLocalModels(res.models)
      }
    } catch (error) {
      console.error('Failed to load local models:', error)
    } finally {
      setLoadingModels(false)
    }
  }

  const handleSaveSetting = async (key: string, value: string) => {
    setSaving(true)
    try {
      await updateSetting(key, value)
      setSettings((prev) => ({ ...prev, [key]: value }))

      // Enforce default model when switching to Remote
      if (key === 'model_provider' && value === 'remote') {
        await updateSetting('remote_provider', config.DEFAULT_REMOTE_PROVIDER)
        await updateSetting('remote_model_name', config.DEFAULT_MODEL_NAME)
        setSettings(prev => ({
            ...prev, 
            remote_provider: config.DEFAULT_REMOTE_PROVIDER,
            remote_model_name: config.DEFAULT_MODEL_NAME
        }))
      }
      
      // Reload models if base URL changed
      if (key === 'local_model_base_url') {
          loadModels()
      }

      // Dispatch custom event for Sidebar update
      window.dispatchEvent(new Event('settings_updated'))
    } catch (error) {
      console.error('Failed to save setting:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveLocalConnection = () => {
    localStorage.setItem('custom_api_host', localHost)
    localStorage.setItem('custom_api_port', localPort)
    showToast('Local connection settings saved. Please refresh to apply.', 'success')
    setTimeout(() => window.location.reload(), 1000)
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
      showToast('Failed to export PDF', 'error')
    }
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Settings</h1>

      <div className="space-y-8">
        
        {/* AI Model Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-800">AI Model Configuration</h2>
            <p className="text-sm text-slate-500">Choose between Local LLM Service or Remote API</p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Model Provider
              </label>
              <select
                value={settings.model_provider || 'local'}
                onChange={(e) => handleSaveSetting('model_provider', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="local">Local</option>
                <option value="remote">Remote</option>
              </select>
            </div>

            {/* Local Service Configuration */}
            {(settings.model_provider === 'local' || !settings.model_provider) && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Base URL
                  </label>
                  <div className="flex gap-2">
                    <input
                        type="text"
                        value={settings.local_model_base_url || 'http://127.0.0.1:1234/v1'}
                        onChange={(e) => setSettings(prev => ({ ...prev, local_model_base_url: e.target.value }))}
                        onBlur={(e) => handleSaveSetting('local_model_base_url', e.target.value)}
                        placeholder="http://127.0.0.1:1234/v1"
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                    <button 
                        onClick={loadModels}
                        disabled={loadingModels}
                        className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {loadingModels ? 'Loading...' : 'Refresh Models'}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Examples: LM Studio (http://127.0.0.1:1234/v1), Ollama (http://127.0.0.1:11434/v1)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Model Name
                  </label>
                  <div className="relative">
                    <select
                        value={settings.local_model_name || ''}
                        onChange={(e) => {
                        setSettings(prev => ({ ...prev, local_model_name: e.target.value }))
                        handleSaveSetting('local_model_name', e.target.value)
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    >
                        <option value="" disabled>Select a model...</option>
                        {localModels.length > 0 ? (
                            localModels.map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.name || model.id}
                                </option>
                            ))
                        ) : (
                            <>
                                <option value="gpt-3.5-turbo">gpt-3.5-turbo (Default)</option>
                                <option value="local-model">local-model (Generic)</option>
                            </>
                        )}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                   {localModels.length === 0 && !loadingModels && (
                      <p className="mt-1 text-xs text-amber-600">
                          Could not fetch models from Base URL. Using default options. Check if your local server is running.
                      </p>
                  )}
                </div>
              </div>
            )}

            {/* Remote Service Configuration */}
            {settings.model_provider === 'remote' && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Provider
                  </label>
                  <select
                    disabled
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                    value="MINIMAX"
                  >
                    <option value="MINIMAX">MINIMAX</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value="sk-••••••••••••••••••••••••"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed font-mono"
                    />
                    <div className="mt-2 text-xs text-slate-500">
                      Demo version uses built-in key. API Key modification is disabled.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Backend Connection (Local Settings) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-800">Backend Connection</h2>
            <p className="text-sm text-slate-500">Configure connection to Python backend</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Host Address
                </label>
                <input
                  type="text"
                  value={localHost}
                  onChange={(e) => setLocalHost(e.target.value)}
                  placeholder="127.0.0.1"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Port
                </label>
                <input
                  type="text"
                  value={localPort}
                  onChange={(e) => setLocalPort(e.target.value)}
                  placeholder="8500"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleSaveLocalConnection}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Connection
              </button>
            </div>
          </div>
        </div>

        {/* Export Data */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-800">Export Data</h2>
            <p className="text-sm text-slate-500">Download your data for offline use</p>
          </div>
          
          <div className="p-6">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => handleExportPDF('news')}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <span>📰</span> Export News PDF
              </button>
              <button
                onClick={() => handleExportPDF('concepts')}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <span>💡</span> Export Concepts PDF
              </button>
              <button
                onClick={() => handleExportPDF('phrases')}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <span>📚</span> Export Phrases PDF
              </button>
            </div>
          </div>
        </div>

        {/* Synchronization */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-800">Synchronization</h2>
          </div>
          
          <div className="p-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_sync_enabled === 'true'}
                onChange={(e) =>
                  handleSaveSetting('auto_sync_enabled', e.target.checked ? 'true' : 'false')
                }
                className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-slate-700">
                Enable automatic synchronization when logged in
              </span>
            </label>
          </div>
        </div>

      </div>
    </div>
  )
}