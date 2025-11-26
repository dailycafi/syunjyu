'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { 
  getPhrases, 
  PhraseRecord, 
  checkSentence, 
  explainConcept, 
  explainSnippet,
  defineWord,
  deletePhrase
} from '@/lib/api'
import { useUserPreferences } from '@/lib/preferences'

const VOCAB_HIGHLIGHT_COLOR = '#fff3b0'
const TERM_HIGHLIGHT_COLOR = '#e0e7ff'

export default function PhrasesPage() {
  const [phrases, setPhrases] = useState<PhraseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  
  const { mode, isEnglishLearner } = useUserPreferences()
  
  const [activeTab, setActiveTab] = useState<'vocabulary' | 'content'>('vocabulary')

  // Remove effect that forces tab based on mode, let user choose
  // useEffect(() => {
  //   setActiveTab(isEnglishLearner ? 'vocabulary' : 'terminology')
  // }, [isEnglishLearner])

  useEffect(() => {
    loadPhrases()
  }, [])

  const loadPhrases = async (searchTerm?: string) => {
    setLoading(true)
    try {
      const data = await getPhrases({ search: searchTerm, limit: 500 })
      setPhrases(data.phrases)
    } catch (error) {
      console.error('Failed to load phrases:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deletePhrase(id)
      setPhrases(phrases.filter(p => p.id !== id))
      setDeleteConfirmId(null)
    } catch (error) {
      console.error('Failed to delete phrase:', error)
      alert('Failed to delete item')
    }
  }

  const filteredPhrases = phrases.filter(p => {
      // Filter by type
      // Default to vocabulary if type is missing (backward compatibility)
      const type = p.type || (p.color?.includes('fff3b0') || p.color?.includes('yellow') ? 'vocabulary' : 'vocabulary') // Defaulting old blue/pink to vocab for now unless we can guess better. 
      // Actually, let's use the logic: if it was blue/indigo, it might be terminology which is still "vocabulary" in broad sense but "terms".
      // But now we have "Sentences".
      
      // Improved Backwards Compat:
      // If type is present, use it.
      if (p.type) {
          return activeTab === 'vocabulary' ? p.type === 'vocabulary' : p.type === 'content'
      }
      
      // Fallback: Text length heuristics?
      // If text is long (> 50 chars), likely a sentence/content.
      if (p.text.length > 60) {
          return activeTab === 'content'
      }
      
      // Otherwise assume vocabulary
      return activeTab === 'vocabulary'
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadPhrases(search)
  }
  
  const buttonColor = isEnglishLearner ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-600 hover:bg-blue-700'

  return (
    <div className="container mx-auto px-6 py-8 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Learning Library</h1>
        <p className="text-gray-600 mt-2">
          Manage your personal collection of vocabulary and technical terms.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8">
        <button
            onClick={() => setActiveTab('vocabulary')}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'vocabulary' 
                ? 'text-pink-600 border-b-2 border-pink-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
        >
            <span className="mr-2">📚</span>
            Vocabulary
        </button>
        <button
            onClick={() => setActiveTab('content')}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'content' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
        >
            <span className="mr-2">📝</span>
            Sentences & Insights
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-3 shadow-sm rounded-lg bg-white p-1.5 border border-gray-200">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search library..."
            className="flex-1 px-4 py-2 bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />
          <button
            type="submit"
            className={`px-6 py-2 rounded-md text-white font-medium transition-colors ${
              isEnglishLearner ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Search
          </button>
        </div>
      </form>

      {/* Phrases list */}
      {loading ? (
        <div className="text-center py-12">
          <div className={`inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-r-transparent ${
            activeTab === 'vocabulary' ? 'border-pink-500' : 'border-blue-600'
          }`}></div>
          <p className="mt-4 text-gray-600">Loading your library...</p>
        </div>
      ) : filteredPhrases.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300 shadow-sm">
           <div className="text-4xl mb-4">{activeTab === 'vocabulary' ? '📚' : '🧠'}</div>
           <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
           <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {activeTab === 'vocabulary'
              ? 'Save interesting words from articles to build your vocabulary.'
              : 'Collect technical terms and insights to build your knowledge base.'}
          </p>
          <Link 
            href="/"
            className={`inline-flex items-center px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                activeTab === 'vocabulary' ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Go to News Feed
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPhrases.map((phrase) => (
            <div key={phrase.id} className="relative">
                {deleteConfirmId === phrase.id && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl border border-red-100">
                        <div className="text-center">
                            <p className="text-sm font-bold text-red-600 mb-3">Confirm Delete?</p>
                            <div className="flex gap-2 justify-center">
                                <button 
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => handleDelete(phrase.id)}
                                    className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded hover:bg-red-600 shadow-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <PhraseItem 
                  phrase={phrase} 
                  isEnglishLearner={activeTab === 'vocabulary'} 
                  onDelete={() => setDeleteConfirmId(phrase.id)}
                />
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {filteredPhrases.length > 0 && (
        <div className="mt-8 text-center text-sm text-gray-500">
          Showing {filteredPhrases.length} items
        </div>
      )}
    </div>
  )
}

function PhraseItem({ phrase, isEnglishLearner, onDelete }: { phrase: PhraseRecord, isEnglishLearner: boolean, onDelete: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Learning States
  const [definition, setDefinition] = useState<string | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [practiceSentence, setPracticeSentence] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const themeColor = isEnglishLearner ? 'pink' : 'blue'

  const handleDefine = async () => {
    if (definition) return
    setIsProcessing(true)
    try {
      const res = await defineWord(phrase.text)
      setDefinition(res.definition)
    } catch (err) {
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExplain = async () => {
    if (explanation) return // Toggle or refresh? For now, just load once.
    setIsProcessing(true)
    try {
      const res = await explainConcept(phrase.text, phrase.note || undefined)
      setExplanation(res.explanation)
    } catch (err) {
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCheckSentence = async () => {
    if (!practiceSentence.trim()) return
    setIsProcessing(true)
    try {
      const res = await checkSentence(phrase.text, practiceSentence)
      setFeedback(res.feedback)
    } catch (err) {
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 mb-6 ${
      isExpanded ? 'ring-1 ring-offset-2' : 'hover:shadow-md'
    } ${isEnglishLearner ? 'ring-pink-200' : 'ring-blue-200'}`}>
      
      {/* Header / Collapsed View */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 cursor-pointer flex justify-between items-start gap-4"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-bold text-slate-800 leading-tight hover:text-pink-600 transition-colors">
                {phrase.news_id ? (
                    <Link 
                        href={phrase.start_offset ? `/news/${phrase.news_id}#phrase-${phrase.id}` : `/news/${phrase.news_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline"
                        title="Go to article"
                    >
                        {phrase.text}
                    </Link>
                ) : phrase.text}
            </h3>
            
            {phrase.pronunciation && (
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {phrase.pronunciation}
                </span>
            )}

            {/* Source Link Icon */}
            {phrase.news_id && (
                <Link 
                    href={phrase.start_offset ? `/news/${phrase.news_id}#phrase-${phrase.id}` : `/news/${phrase.news_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-xs text-slate-500 flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full transition-all border border-slate-200 shadow-sm group ${
                        isEnglishLearner 
                        ? 'hover:text-pink-600 hover:border-pink-200 hover:bg-pink-50' 
                        : 'hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50'
                    }`}
                    title="Read in original article"
                >
                    <span className="text-[10px] opacity-60 group-hover:opacity-100 transition-opacity">↗</span>
                    <span className="text-[10px] font-semibold tracking-wide">SOURCE</span>
                </Link>
            )}
          </div>
          
          {phrase.note && (
            <p className="text-slate-500 text-sm mt-1 line-clamp-2">
              {phrase.note}
            </p>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
           <div className="flex items-center gap-3">
               <span className="text-xs text-slate-400 font-mono">
                {new Date(phrase.created_at).toLocaleDateString()}
              </span>
              <button 
                onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                }}
                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                title="Delete item"
              >
                🗑️
              </button>
           </div>
          <span className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
            ›
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-gray-50 bg-slate-50/30">
          
          {isEnglishLearner ? (
            // English Learner Content
            <div className="mt-4 space-y-6">
              {/* 1. Definition */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Definition</h4>
                  <button 
                    onClick={handleDefine}
                    disabled={isProcessing}
                    className="text-xs font-medium text-pink-600 hover:text-pink-700 disabled:opacity-50"
                  >
                    {definition ? 'Refresh Definition' : (isProcessing ? 'Loading...' : 'Show Definition')}
                  </button>
                </div>
                {/* Auto-load definition if missing but expanded? Maybe too many requests. 
                    Let's just show a placeholder or load button. */}
                
                {definition ? (
                  <div className="bg-pink-50/50 p-4 rounded-lg border border-pink-100 text-sm text-slate-700">
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-headings:text-pink-800 prose-headings:font-bold prose-strong:text-pink-700 prose-strong:font-bold">
                        <ReactMarkdown>{definition}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                    <div className="text-sm text-slate-400 italic">
                        Click "Show Definition" to see meaning and examples.
                    </div>
                )}
              </div>

              {/* 2. Practice */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Sentence Practice</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={practiceSentence}
                    onChange={(e) => setPracticeSentence(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && practiceSentence.trim() && !isProcessing) {
                            handleCheckSentence()
                        }
                    }}
                    placeholder={`Make a sentence with "${phrase.text}"...`}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-pink-500 focus:border-pink-500 outline-none"
                  />
                  <button
                    onClick={handleCheckSentence}
                    disabled={!practiceSentence.trim() || isProcessing}
                    className="px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-slate-700 rounded-md hover:bg-gray-50 hover:text-pink-600 disabled:opacity-50 transition-colors"
                  >
                    Check
                  </button>
                </div>
                {feedback && (
                  <div className="mt-3 bg-white p-3 rounded-lg border border-pink-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-2">
                      <span className="text-lg">🤖</span>
                      <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-500">AI Feedback:</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{feedback}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // AI Learner Content
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Deep Dive</h4>
                <button 
                  onClick={handleExplain}
                  disabled={isProcessing}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                   {explanation ? 'Refresh' : (isProcessing ? 'Analyzing...' : 'Explain Concept')}
                </button>
              </div>

              {explanation ? (
                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 text-sm text-slate-700 shadow-sm">
                   <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-headings:text-blue-800 prose-headings:font-bold prose-strong:text-blue-700 prose-strong:font-bold">
                        <ReactMarkdown>{explanation}</ReactMarkdown>
                   </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  Click "Explain Concept" to get an AI-powered breakdown of this term based on your notes.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
