'use client'

import { useEffect, useState } from 'react'
import { getPhrases } from '@/lib/api'

interface Phrase {
  id: number
  news_id: number
  text: string
  note: string | null
  created_at: string
}

export default function PhrasesPage() {
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadPhrases()
  }, [])

  const loadPhrases = async (searchTerm?: string) => {
    setLoading(true)
    try {
      const data = await getPhrases({ search: searchTerm, limit: 200 })
      setPhrases(data.phrases)
    } catch (error) {
      console.error('Failed to load phrases:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadPhrases(search)
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Learning Library</h1>
        <p className="text-gray-600 mt-1">
          Saved phrases and expressions from AI news
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search phrases..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
          >
            Search
          </button>
        </div>
      </form>

      {/* Phrases list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading phrases...</p>
        </div>
      ) : phrases.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">
            No phrases saved yet. Select text in news articles to save phrases.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {phrases.map((phrase) => (
            <div
              key={phrase.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <blockquote className="text-gray-800 italic border-l-4 border-primary pl-4">
                "{phrase.text}"
              </blockquote>

              {phrase.note && (
                <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  <span className="font-medium">Note:</span> {phrase.note}
                </div>
              )}

              <div className="mt-4 text-sm text-gray-500">
                Saved on {new Date(phrase.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {phrases.length > 0 && (
        <div className="mt-8 text-center text-sm text-gray-600">
          Showing {phrases.length} phrases
        </div>
      )}
    </div>
  )
}
