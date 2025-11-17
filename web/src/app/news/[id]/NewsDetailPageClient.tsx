'use client'

import { useEffect, useState } from 'react'
import { extractConcepts, getNewsDetail, savePhrase } from '@/lib/api'
import { format } from 'date-fns'
import { getNewsCategoryLabel } from '@/lib/newsCategories'

interface NewsDetailPageClientProps {
  newsId: number
}

export default function NewsDetailPageClient({ newsId }: NewsDetailPageClientProps) {
  const [news, setNews] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    loadNews()
  }, [newsId])

  const loadNews = async () => {
    setLoading(true)
    try {
      const data = await getNewsDetail(newsId)
      setNews(data)
    } catch (error) {
      console.error('Failed to load news:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExtractConcepts = async () => {
    setExtracting(true)
    try {
      const result = await extractConcepts(newsId)
      alert(`Extracted ${result.count} concepts!`)
    } catch (error) {
      console.error('Failed to extract concepts:', error)
      alert('Failed to extract concepts')
    } finally {
      setExtracting(false)
    }
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    const text = selection?.toString().trim()

    if (text && text.length > 10) {
      setSelectedText(text)
      setShowSaveDialog(true)
    }
  }

  const handleSavePhrase = async () => {
    if (!selectedText) return

    try {
      await savePhrase({
        news_id: newsId,
        text: selectedText,
        note: note || undefined,
      })
      alert('Phrase saved to learning library!')
      setShowSaveDialog(false)
      setSelectedText('')
      setNote('')
    } catch (error) {
      console.error('Failed to save phrase:', error)
      alert('Failed to save phrase')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!news) {
    return (
      <div className="container mx-auto px-6 py-8">
        <p className="text-gray-600">News not found</p>
      </div>
    )
  }

  const dateObj = new Date(news.date)
  const formattedDate = format(dateObj, 'MMMM dd, yyyy')
  const categoryLabel = getNewsCategoryLabel(news.category)

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{news.title}</h1>

        <div className="flex items-center gap-4 mt-4 text-gray-600 flex-wrap">
          <span className="font-medium">{news.source}</span>
          <span>•</span>
          <span>{formattedDate}</span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
            {categoryLabel}
          </span>
        </div>
      </div>

      <div className="flex gap-3 mb-8">
        <a
          href={news.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
        >
          Open Original Article →
        </a>

        <button
          onClick={handleExtractConcepts}
          disabled={extracting}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
        >
          {extracting ? 'Extracting...' : '💡 Extract Concepts'}
        </button>
      </div>

      <div className="prose prose-lg max-w-none" onMouseUp={handleTextSelection}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <p className="text-gray-800 whitespace-pre-wrap">
            {news.content_raw || news.summary}
          </p>
        </div>
      </div>

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Save to Learning Library</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected text:
              </label>
              <p className="text-sm text-gray-600 italic bg-gray-50 p-3 rounded border border-gray-200">
                "{selectedText}"
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note (optional):
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                placeholder="Add a note about this phrase..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSavePhrase}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false)
                  setSelectedText('')
                  setNote('')
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

