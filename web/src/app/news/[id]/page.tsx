import NewsDetailPageClient from './NewsDetailPageClient'

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8500'
// Increased limit to ensure recent news (like id 1771) are included in static generation
const DEFAULT_STATIC_NEWS_LIMIT = 2000

type NewsDetailPageProps = {
  params: {
    id: string
  }
}

type NewsIdParam = {
  id: string
}

const normalizeApiBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL
  return baseUrl.replace(/\/$/, '')
}

const getStaticNewsIdsFromEnv = (): string[] => {
  const configured = process.env.NEXT_PUBLIC_STATIC_NEWS_IDS
  if (!configured) {
    return []
  }

  return configured
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

const fetchNewsIdsFromApi = async (limit: number): Promise<string[]> => {
  const apiBase = normalizeApiBaseUrl()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${apiBase}/api/news?limit=${limit}`, {
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      console.warn(`[news/[id]] generateStaticParams: ${response.status} ${response.statusText}`)
      return []
    }

    const data = await response.json()
    if (!Array.isArray(data?.news)) {
      return []
    }

    return data.news
      .map((item: { id?: number | string }) => (item?.id !== undefined ? String(item.id) : null))
      .filter((value: string | null): value is string => Boolean(value))
  } catch (error) {
    console.warn('[news/[id]] generateStaticParams: Failed to prefetch news ids.', error)
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function generateStaticParams(): Promise<NewsIdParam[]> {
  const envIds = getStaticNewsIdsFromEnv()
  if (envIds.length > 0) {
    return envIds.map((id) => ({ id }))
  }

  const configuredLimit = Number(process.env.NEXT_PUBLIC_STATIC_NEWS_LIMIT)
  const limit = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : DEFAULT_STATIC_NEWS_LIMIT
  const ids = await fetchNewsIdsFromApi(limit)
  return ids.map((id) => ({ id }))
}

export default function NewsDetailPage({ params }: NewsDetailPageProps) {
  const newsId = parseInt(params?.id ?? '', 10)
  return <NewsDetailPageClient newsId={newsId} />
}
