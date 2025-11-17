'use client'

import { useEffect, useState } from 'react'
import { getNews, toggleStarNews, fetchNews } from '@/lib/api'
import NewsCard from '@/components/NewsCard'

interface NewsItem {
  id: number
  title: string
  url: string
  summary: string
  source: string
  date: string
  starred: number
}

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'starred'>('all')
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    loadNews()
  }, [filter])

  const loadNews = async () => {
    setLoading(true)
    try {
      const starred = filter === 'starred' ? true : undefined
      const data = await getNews({ starred })
      setNews(data.news)
    } catch (error) {
      console.error('Failed to load news:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStar = async (newsId: number, starred: boolean) => {
    try {
      await toggleStarNews(newsId, starred)
      // Update local state
      setNews(prev =>
        prev.map(item =>
          item.id === newsId ? { ...item, starred: starred ? 1 : 0 } : item
        )
      )
    } catch (error) {
      console.error('Failed to toggle star:', error)
    }
  }

  const handleFetchNews = async () => {
    setFetching(true)
    try {
      await fetchNews()
      // Wait a bit then reload
      setTimeout(() => {
        loadNews()
        setFetching(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to fetch news:', error)
      setFetching(false)
    }
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI News</h1>
          <p className="text-gray-600 mt-1">Latest AI news from 50+ sources</p>
        </div>

        <div className="flex gap-3">
          {/* Filter buttons */}
          <div className="flex bg-white rounded-lg shadow-sm border border-gray-200">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg transition ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('starred')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg transition ${
                filter === 'starred'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              ⭐ Starred
            </button>
          </div>

          {/* Fetch news button */}
          <button
            onClick={handleFetchNews}
            disabled={fetching}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {fetching ? 'Fetching...' : '🔄 Fetch News'}
          </button>
        </div>
      </div>

      {/* News list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading news...</p>
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No news found. Try fetching news first.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {news.map(item => (
            <NewsCard
              key={item.id}
              news={item}
              onToggleStar={handleToggleStar}
            />
          ))}
        </div>
      )}
    </div>
  )
}
