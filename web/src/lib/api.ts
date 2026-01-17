const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8500'

// Cache for the backend port from Tauri
let cachedBackendPort: number | null = null

/**
 * Get the backend port from Tauri (if running in Tauri context)
 * Falls back to default port if not in Tauri or if Tauri call fails
 */
const getTauriBackendPort = async (): Promise<number | null> => {
  if (typeof window === 'undefined') return null
  
  // Check if we're in Tauri context
  const tauri = (window as any).__TAURI__
  if (!tauri?.invoke) return null
  
  try {
    const port = await tauri.invoke('get_backend_port')
    return port as number | null
  } catch (e) {
    console.warn('[API] Failed to get backend port from Tauri:', e)
    return null
  }
}

/**
 * Initialize API with dynamic port detection
 * Should be called early in app lifecycle
 */
export const initializeApi = async (): Promise<void> => {
  if (typeof window === 'undefined') return
  
  // Try to get port from Tauri
  const tauriPort = await getTauriBackendPort()
  if (tauriPort) {
    cachedBackendPort = tauriPort
    console.log(`[API] Using Tauri backend port: ${tauriPort}`)
    return
  }
  
  // Check localStorage for custom settings
  const customPort = localStorage.getItem('custom_api_port')
  if (customPort) {
    cachedBackendPort = parseInt(customPort, 10)
    console.log(`[API] Using custom port from localStorage: ${cachedBackendPort}`)
  }
}

/**
 * Listen for backend-ready events from Tauri
 */
export const setupTauriListeners = (): void => {
  if (typeof window === 'undefined') return
  
  const tauri = (window as any).__TAURI__
  if (!tauri?.event?.listen) return
  
  // Listen for backend ready event
  tauri.event.listen('backend-ready', (event: any) => {
    const { port } = event.payload
    if (port) {
      cachedBackendPort = port
      console.log(`[API] Backend ready on port: ${port}`)
    }
  })
  
  // Listen for backend error event
  tauri.event.listen('backend-error', (event: any) => {
    console.error('[API] Backend error:', event.payload)
  })
}

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Priority 1: Tauri-provided port
    if (cachedBackendPort) {
      return `http://127.0.0.1:${cachedBackendPort}`
    }
    
    // Priority 2: Custom settings in localStorage
    const customHost = localStorage.getItem('custom_api_host')
    const customPort = localStorage.getItem('custom_api_port')
    if (customHost && customPort) {
      return `http://${customHost}:${customPort}`
    }
  }
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '')
}

type QueryValue = string | number | boolean | null | undefined

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, QueryValue>
  body?: Record<string, unknown> | string | FormData | undefined
  responseType?: 'json' | 'blob'
}

const buildUrl = (path: string, params?: Record<string, QueryValue>) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = getApiBaseUrl()
  const url = new URL(`${baseUrl}${normalizedPath}`)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      url.searchParams.append(key, String(value))
    })
  }

  return url.toString()
}

const extractErrorMessage = async (response: Response) => {
  try {
    const data = await response.clone().json()
    if (typeof data === 'object' && data !== null) {
      if ('detail' in data) return `${response.status} ${response.statusText}: ${data.detail}`
      return `${response.status} ${response.statusText}: ${JSON.stringify(data)}`
    }
  } catch {
    // Fallback to text below
  }

  const text = await response.text()
  return `${response.status} ${response.statusText}: ${text || 'Unknown error'}`
}

