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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30">
                  <span className="text-2xl">📰</span>
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    AI News Feed
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
                    Latest from <span className="font-semibold text-primary-600 dark:text-primary-400">54</span> premium sources
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              {/* Filter buttons */}
              <div className="inline-flex rounded-lg bg-white dark:bg-slate-800 shadow-md p-1 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    filter === 'all'
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  All News
                </button>
                <button
                  onClick={() => setFilter('starred')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-1.5 ${
                    filter === 'starred'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Starred
                </button>
              </div>

              {/* Fetch news button */}
              <button
                onClick={handleFetchNews}
                disabled={fetching}
                className="btn btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {fetching ? 'Fetching...' : 'Refresh News'}
              </button>
            </div>
          </div>

          {/* Stats bar */}
          {!loading && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{news.length}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Total Articles</div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {news.filter(n => n.starred === 1).length}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Starred Articles</div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">54</div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">News Sources</div>
              </div>
            </div>
          )}
        </div>

        {/* News list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary-200 dark:border-primary-900 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-primary-600 dark:border-primary-400 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
            </div>
            <p className="mt-6 text-slate-600 dark:text-slate-400 font-medium">Loading news...</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">This might take a moment</p>
          </div>
        ) : news.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
              <span className="text-5xl">📭</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No news found</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Click "Refresh News" to fetch the latest articles</p>
            <button
              onClick={handleFetchNews}
              disabled={fetching}
              className="btn btn-primary"
            >
              {fetching ? 'Fetching...' : 'Fetch News Now'}
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {news.map((item, index) => (
              <div key={item.id} style={{ animationDelay: `${index * 50}ms` }}>
                <NewsCard
                  news={item}
                  onToggleStar={handleToggleStar}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
