'use client'

import Link from 'next/link'
import { format } from 'date-fns'

interface NewsCardProps {
  news: {
    id: number
    title: string
    url: string
    summary: string
    source: string
    date: string
    starred: number
  }
  onToggleStar: (id: number, starred: boolean) => void
}

export default function NewsCard({ news, onToggleStar }: NewsCardProps) {
  const dateObj = new Date(news.date)
  const formattedDate = format(dateObj, 'MMM dd, yyyy')

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Title */}
          <Link href={`/news/${news.id}/`}>
            <h3 className="text-lg font-semibold text-gray-900 hover:text-primary transition cursor-pointer">
              {news.title}
            </h3>
          </Link>

          {/* Metadata */}
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
            <span className="font-medium">{news.source}</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>

          {/* Summary */}
          {news.summary && (
            <p className="mt-3 text-gray-700 line-clamp-3">{news.summary}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 mt-4">
            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Read full article →
            </a>
          </div>
        </div>

        {/* Star button */}
        <button
          onClick={() => onToggleStar(news.id, !news.starred)}
          className={`flex-shrink-0 text-2xl transition ${
            news.starred
              ? 'opacity-100 hover:scale-110'
              : 'opacity-30 hover:opacity-100 hover:scale-110'
          }`}
          title={news.starred ? 'Remove star' : 'Add star'}
        >
          ⭐
        </button>
      </div>
    </div>
  )
}
