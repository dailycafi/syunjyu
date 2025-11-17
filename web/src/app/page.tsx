'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { getNews, toggleStarNews, fetchNews } from '@/lib/api'
import NewsCard from '@/components/NewsCard'
import { NEWS_CATEGORY_FILTERS, type NewsCategoryFilter } from '@/lib/newsCategories'

interface NewsItem {
  id: number
  title: string
  url: string
  summary: string
  source: string
  category?: string | null
  date: string
  starred: number
}

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'starred'>('all')
  const [categoryFilter, setCategoryFilter] = useState<NewsCategoryFilter>('all')
  const [fetching, setFetching] = useState(false)
  const activeFilterStyle: CSSProperties = {
    backgroundColor: 'var(--lover-cloud)',
    color: 'var(--lover-rose)',
    boxShadow: '0 6px 20px rgba(176, 65, 107, 0.15)',
  }

  useEffect(() => {
    loadNews()
  }, [filter, categoryFilter])

  const loadNews = async () => {
    setLoading(true)
    try {
      const starred = filter === 'starred' ? true : undefined
      const category = categoryFilter === 'all' ? undefined : categoryFilter
      const data = await getNews({ starred, category })
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950/80">
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <div className="rounded-3xl bg-white dark:bg-slate-900/70 border border-white/70 dark:border-white/10 shadow-[0_25px_60px_rgba(31,18,53,0.08)] backdrop-blur-xl px-8 py-10">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, var(--lover-rose), var(--lover-butter), var(--lover-sky))',
                    boxShadow: '0 15px 35px rgba(176, 65, 107, 0.25)',
                  }}
                >
                  <span className="text-2xl">📰</span>
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    AI News Feed
                  </h1>
                  <p className="text-slate-600 dark:text-slate-300 text-sm mt-0.5">
                    Latest from{' '}
                    <span className="font-semibold" style={{ color: 'var(--lover-rose)' }}>
                      54
                    </span>{' '}
                    premium sources
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              {/* Filter buttons */}
              <div className="inline-flex rounded-2xl bg-white/80 dark:bg-slate-900/40 shadow-md p-1 border border-white/60 dark:border-white/10 backdrop-blur">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    filter === 'all'
                      ? 'text-slate-900'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10'
                  }`}
                  style={filter === 'all' ? activeFilterStyle : undefined}
                >
                  All News
                </button>
                <button
                  onClick={() => setFilter('starred')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-1.5 ${
                    filter === 'starred'
                      ? 'text-slate-900'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10'
                  }`}
                  style={filter === 'starred' ? activeFilterStyle : undefined}
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
            <div className="w-full mt-4">
              <div className="flex flex-wrap gap-2">
                {NEWS_CATEGORY_FILTERS.map(option => (
                  <button
                    key={option.key}
                    onClick={() => setCategoryFilter(option.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      categoryFilter === option.key
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                        : 'bg-white/70 text-slate-600 border-slate-200 hover:bg-white dark:bg-white/5 dark:text-slate-200 dark:border-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats bar */}
          {!loading && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/90 dark:bg-slate-900/50 rounded-2xl p-4 shadow-sm border border-white/70 dark:border-white/10 backdrop-blur">
                <div className="text-2xl font-bold" style={{ color: 'var(--lover-rose)' }}>
                  {news.length}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Total Articles</div>
              </div>
              <div className="bg-white/90 dark:bg-slate-900/50 rounded-2xl p-4 shadow-sm border border-white/70 dark:border-white/10 backdrop-blur">
                <div className="text-2xl font-bold" style={{ color: 'var(--lover-sky)' }}>
                  {news.filter(n => n.starred === 1).length}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Starred Articles</div>
              </div>
              <div className="bg-white/90 dark:bg-slate-900/50 rounded-2xl p-4 shadow-sm border border-white/70 dark:border-white/10 backdrop-blur">
                <div className="text-2xl font-bold" style={{ color: 'var(--lover-lilac)' }}>
                  54
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">News Sources</div>
              </div>
            </div>
          )}
        </div>

        {/* News list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div
                className="w-16 h-16 border-4 rounded-full"
                style={{ borderColor: 'var(--lover-petal)' }}
              ></div>
              <div
                className="w-16 h-16 border-4 rounded-full animate-spin border-t-transparent absolute top-0 left-0"
                style={{ borderColor: 'var(--lover-rose)' }}
              ></div>
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
    </div>
  )
}
