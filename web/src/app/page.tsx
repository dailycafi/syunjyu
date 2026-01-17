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
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [starredCount, setStarredCount] = useState(0)
  
  const activeFilterStyle: CSSProperties = {
    backgroundColor: 'var(--lover-cloud)',
    color: 'var(--lover-rose)',
    boxShadow: '0 6px 20px rgba(176, 65, 107, 0.15)',
  }

  useEffect(() => {
    loadNews(true)
  }, [filter, categoryFilter])

  const loadNews = async (reset = false) => {
    if (reset) {
      setLoading(true)
      setOffset(0)
    } else {
      setLoadingMore(true)
    }

    try {
      const starred = filter === 'starred' ? true : undefined
      const category = categoryFilter === 'all' ? undefined : categoryFilter
      const currentOffset = reset ? 0 : offset
      const data = await getNews({ starred, category, offset: currentOffset, limit: 20 })
      
      if (reset) {
        setNews(data.news)
      } else {
        setNews(prev => [...prev, ...data.news])
      }
      
      setTotalCount(data.count)
      setStarredCount(data.starred_count)
      setHasMore(data.news.length === 20)
      if (!reset) setOffset(prev => prev + 20)
      else setOffset(20)

    } catch (error) {
      console.error('Failed to load news:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadNews(false)
    }
  }

  const handleRefresh = () => {
    loadNews(true)
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
      setStarredCount(prev => starred ? prev + 1 : prev - 1)
    } catch (error) {
      console.error('Failed to toggle star:', error)
    }
  }

  const handleFetchNews = async () => {
    setFetching(true)
    try {
      await fetchNews()
      // Wait a bit longer for backend to process, then reset list to show new content
      setTimeout(() => {
        loadNews(true)
        setFetching(false)
      }, 4000)
    } catch (error) {
      console.error('Failed to fetch news:', error)
      setFetching(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950/80 relative pb-20 md:pb-0">
      <div className="container mx-auto px-3 md:px-6 py-3 md:py-12 max-w-6xl">
        <div className="rounded-3xl bg-white dark:bg-slate-900/70 border border-white/70 dark:border-white/10 shadow-sm md:shadow-[0_25px_60px_rgba(31,18,53,0.08)] backdrop-blur-xl px-4 md:px-8 py-5 md:py-10 relative overflow-hidden">
          
          {/* Fetching Overlay */}
          {fetching && (
            <div className="absolute inset-0 z-50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm flex items-center justify-center rounded-3xl animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl border border-white/50 flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center">
                  <p className="font-bold text-lg text-primary">Updating News...</p>
                  <p className="text-sm text-secondary">This may take a few moments.</p>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-6 md:mb-8 animate-fade-in space-y-4">
            {/* Top Row: Logo/Title and Refresh Action */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-md md:shadow-lg shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, var(--lover-rose), var(--lover-butter), var(--lover-sky))',
                    }}
                  >
                    <span className="text-xl md:text-2xl">📰</span>
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent leading-tight">
                      AI News Feed
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-0.5 font-medium">
                      <span className="hidden md:inline">Latest from </span>
                      <span className="font-semibold" style={{ color: 'var(--lover-rose)' }}>54</span>
                      {' '}premium sources
                    </p>
                  </div>
                </div>

                {/* Mobile: Icon button / Desktop: Full button */}
                <button
                  onClick={handleFetchNews}
                  disabled={fetching}
                  className="md:hidden w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors active:scale-95"
                  aria-label="Refresh"
                >
                   <svg className={`w-5 h-5 ${fetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                
                {/* Desktop: Full controls */}
                <div className="hidden md:flex gap-3 flex-wrap">
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
                    {fetching ? 'Updating...' : 'Refresh'}
                  </button>
                </div>
            </div>

            {/* Mobile Only: Controls Row - Filter Switch */}
            <div className="flex md:hidden">
                 <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-full">
                  <button
                    onClick={() => setFilter('all')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${
                      filter === 'all'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    All News
                  </button>
                  <button
                    onClick={() => setFilter('starred')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
                      filter === 'starred'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span className={filter === 'starred' ? 'text-amber-500' : ''}>★</span>
                    Starred
                  </button>
                </div>
            </div>
            
            {/* Categories Scroll */}
            <div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto scrollbar-hide md:mt-6">
              <div className="flex gap-2 min-w-max pb-1">
                {NEWS_CATEGORY_FILTERS.map(option => (
                  <button
                    key={option.key}
                    onClick={() => setCategoryFilter(option.key)}
                    className={`px-3.5 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold md:font-medium tracking-wide transition-all border ${
                      categoryFilter === option.key
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                        : 'bg-slate-50 md:bg-white/70 text-slate-600 border-slate-200 hover:bg-white dark:bg-white/5 dark:text-slate-200 dark:border-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats - Mobile: Mini / Desktop: Card Style */}
            {!loading && (
              <>
                {/* Mobile Stats */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-white/5 md:hidden">
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-900 dark:text-white">{totalCount}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Articles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-500">{starredCount}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Saved</div>
                  </div>
                  <div className="text-center border-l border-slate-100 pl-3">
                     <div className="text-lg font-bold text-indigo-500">54</div>
                     <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Sources</div>
                  </div>
                </div>
                
                {/* Desktop Stats */}
                <div className="hidden md:grid md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-white/90 dark:bg-slate-900/50 rounded-2xl p-4 shadow-sm border border-white/70 dark:border-white/10 backdrop-blur flex flex-col justify-center">
                    <div className="text-2xl font-bold" style={{ color: 'var(--lover-rose)' }}>
                      {totalCount}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Articles</div>
                  </div>
                  <div className="bg-white/90 dark:bg-slate-900/50 rounded-2xl p-4 shadow-sm border border-white/70 dark:border-white/10 backdrop-blur flex flex-col justify-center">
                    <div className="text-2xl font-bold" style={{ color: 'var(--lover-sky)' }}>
                      {starredCount}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Starred</div>
                  </div>
                  <div className="bg-white/90 dark:bg-slate-900/50 rounded-2xl p-4 shadow-sm border border-white/70 dark:border-white/10 backdrop-blur flex flex-col justify-center">
                    <div className="text-2xl font-bold" style={{ color: 'var(--lover-lilac)' }}>
                      54
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Sources</div>
                  </div>
                </div>
              </>
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
            </div>
          ) : news.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <div className="w-24 h-24 rounded-full bg-white shadow-sm flex items-center justify-center mb-6 text-6xl">
                📭
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No news found</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md text-center">
                It seems quiet today. Try refreshing the feed or checking your source settings.
              </p>
              <div className="relative w-full flex justify-center">
                <button
                  onClick={handleFetchNews}
                  disabled={fetching}
                  className={`btn btn-primary px-8 py-3 rounded-xl shadow-lg shadow-primary/30 transition-opacity ${
                    fetching ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  Fetch Latest News
                </button>
                {fetching && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="inline-flex items-center gap-2 text-primary font-semibold text-sm">
                      <span className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                      Fetching latest news...
                    </div>
                  </div>
                )}
              </div>
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
              
              {/* Load More / Infinite Scroll Trigger */}
              {hasMore && (
                  <div className="pt-8 pb-4 flex justify-center">
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                          {loadingMore ? (
                              <>
                                <span className="w-4 h-4 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin"></span>
                                Loading more...
                              </>
                          ) : (
                              'Load More Stories'
                          )}
                      </button>
                  </div>
              )}
              
              {!hasMore && news.length > 0 && (
                  <div className="py-8 text-center text-slate-400 text-sm">
                      You've reached the end of the feed.
                  </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
