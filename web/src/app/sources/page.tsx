'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  getNewsSources,
  updateNewsSourceStatus,
  deleteNewsSource,
  testSourceUrl,
  addNewsSource,
  type NewsSourceRecord,
  type CreateSourcePayload,
} from '@/lib/api'
import { SOURCE_CATEGORIES, type SourceCategoryKey, type SourceCategoryMeta } from '@/lib/sourceCategories'
import { useToast } from '@/components/Toast'

type CategoryFilter = SourceCategoryKey | 'all'

interface CategorySection {
  category: SourceCategoryKey
  sources: NewsSourceRecord[]
  enabledCount: number
}

const getHost = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

const getDeliveryMeta = (source: NewsSourceRecord) => {
  const isRss = Boolean(source.rss_url)
  return {
    label: isRss ? 'RSS' : 'Web',
    accent: isRss ? 'var(--color-sunset-rose)' : 'var(--color-midnight-violet)',
  }
}

// Optimized Source Card Component
const SourceCard = ({ 
  source, 
  meta, 
  testState, 
  isPendingDelete, 
  isDeleting,
  isUpdating,
  onTest, 
  onToggle, 
  onRequestDelete, 
  onConfirmDelete, 
  onCancelDelete 
}: {
  source: NewsSourceRecord
  meta: SourceCategoryMeta
  testState?: 'loading' | 'success' | 'error'
  isPendingDelete: boolean
  isDeleting: boolean
  isUpdating: boolean
  onTest: (url: string) => void
  onToggle: (source: NewsSourceRecord) => void
  onRequestDelete: (id: number) => void
  onConfirmDelete: (id: number) => void
  onCancelDelete: () => void
}) => {
  const delivery = getDeliveryMeta(source)
  const isEnabled = source.enabled === 1
  
  return (
    <div className={`bg-card rounded-2xl px-4 py-3 flex items-center gap-4 border transition-colors duration-200 ${testState === 'error' ? 'border-red-300 bg-red-50/50' : 'border-soft'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
            <p className={`font-semibold ${testState === 'error' ? 'text-slate-500 line-through decoration-red-400' : 'text-primary'}`}>
                {source.name}
            </p>
            {testState === 'loading' && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-500">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Testing
              </span>
            )}
            {testState === 'success' && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Reachable
              </span>
            )}
            {testState === 'error' && (
              <span className="inline-flex items-center gap-1 text-xs text-red-500">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Unreachable
              </span>
            )}
        </div>
        
        <div className="flex items-center gap-3 text-xs text-secondary mt-1">
          <span style={{ color: delivery.accent }}>{delivery.label}</span>
          <span>{getHost(source.url)}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
            type="button"
            onClick={() => onTest(source.url)}
            disabled={testState === 'loading'}
            className="p-2 text-secondary hover:text-primary hover:bg-white/50 rounded-lg transition-colors disabled:opacity-50"
            title="Test availability"
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
        </button>

        <Link
            href={source.url}
            target="_blank"
            className="p-2 text-secondary hover:text-accent hover:bg-white/50 rounded-lg transition-colors"
            title="Open site"
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
        </Link>
        
        {isPendingDelete ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onConfirmDelete(source.id)}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
              disabled={isDeleting}
            >
              {isDeleting ? 'Removing…' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={onCancelDelete}
              className="px-3 py-1 rounded-lg text-xs font-medium text-secondary hover:text-primary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button 
              type="button"
              onClick={() => onRequestDelete(source.id)}
              className="p-2 text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete source"
          >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
          </button>
        )}

        <button
            type="button"
            onClick={() => onToggle(source)}
            disabled={isUpdating}
            className="relative inline-flex items-center w-11 h-6 ml-2 flex-shrink-0 disabled:opacity-50"
            aria-pressed={isEnabled}
            aria-label={`Toggle ${source.name}`}
        >
            <span className="sr-only">Toggle</span>
            <span
            className="absolute inset-0 rounded-full transition-colors duration-200"
            style={{ backgroundColor: isEnabled ? meta.accent : '#e5e7eb' }}
            ></span>
            <span
            className={`relative inline-block w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                isEnabled ? 'translate-x-5' : 'translate-x-1'
            }`}
            ></span>
        </button>
      </div>
    </div>
  )
}

const getCategoryIcon = (id: SourceCategoryKey) => {
  switch (id) {
    case 'research':
      return (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      )
    case 'academic':
      return (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M12 14l9-5-9-5-9 5 9 5z" />
          <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
        </svg>
      )
    case 'media':
      return (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      )
    case 'blog':
      return (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      )
    case 'newsletter':
      return (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      )
    case 'science':
      return (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    default:
      return (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      )
  }
}

export default function SourceManagementPage() {
  const { showToast } = useToast()
  const [sources, setSources] = useState<NewsSourceRecord[]>([])
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  
  // Test status: url -> status
  const [testResults, setTestResults] = useState<Record<string, 'loading' | 'success' | 'error'>>({})
  const [isBatchTesting, setIsBatchTesting] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Add Source Form State
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSource, setNewSource] = useState<CreateSourcePayload>({
    name: '',
    url: '',
    rss_url: '',
    category: 'media'
  })
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    loadSources()
  }, [])

  const loadSources = async () => {
    try {
      setLoading(true)
      const data = await getNewsSources()
      setSources(data.sources)
    } catch (error) {
      console.error('Failed to load sources', error)
    } finally {
      setLoading(false)
    }
  }

  const normalizedQuery = query.trim().toLowerCase()

  const metrics = useMemo(() => {
    const total = sources.length
    const enabled = sources.filter(source => source.enabled === 1).length
    const rssCount = sources.filter(source => Boolean(source.rss_url)).length
    return [
      { title: 'Total', value: total.toString(), subtitle: 'Sources cataloged', accent: 'var(--color-text-secondary)' },
      { title: 'Enabled', value: enabled.toString(), subtitle: 'Actively synced', accent: 'var(--color-sunset-rose)' },
      { title: 'RSS', value: rssCount.toString(), subtitle: 'Live feeds', accent: 'var(--color-taylor-glow)' },
    ]
  }, [sources])

  const filteredSources = useMemo(() => {
    return sources.filter(source => {
      if (selectedCategory !== 'all' && source.category !== selectedCategory) {
        return false
      }
      if (!normalizedQuery) {
        return true
      }
      const host = getHost(source.url)
      return source.name.toLowerCase().includes(normalizedQuery) || host.toLowerCase().includes(normalizedQuery)
    })
  }, [sources, normalizedQuery, selectedCategory])

  const sections: CategorySection[] = useMemo(() => {
    const grouped: Record<SourceCategoryKey, NewsSourceRecord[]> = {
      research: [],
      academic: [],
      media: [],
      blog: [],
      newsletter: [],
      science: [],
    }

    filteredSources.forEach(source => {
      const key = source.category as SourceCategoryKey
      if (grouped[key]) {
        grouped[key].push(source)
      }
    })

    return SOURCE_CATEGORIES.reduce<CategorySection[]>((acc, meta) => {
      const items = grouped[meta.id]
      if (!items || items.length === 0) {
        return acc
      }
      const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name))
      const enabledCount = sorted.filter(item => item.enabled === 1).length
      acc.push({ category: meta.id, sources: sorted, enabledCount })
      return acc
    }, [])
  }, [filteredSources])

  const handleToggle = async (source: NewsSourceRecord) => {
    if (updatingId !== null) return
    const nextEnabled = source.enabled === 0
    try {
      setUpdatingId(source.id)
      await updateNewsSourceStatus(source.id, nextEnabled)
      setSources(prev =>
        prev.map(item => (item.id === source.id ? { ...item, enabled: nextEnabled ? 1 : 0 } : item))
      )
    } catch (error) {
      console.error('Failed to update source', error)
    } finally {
      setUpdatingId(null)
    }
  }
  
  const handleTest = async (url: string) => {
    if (!url) return
    setTestResults(prev => ({ ...prev, [url]: 'loading' }))
    try {
      const res = await testSourceUrl(url)
      setTestResults(prev => ({ ...prev, [url]: res.status === 'success' ? 'success' : 'error' }))
    } catch {
      setTestResults(prev => ({ ...prev, [url]: 'error' }))
    }
  }

  const handleBatchTest = async () => {
    if (isBatchTesting) return
    
    setIsBatchTesting(true)
    setTestResults({})
    
    // Test in batches to avoid overwhelming the server
    const batchSize = 5
    for (let i = 0; i < filteredSources.length; i += batchSize) {
      const batch = filteredSources.slice(i, i + batchSize)
      await Promise.all(batch.map(source => handleTest(source.url)))
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    setIsBatchTesting(false)
  }

  const requestDelete = (id: number) => {
    setPendingDeleteId(current => (current === id ? null : id))
  }

  const handleDeleteConfirmed = async (id: number) => {
    try {
      setDeletingId(id)
      await deleteNewsSource(id)
      setSources(prev => prev.filter(s => s.id !== id))
    } catch (error) {
      console.error('Failed to delete source', error)
      showToast('Failed to delete source', 'error')
    } finally {
      setDeletingId(null)
      setPendingDeleteId(null)
    }
  }

  const toggleSection = (categoryId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSource.name || !newSource.url) return
    
    setIsAdding(true)
    try {
      const res = await addNewsSource(newSource)
      if (res.status === 'success') {
        // Reload or add to list
        await loadSources() // Reload to get ID and everything correct
        setShowAddForm(false)
        setNewSource({ name: '', url: '', rss_url: '', category: 'media' })
      }
    } catch (error) {
      showToast('Failed to add source: ' + String(error), 'error')
    } finally {
      setIsAdding(false)
    }
  }

  const emptyState = (
    <div className="card p-8 text-center">
      <p className="text-primary text-lg font-semibold">No sources match the filters</p>
      <p className="text-secondary mt-2">Adjust the filters or clear the keyword to see every site.</p>
    </div>
  )

  if (loading) {
    return (
      <div className="px-6 py-10 space-y-4">
        <div className="skeleton h-12 rounded-2xl"></div>
        <div className="skeleton h-28 rounded-3xl"></div>
        <div className="skeleton h-64 rounded-3xl"></div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-6 py-4 md:py-10 space-y-6 md:space-y-10 pb-20 md:pb-10">
      {/* Header - Responsive */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        {/* Title & Description */}
        <div className="space-y-1 md:space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold md:font-semibold text-primary">AI Sources</h1>
          <p className="text-secondary text-sm hidden md:block max-w-3xl">
            Review, group, and curate every AI news input so you stay in control of the sync pipeline.
          </p>
        </div>
        
        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-2">
          <button 
            onClick={handleBatchTest}
            disabled={isBatchTesting || filteredSources.length === 0}
            className="btn btn-secondary px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isBatchTesting ? 'Testing…' : 'Batch Test'}
          </button>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-primary px-4 py-2 rounded-xl flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {showAddForm ? 'Cancel' : 'Add Source'}
          </button>
        </div>
        
        {/* Mobile Add Button (Floating Style) */}
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="md:hidden fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
          title={showAddForm ? 'Cancel' : 'Add Source'}
        >
            <svg className={`w-7 h-7 transition-transform duration-300 ${showAddForm ? 'rotate-45' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
        </button>
      </div>

      {/* Search & Batch Test Row - Mobile Compact */}
      <div className="flex gap-2">
        <div className="flex-1 bg-panel rounded-xl md:rounded-2xl border border-soft px-3 md:px-4 py-2.5 md:py-3 flex items-center gap-2 md:gap-3">
          <span className="text-secondary shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
          </span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sources or domains"
            className="bg-transparent flex-1 outline-none text-primary font-medium text-sm min-w-0"
          />
          {query && (
            <button className="text-secondary hover:opacity-80 p-1" onClick={() => setQuery('')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Mobile Batch Test Button */}
        <button 
          onClick={handleBatchTest}
          disabled={isBatchTesting || filteredSources.length === 0}
          className="md:hidden btn bg-white border border-soft text-secondary p-2.5 rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-gray-50 shrink-0 w-11"
          title="Batch Test Connections"
        >
           {isBatchTesting ? (
               <svg className="w-5 h-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
           ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
           )}
        </button>
        
        {/* Desktop Reset Button */}
        {(query || selectedCategory !== 'all') && (
          <button className="hidden md:block btn btn-secondary" onClick={() => { setQuery(''); setSelectedCategory('all') }}>
            Reset
          </button>
        )}
      </div>
      
      {/* Add Form */}
      {showAddForm && (
        <div className="bg-panel border border-soft rounded-2xl p-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-semibold mb-4">Add New Source</h3>
          <form onSubmit={handleAddSource} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Name</label>
              <input 
                type="text" 
                required
                className="w-full px-3 py-2 rounded-lg bg-white/50 border border-soft outline-none focus:border-accent"
                value={newSource.name}
                onChange={e => setNewSource({...newSource, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Category</label>
              <select 
                className="w-full px-3 py-2 rounded-lg bg-white/50 border border-soft outline-none focus:border-accent"
                value={newSource.category}
                onChange={e => setNewSource({...newSource, category: e.target.value})}
              >
                {SOURCE_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.displayName}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-secondary mb-1">Homepage URL</label>
              <input 
                type="url" 
                required
                className="w-full px-3 py-2 rounded-lg bg-white/50 border border-soft outline-none focus:border-accent"
                value={newSource.url}
                onChange={e => setNewSource({...newSource, url: e.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-secondary mb-1">RSS URL (optional)</label>
              <input 
                type="url" 
                className="w-full px-3 py-2 rounded-lg bg-white/50 border border-soft outline-none focus:border-accent"
                value={newSource.rss_url}
                onChange={e => setNewSource({...newSource, rss_url: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 flex justify-end pt-2">
              <button 
                type="submit" 
                disabled={isAdding}
                className="btn btn-primary px-6 py-2 rounded-xl"
              >
                {isAdding ? 'Saving…' : 'Save Source'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-panel rounded-2xl border border-soft px-4 py-3 flex items-center gap-3">
            <span className="text-secondary" aria-hidden>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sources or domains"
              className="bg-transparent flex-1 outline-none text-primary font-medium"
            />
            {query && (
              <button className="text-secondary hover:opacity-80" onClick={() => setQuery('')}>
                Clear
              </button>
            )}
          </div>
          {(query || selectedCategory !== 'all') && (
            <button className="btn btn-secondary" onClick={() => { setQuery(''); setSelectedCategory('all') }}>
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {metrics.map(metric => (
            <div key={metric.title} className="bg-panel border border-soft rounded-2xl px-6 py-4 min-w-[180px]">
              <p className="text-secondary text-sm">{metric.title}</p>
              <p className="text-3xl font-semibold" style={{ color: metric.accent }}>
                {metric.value}
              </p>
              <p className="text-secondary text-xs">{metric.subtitle}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium border ${selectedCategory === 'all' ? 'border-strong bg-panel text-primary' : 'border-soft bg-card text-secondary'}`}
        >
          All
        </button>
        {SOURCE_CATEGORIES.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium border ${selectedCategory === category.id ? 'border-strong text-inverse' : 'border-soft text-secondary bg-card'}`}
            style={selectedCategory === category.id ? { backgroundColor: category.accent } : undefined}
          >
            <span className="mr-2">{category.icon}</span>
            {category.displayName}
          </button>
        ))}
      </div>

      {/* Source Lists */}
      <div className="space-y-6">
        {sections.length === 0 && emptyState}
        {sections.map(section => {
          const meta = SOURCE_CATEGORIES.find(item => item.id === section.category)!
          const isCollapsed = collapsedSections.has(section.category)
          
          return (
            <div key={section.category} className="bg-panel border border-soft rounded-3xl p-6">
              <div 
                className="flex items-start gap-3 cursor-pointer select-none group"
                onClick={() => toggleSection(section.category)}
              >
                <div
                  className="h-10 w-10 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0"
                  style={{ backgroundColor: meta.accent }}
                  aria-hidden
                >
                  {getCategoryIcon(meta.id)}
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold text-primary">{meta.displayName}</p>
                        <p className="text-secondary text-sm font-medium bg-card px-2 py-0.5 rounded-full border border-soft">
                          {section.enabledCount}/{section.sources.length}
                        </p>
                      </div>
                      <p className="text-secondary text-sm mt-0.5">{meta.description}</p>
                    </div>
                    <div className="text-secondary group-hover:text-primary transition-colors p-2">
                      {isCollapsed ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {!isCollapsed && (
                <div className="space-y-3 mt-4 animate-in slide-in-from-top-2 fade-in duration-200">
                  {section.sources.map(source => (
                    <SourceCard
                      key={source.id}
                      source={source}
                      meta={meta}
                      testState={testResults[source.url]}
                      isPendingDelete={pendingDeleteId === source.id}
                      isDeleting={deletingId === source.id}
                      isUpdating={updatingId !== null}
                      onTest={handleTest}
                      onToggle={handleToggle}
                      onRequestDelete={requestDelete}
                      onConfirmDelete={handleDeleteConfirmed}
                      onCancelDelete={() => setPendingDeleteId(null)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
