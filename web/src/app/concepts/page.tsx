'use client'

import { useEffect, useState } from 'react'
import { getConcepts } from '@/lib/api'

interface Concept {
  id: number
  news_id: number
  term: string
  definition: string
  created_at: string
}

export default function ConceptsPage() {
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadConcepts()
  }, [])

  const loadConcepts = async (searchTerm?: string) => {
    setLoading(true)
    try {
      const data = await getConcepts({ search: searchTerm, limit: 200 })
      setConcepts(data.concepts)
    } catch (error) {
      console.error('Failed to load concepts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadConcepts(search)
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Concepts Library</h1>
        <p className="text-gray-600 mt-1">
          Extracted concepts and terminology from AI news
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search concepts..."
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

      {/* Concepts list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading concepts...</p>
        </div>
      ) : concepts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">
            No concepts found. Extract concepts from news articles first.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {concepts.map((concept) => (
            <div
              key={concept.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {concept.term}
              </h3>
              <p className="text-gray-700">{concept.definition}</p>
              <div className="mt-4 text-sm text-gray-500">
                Added on {new Date(concept.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {concepts.length > 0 && (
        <div className="mt-8 text-center text-sm text-gray-600">
          Showing {concepts.length} concepts
        </div>
      )}
    </div>
  )
}
