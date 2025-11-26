'use client'

import { useEffect, useState } from 'react'
import { getConcepts } from '@/lib/api'
import { useUserPreferences } from '@/lib/preferences'
import Link from 'next/link'

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
  const { isEnglishLearner } = useUserPreferences()

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

  const primaryColor = isEnglishLearner ? 'text-pink-600' : 'text-blue-600'
  const buttonColor = isEnglishLearner ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-600 hover:bg-blue-700'
  const borderColor = isEnglishLearner ? 'border-pink-500' : 'border-blue-600'

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEnglishLearner ? 'Expressions & Patterns' : 'AI Concepts Library'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEnglishLearner 
            ? 'Key sentence patterns and useful expressions extracted from news.'
            : 'Extracted concepts and terminology from AI news.'}
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isEnglishLearner ? "Search expressions..." : "Search concepts..."}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none transition-colors"
            style={{ 
               // Quick inline style for dynamic focus color, usually better via Tailwind classes
               // but simple enough here
             }}
          />
          <button
            type="submit"
            className={`px-6 py-2 text-white rounded-lg transition ${buttonColor}`}
          >
            Search
          </button>
        </div>
      </form>

      {/* Concepts list */}
      {loading ? (
        <div className="text-center py-12">
          <div className={`inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-r-transparent ${borderColor}`}></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      ) : concepts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <div className="text-4xl mb-4">{isEnglishLearner ? '✍️' : '💡'}</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No items found yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {isEnglishLearner 
              ? 'Start reading news articles and the system will automatically extract grammar points and expressions for you.'
              : 'Explore the news feed to find and extract AI concepts to build your library.'}
          </p>
          <Link 
            href="/"
            className={`inline-flex items-center px-4 py-2 rounded-lg text-white font-medium transition-colors ${buttonColor}`}
          >
            Go to News Feed
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {concepts.map((concept) => (
            <div
              key={concept.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {concept.term}
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{concept.definition}</p>
              <div className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                 <span>Added on {new Date(concept.created_at).toLocaleDateString()}</span>
                 {concept.news_id && (
                   <Link href={`/news/${concept.news_id}`} className={`hover:underline ${primaryColor}`}>
                     View Source
                   </Link>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {concepts.length > 0 && (
        <div className="mt-8 text-center text-sm text-gray-600">
          Showing {concepts.length} {isEnglishLearner ? 'points' : 'concepts'}
        </div>
      )}
    </div>
  )
}