async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { params, responseType = 'json', body, headers: customHeaders, ...rest } = options
  const url = buildUrl(path, params)
  const headers = new Headers(customHeaders)

  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (typeof body === 'string') {
    payload = body
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
  } else if (body !== undefined) {
    payload = JSON.stringify(body)
    headers.set('Content-Type', 'application/json')
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', responseType === 'blob' ? 'application/pdf' : 'application/json')
  }

  const response = await fetch(url, {
    ...rest,
    headers,
    body: payload,
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response))
  }

  if (responseType === 'blob') {
    return (await response.blob()) as T
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

// ===== News =====

export interface NewsRecord {
  id: number
  title: string
  url: string
  summary: string
  content_raw?: string
  source: string
  category?: string | null
  date: string
  starred: number
}

export interface NewsListParams {
  starred?: boolean
  source?: string
  category?: string
  date?: string
  limit?: number
  offset?: number
  [key: string]: any
}

export const getNews = (params?: NewsListParams) => {
  return apiFetch<{ news: NewsRecord[]; count: number; starred_count: number }>('/api/news', {
    params,
    cache: 'no-store',
  })
}

export const getNewsDetail = (newsId: number) => {
  return apiFetch<NewsRecord>(`/api/news/${newsId}`, { cache: 'no-store' })
}

export const toggleStarNews = (newsId: number, starred: boolean) => {
  return apiFetch(`/api/news/${newsId}/star`, {
    method: 'POST',
    body: {
      news_id: newsId,
      starred,
    },
  })
}

export const fetchNews = () => {
  return apiFetch('/api/news/fetch', {
    method: 'POST',
  })
}

export const refetchNews = (newsId: number) => {
  return apiFetch<{ status: string; content: string }>(`/api/news/${newsId}/refetch`, {
    method: 'POST',
  })
}

export type AnalysisScope = 'summary' | 'structure' | 'vocabulary'

export type StructureNodeType = 'conclusion' | 'argument' | 'evidence' | 'logic' | 'insight' | 'impact'

export interface StructureNode {
  id: string
  label: string
  type: StructureNodeType
  summary: string
  children?: StructureNode[]
}

export interface ArticleStructure {
  root?: StructureNode
  takeaways?: string[]
  legacySections?: {
    section: string
    description: string
  }[]
}

export interface VocabularyItem {
  term: string
  pronunciation?: string
  definition: string
  example: string
}

export interface AnalysisResult {
  summary: string
  structure: ArticleStructure
  vocabulary: VocabularyItem[]
  scope?: AnalysisScope
  error?: string
  raw_response?: string
}

export const analyzeArticle = (newsId: number, scope?: AnalysisScope, userMode: 'english_learner' | 'ai_learner' = 'english_learner') => {
  return apiFetch<{ status: string; analysis: AnalysisResult }>(`/api/news/${newsId}/analyze`, {
    method: 'POST',
    body: { scope, user_mode: userMode },
  })
}

// ===== Quiz =====

export interface QuizOption {
  id: string
  text: string
}

export interface QuizQuestion {
  id: number
  question: string
  options: QuizOption[]
  correct_answer_id: string
  explanation: string
  question_type?: 'vocabulary' | 'grammar' | 'comprehension'  // For English learner mode
  highlighted_text?: string  // The word/phrase being tested
}

export interface QuizResult {
  questions: QuizQuestion[]
}

export const generateQuiz = (newsId: number, userMode: 'english_learner' | 'ai_learner') => {
  return apiFetch<QuizResult>(`/api/news/${newsId}/quiz`, {
    method: 'POST',
    body: { user_mode: userMode },
  })
}


// ===== Source management =====

export interface NewsSourceRecord {
  id: number
  name: string
  url: string
  rss_url?: string | null
  category: string
  enabled: number
}

export interface CreateSourcePayload {
  name: string
  url: string
  rss_url?: string
  category: string
  [key: string]: any
}

export const getNewsSources = () => {
  return apiFetch<{ sources: NewsSourceRecord[] }>('/api/news/sources', {
    cache: 'no-store',
  })
}

export const updateNewsSourceStatus = (sourceId: number, enabled: boolean) => {
  return apiFetch(`/api/news/sources/${sourceId}/toggle`, {
    method: 'POST',
    body: { enabled },
  })
}

export const addNewsSource = (payload: CreateSourcePayload) => {
  return apiFetch<{ status: string; id: number; message: string }>('/api/news/sources', {
    method: 'POST',
    body: payload,
  })
}

export const deleteNewsSource = (sourceId: number) => {
  return apiFetch<{ status: string; message: string }>(`/api/news/sources/${sourceId}`, {
    method: 'DELETE',
  })
}

export const testSourceUrl = (url: string) => {
  return apiFetch<{ status: string; message: string }>('/api/news/sources/test', {
    method: 'GET',
    params: { url },
  })
}

// ===== Concepts =====

export interface ConceptQuery {
  news_id?: number
  search?: string
  limit?: number
  [key: string]: any
}

export const getConcepts = (params?: ConceptQuery) => {
  return apiFetch<{ concepts: any[]; count: number }>('/api/concepts', {
    params,
    cache: 'no-store',
  })
}

export const extractConcepts = (newsId: number) => {
  return apiFetch<{ status: string; concepts: any[]; count: number }>('/api/concepts/extract', {
    method: 'POST',
    params: { news_id: newsId },
  })
}

// ===== Phrases =====

export interface PhraseQuery {
  news_id?: number
  search?: string
  limit?: number
  [key: string]: any
}

export interface PhraseRecord {
  id: number
  news_id: number
  text: string
  note?: string | null
  context_before?: string | null
  context_after?: string | null
  start_offset?: number | null
  end_offset?: number | null
  color?: string | null
  type?: string | null // 'vocabulary' | 'content'
  pronunciation?: string | null
  created_at: string
}

export const getPhrases = (params?: PhraseQuery) => {
  return apiFetch<{ phrases: PhraseRecord[]; count: number }>('/api/phrases', {
    params,
    cache: 'no-store',
  })
}

export const getAllPhraseTexts = () => {
    return apiFetch<{ texts: string[] }>('/api/phrases/all-texts', {
        cache: 'no-store'
    })
}

export interface SavePhrasePayload {
  news_id: number
  text: string
  note?: string
  context_before?: string
  context_after?: string
  start_offset?: number
  end_offset?: number
  color?: string
  type?: string
  [key: string]: any
}

export const savePhrase = (payload: SavePhrasePayload) => {
  return apiFetch('/api/phrases', {
    method: 'POST',
    body: payload,
  })
}

export const deletePhrase = (phraseId: number) => {
  return apiFetch<{ status: string; message: string }>(`/api/phrases/${phraseId}`, {
    method: 'DELETE',
  })
}

export const explainSnippet = (newsId: number, text: string, userMode: 'english_learner' | 'ai_learner' = 'english_learner') => {
  return apiFetch<{ status: string; explanation: string }>(`/api/news/${newsId}/explain`, {
    method: 'POST',
    body: { text, user_mode: userMode },
  })
}

// ===== Learning & AI =====

export const checkSentence = (term: string, sentence: string) => {
  return apiFetch<{ status: string; feedback: string; score?: string }>('/api/learning/check-sentence', {
    method: 'POST',
    body: { term, sentence },
  })
}

export const explainConcept = (term: string, context?: string) => {
  return apiFetch<{ status: string; explanation: string }>('/api/learning/explain-concept', {
    method: 'POST',
    body: { term, context },
  })
}

export const defineWord = (term: string) => {
  return apiFetch<{ status: string; definition: string }>('/api/learning/define', {
    method: 'POST',
    body: { term },
  })
}

// Free Dictionary API (dictionaryapi.dev) - 免费词典 API
export interface DictionaryPhonetic {
  text?: string
  audio?: string
}

export interface DictionaryDefinition {
  definition: string
  example?: string
  synonyms?: string[]
  antonyms?: string[]
}

export interface DictionaryMeaning {
  partOfSpeech: string
  definitions: DictionaryDefinition[]
}

export interface DictionaryEntry {
  word: string
  phonetic?: string
  phonetics?: DictionaryPhonetic[]
  meanings: DictionaryMeaning[]
}

export const fetchDictionaryDefinition = async (word: string): Promise<DictionaryEntry | null> => {
  try {
    // Clean the word - remove punctuation and extra spaces
    const cleanWord = word.trim().toLowerCase().replace(/[^\w\s-]/g, '').split(/\s+/)[0]
    if (!cleanWord) return null
    
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`)
    if (!response.ok) return null
    
    const data = await response.json()
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as DictionaryEntry
    }
    return null
  } catch (error) {
    console.error('Dictionary API error:', error)
    return null
  }
}

// 格式化词典结果为可读文本
export const formatDictionaryDefinition = (entry: DictionaryEntry): string => {
  const lines: string[] = []
  
  // 添加音标
  const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text
  if (phonetic) {
    lines.push(phonetic)
  }
  
  // 添加词义
  entry.meanings.forEach((meaning, idx) => {
    const pos = meaning.partOfSpeech
    const def = meaning.definitions[0]
    if (def) {
      lines.push(`${idx + 1}. [${pos}] ${def.definition}`)
      if (def.example) {
        lines.push(`   e.g. "${def.example}"`)
      }
    }
  })
  
  return lines.join('\n')
}

export interface TTSResponse {
  status: string
  audio: string // Base64
  subtitles?: any[]
}

export const generateTTS = (text: string) => {
  return apiFetch<TTSResponse>('/api/tts', {
    method: 'POST',
    body: { text },
  })
}


// ===== Settings & Models =====

export const getAllSettings = () => {
  return apiFetch<Record<string, string>>('/api/settings', {
    cache: 'no-store',
  })
}

export const updateSetting = (key: string, value: string) => {
  return apiFetch('/api/settings', {
    method: 'POST',
    body: { key, value },
  })
}

export const getLocalModels = () => {
  return apiFetch<{ models: any[] }>('/api/models/local', {
    cache: 'no-store',
  })
}

export const getRemoteProviders = () => {
  return apiFetch<{ providers: any[] }>('/api/models/remote', {
    cache: 'no-store',
  })
}

export interface ExportPdfParams {
  type: 'news' | 'concepts' | 'phrases'
  news_starred_only?: boolean
  date_from?: string
  date_to?: string
  [key: string]: any
}

export const exportPDF = (params: ExportPdfParams) => {
  return apiFetch<Blob>('/api/export/pdf', {
    method: 'POST',
    params,
    responseType: 'blob',
  })
}

// ===== Sync & Auth =====

export const register = (email: string, password: string) => {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: { email, password },
  })
}

export const login = (email: string, password: string) => {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export const logout = (clearLocalData: boolean = false) => {
  return apiFetch('/api/auth/logout', {
    method: 'POST',
    body: { clear_local_data: clearLocalData }
  })
}

export interface SyncResult {
  status: string
  uploaded: number
  downloaded: number
  message?: string
}

export const sync = () => {
  return apiFetch<SyncResult>('/api/sync', {
    method: 'POST',
    body: {
      method: 'POST',
    }
  })
}

export const getSyncStatus = async (retries = 3, delay = 500): Promise<unknown> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await apiFetch('/api/sync/status', {
        cache: 'no-store',
      })
    } catch (error) {
      // 如果是 "Failed to fetch" 类型的网络错误，且还有重试次数，则等待后重试
      if (
        attempt < retries - 1 &&
        error instanceof TypeError &&
        error.message === 'Failed to fetch'
      ) {
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }
  throw new Error('Failed to fetch sync status after retries')
}

// ===== User Profile =====

export interface UserProfile {
  id: number
  email: string
  display_name?: string
  created_at: string
}

export const getUserProfile = () => {
  return apiFetch<UserProfile>('/api/user/profile')
}

export const updateUserProfile = (displayName: string) => {
  return apiFetch('/api/user/profile', {
    method: 'PUT',
    body: { display_name: displayName }
  })
}

export const changePassword = (currentPassword: string, newPassword: string) => {
  return apiFetch('/api/user/change-password', {
    method: 'POST',
    body: {
      current_password: currentPassword,
      new_password: newPassword
    }
  })
}

export const verifyPassword = (password: string) => {
  return apiFetch<{ verified: boolean }>('/api/user/verify-password', {
    method: 'POST',
    body: { password }
  })
}

export const deleteAccount = () => {
  return apiFetch('/api/user/account', {
    method: 'DELETE'
  })
}

export const clearLocalData = () => {
  return apiFetch('/api/user/clear-local-data', {
    method: 'POST'
  })
}
