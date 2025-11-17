'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  getNewsSources,
  updateNewsSourceStatus,
  type NewsSourceRecord,
} from '@/lib/api'
import { SOURCE_CATEGORIES, type SourceCategoryKey } from '@/lib/sourceCategories'

type CategoryFilter = SourceCategoryKey | 'all'

interface CategorySection {
  category: SourceCategoryKey
  sources: NewsSourceRecord[]
  enabledCount: number
}

const getHost = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

const getDeliveryMeta = (source: NewsSourceRecord) => {
  const isRss = Boolean(source.rss_url)
  return {
    label: isRss ? 'RSS' : '网页',
    accent: isRss ? 'var(--color-sunset-rose)' : 'var(--color-midnight-violet)',
  }
}

export default function SourceManagementPage() {
  const [sources, setSources] = useState<NewsSourceRecord[]>([])
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    loadSources()
  }, [])

  const loadSources = async () => {
    try {
      setLoading(true)
      const data = await getNewsSources()
      setSources(data.sources)
    } catch (error) {
      console.error('Failed to load sources', error)
    } finally {
      setLoading(false)
    }
  }

  const normalizedQuery = query.trim().toLowerCase()

  const metrics = useMemo(() => {
    const total = sources.length
    const enabled = sources.filter(source => source.enabled === 1).length
    const rssCount = sources.filter(source => Boolean(source.rss_url)).length
    return [
      { title: '全部', value: total.toString(), subtitle: '已收录站点', accent: 'var(--color-text-secondary)' },
      { title: '启用', value: enabled.toString(), subtitle: '参与抓取', accent: 'var(--color-sunset-rose)' },
      { title: 'RSS', value: rssCount.toString(), subtitle: '实时推送', accent: 'var(--color-taylor-glow)' },
    ]
  }, [sources])

  const filteredSources = useMemo(() => {
    return sources.filter(source => {
      if (selectedCategory !== 'all' && source.category !== selectedCategory) {
        return false
      }
      if (!normalizedQuery) {
        return true
      }
      const host = getHost(source.url)
      return source.name.toLowerCase().includes(normalizedQuery) || host.toLowerCase().includes(normalizedQuery)
    })
  }, [sources, normalizedQuery, selectedCategory])

  const sections: CategorySection[] = useMemo(() => {
    const grouped: Record<SourceCategoryKey, NewsSourceRecord[]> = {
      research: [],
      academic: [],
      media: [],
      blog: [],
      newsletter: [],
      science: [],
    }

    filteredSources.forEach(source => {
      const key = source.category as SourceCategoryKey
      if (grouped[key]) {
        grouped[key].push(source)
      }
    })

    return SOURCE_CATEGORIES.reduce<CategorySection[]>((acc, meta) => {
      const items = grouped[meta.id]
      if (!items || items.length === 0) {
        return acc
      }
      const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name))
      const enabledCount = sorted.filter(item => item.enabled === 1).length
      acc.push({ category: meta.id, sources: sorted, enabledCount })
      return acc
    }, [])
  }, [filteredSources])

  const handleToggle = async (source: NewsSourceRecord) => {
    if (updatingId !== null) return
    const nextEnabled = source.enabled === 0
    try {
      setUpdatingId(source.id)
      await updateNewsSourceStatus(source.id, nextEnabled)
      setSources(prev =>
        prev.map(item => (item.id === source.id ? { ...item, enabled: nextEnabled ? 1 : 0 } : item))
      )
    } catch (error) {
      console.error('Failed to update source', error)
    } finally {
      setUpdatingId(null)
    }
  }

  const emptyState = (
    <div className="card p-8 text-center">
      <p className="text-primary text-lg font-semibold">未找到匹配的来源</p>
      <p className="text-secondary mt-2">调整筛选条件或清空关键词以查看全部网站。</p>
    </div>
  )

  if (loading) {
    return (
      <div className="px-6 py-10 space-y-4">
        <div className="skeleton h-12 rounded-2xl"></div>
        <div className="skeleton h-28 rounded-3xl"></div>
        <div className="skeleton h-64 rounded-3xl"></div>
      </div>
    )
  }

  return (
    <div className="px-6 py-10 space-y-10">
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold text-primary">AI 信息源总览</h1>
          <p className="text-secondary max-w-3xl">
            统一查看、分组管理目前接入的 50+ AI 新闻源，随时决定哪些来源参与同步。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-panel rounded-2xl border border-soft px-4 py-3 flex items-center gap-3">
            <span className="text-secondary">🔍</span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索站点或域名"
              className="bg-transparent flex-1 outline-none text-primary font-medium"
            />
            {query && (
              <button className="text-secondary hover:opacity-80" onClick={() => setQuery('')}>
                清除
              </button>
            )}
          </div>
          {(query || selectedCategory !== 'all') && (
            <button className="btn btn-secondary" onClick={() => { setQuery(''); setSelectedCategory('all') }}>
              重置
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {metrics.map(metric => (
            <div key={metric.title} className="bg-panel border border-soft rounded-2xl px-6 py-4 min-w-[180px]">
              <p className="text-secondary text-sm">{metric.title}</p>
              <p className="text-3xl font-semibold" style={{ color: metric.accent }}>
                {metric.value}
              </p>
              <p className="text-secondary text-xs">{metric.subtitle}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium border ${selectedCategory === 'all' ? 'border-strong bg-panel text-primary' : 'border-soft bg-card text-secondary'}`}
        >
          全部
        </button>
        {SOURCE_CATEGORIES.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium border ${selectedCategory === category.id ? 'border-strong text-inverse' : 'border-soft text-secondary bg-card'}`}
            style={selectedCategory === category.id ? { backgroundColor: category.accent } : undefined}
          >
            <span className="mr-2">{category.icon}</span>
            {category.displayName}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {sections.length === 0 && emptyState}
        {sections.map(section => {
          const meta = SOURCE_CATEGORIES.find(item => item.id === section.category)!
          return (
            <div key={section.category} className="bg-panel border border-soft rounded-3xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl" aria-hidden>
                  {meta.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-lg font-semibold text-primary">{meta.displayName}</p>
                      <p className="text-secondary text-sm">{meta.description}</p>
                    </div>
                    <p className="text-secondary text-sm font-medium">
                      {section.enabledCount}/{section.sources.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {section.sources.map(source => {
                  const delivery = getDeliveryMeta(source)
                  const isEnabled = source.enabled === 1
                  return (
                    <div key={source.id} className="bg-card rounded-2xl px-4 py-3 flex items-center gap-4 border border-soft">
                      <div className="flex-1 min-w-0">
                        <p className="text-primary font-semibold">{source.name}</p>
                        <div className="flex items-center gap-3 text-xs text-secondary mt-1">
                          <span style={{ color: delivery.accent }}>{delivery.label}</span>
                          <span>{getHost(source.url)}</span>
                        </div>
                      </div>
                      <Link
                        href={source.url}
                        target="_blank"
                        className="text-accent text-sm font-medium hover:opacity-80"
                      >
                        查看
                      </Link>
                      <button
                        onClick={() => handleToggle(source)}
                        disabled={updatingId !== null}
                        className="relative inline-flex items-center w-11 h-6"
                        aria-pressed={isEnabled}
                        aria-label={`切换${source.name}状态`}
                      >
                        <span className="sr-only">切换状态</span>
                        <span
                          className="absolute inset-0 rounded-full transition-colors duration-200"
                          style={{ backgroundColor: isEnabled ? meta.accent : 'var(--color-border-soft)' }}
                        ></span>
                        <span
                          className={`inline-block w-4 h-4 rounded-full bg-panel transition-transform duration-200 ${
                            isEnabled ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        ></span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
