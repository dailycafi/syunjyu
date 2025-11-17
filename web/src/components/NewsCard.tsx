'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import type { CSSProperties } from 'react'
import { getNewsCategoryLabel } from '@/lib/newsCategories'

interface NewsCardProps {
  news: {
    id: number
    title: string
    url: string
    summary: string
    source: string
    category?: string | null
    date: string
    starred: number
  }
  onToggleStar: (id: number, starred: boolean) => void
}

export default function NewsCard({ news, onToggleStar }: NewsCardProps) {
  const dateObj = new Date(news.date)
  const formattedDate = format(dateObj, 'MMM dd, yyyy')
  const categoryLabel = getNewsCategoryLabel(news.category)
  const starButtonStyle: CSSProperties = news.starred
    ? {
        background: 'linear-gradient(135deg, var(--lover-rose), var(--lover-sky))',
        color: '#fff',
        boxShadow: '0 12px 30px rgba(176, 65, 107, 0.28)',
      }
    : {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        color: 'var(--lover-rose)',
        border: '1px solid rgba(176, 65, 107, 0.25)',
      }

  return (
    <div className="group card card-hover p-6 animate-slide-up">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Source badge */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="badge badge-primary">{news.source}</span>
            <span className="badge bg-white border border-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300 dark:border-white/10">
              {categoryLabel}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{formattedDate}</span>
            {news.starred === 1 && (
              <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                ⭐ Starred
              </span>
            )}
          </div>

          {/* Title */}
          <Link href={`/news/${news.id}/`}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 hover-text-lover transition-colors cursor-pointer line-clamp-2 mb-2">
              {news.title}
            </h3>
          </Link>

          {/* Summary */}
          {news.summary && (
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
              {news.summary}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Link
              href={`/news/${news.id}/`}
              className="inline-flex items-center gap-1 text-sm font-medium text-lover hover:opacity-80 transition-colors"
            >
              <span>Read more</span>
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <span>Source</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Star button */}
        <button
          onClick={() => onToggleStar(news.id, !news.starred)}
          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
            news.starred ? 'hover:scale-110 hover:rotate-6' : 'hover:scale-105'
          }`}
          title={news.starred ? 'Remove star' : 'Add star'}
          style={starButtonStyle}
        >
          <svg
            className={`w-5 h-5 ${news.starred ? 'fill-current' : 'fill-none'}`}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
