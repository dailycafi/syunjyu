'use client'

import { useState, useEffect } from 'react'
import { generateQuiz, type QuizQuestion } from '@/lib/api'
import { useUserPreferences } from '@/lib/preferences'

interface QuizViewProps {
  newsId: number
}

// Professional SVG Icons
const VocabularyIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    <path d="M8 7h6" />
    <path d="M8 11h8" />
  </svg>
)

const GrammarIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
  </svg>
)

const ComprehensionIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
)

const QuizIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
)

// Question type styling configuration - using warm tones to match English learner pink theme
const QUESTION_TYPE_CONFIG = {
  vocabulary: {
    label: 'Vocabulary',
    labelShort: 'VOCAB',
    Icon: VocabularyIcon,
    accentColor: 'text-rose-600',
    borderColor: 'border-rose-100',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    highlightBg: 'bg-rose-50/60',
    highlightBorder: 'border-rose-200',
    highlightText: 'text-rose-900',
    dotColor: 'bg-rose-400',
    leftBorder: 'border-l-rose-400',
  },
  grammar: {
    label: 'Grammar & Syntax',
    labelShort: 'SYNTAX',
    Icon: GrammarIcon,
    accentColor: 'text-fuchsia-600',
    borderColor: 'border-fuchsia-100',
    badgeBg: 'bg-fuchsia-50',
    badgeBorder: 'border-fuchsia-200',
    highlightBg: 'bg-fuchsia-50/60',
    highlightBorder: 'border-fuchsia-200',
    highlightText: 'text-fuchsia-900',
    dotColor: 'bg-fuchsia-400',
    leftBorder: 'border-l-fuchsia-400',
  },
  comprehension: {
    label: 'Comprehension',
    labelShort: 'READING',
    Icon: ComprehensionIcon,
    accentColor: 'text-pink-600',
    borderColor: 'border-pink-100',
    badgeBg: 'bg-pink-50',
    badgeBorder: 'border-pink-200',
    highlightBg: 'bg-pink-50/60',
    highlightBorder: 'border-pink-200',
    highlightText: 'text-pink-900',
    dotColor: 'bg-pink-400',
    leftBorder: 'border-l-pink-400',
  },
}

export default function QuizView({ newsId }: QuizViewProps) {
  const { mode, isEnglishLearner } = useUserPreferences()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  
  // State for tracking user answers: { questionId: selectedOptionId }
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)

  // Reset quiz when mode changes
  useEffect(() => {
    setQuestions([])
    setStarted(false)
    setAnswers({})
    setSubmitted(false)
    setError(null)
  }, [mode])

  const loadQuiz = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await generateQuiz(newsId, mode)
      setQuestions(data.questions)
      setStarted(true)
    } catch (err) {
      console.error(err)
      setError('Failed to generate quiz. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOptionSelect = (questionId: number, optionId: string) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [questionId]: optionId }))
  }

  const handleSubmit = () => {
    setSubmitted(true)
  }

  const handleRetry = () => {
    setSubmitted(false)
    setAnswers({})
    // Optional: re-fetch quiz if we want different questions, but for now just reset
    setStarted(false)
    setQuestions([])
  }

  const calculateScore = () => {
    let correct = 0
    questions.forEach(q => {
      if (answers[q.id] === q.correct_answer_id) correct++
    })
    return correct
  }

  if (!started) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border ${
        isEnglishLearner ? 'border-pink-100' : 'border-slate-200'
      }`}>
        {/* Icon */}
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${
          isEnglishLearner ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white' : 'bg-blue-600 text-white'
        }`}>
          <QuizIcon className="w-7 h-7" />
        </div>
        
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          {isEnglishLearner ? 'Language Proficiency Quiz' : 'Verify Your Insights'}
        </h2>
        
        <p className="text-slate-500 max-w-md mb-6 text-sm leading-relaxed">
          {isEnglishLearner 
            ? 'Assess your English proficiency with questions covering vocabulary, grammar, and reading comprehension.'
            : 'Challenge your understanding of the key strategic viewpoints and future implications discussed in this analysis.'
          }
        </p>
        
        {isEnglishLearner && (
          <div className="flex items-center justify-center gap-5 mb-6 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span className="text-slate-500 font-medium">Vocabulary</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
              <span className="text-slate-500 font-medium">Grammar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
              <span className="text-slate-500 font-medium">Comprehension</span>
            </div>
          </div>
        )}
        
        <button
          onClick={loadQuiz}
          disabled={loading}
          className={`px-6 py-2.5 rounded-lg font-medium text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 ${
            isEnglishLearner ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </span>
          ) : (
            'Start Quiz'
          )}
        </button>

        {error && (
          <p className="mt-4 text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg border border-red-100">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {isEnglishLearner ? 'Language Assessment' : 'Critical Analysis'}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {Object.keys(answers).length} of {questions.length} answered
          </p>
        </div>
        
        {submitted && (
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                <span className="text-emerald-700 font-semibold text-sm">
                    {calculateScore()}/{questions.length}
                </span>
                <span className="text-emerald-600 text-xs">correct</span>
            </div>
        )}
      </div>

      <div className="space-y-6">
        {questions.map((q, idx) => {
          const isAnswered = !!answers[q.id]
          const isCorrect = answers[q.id] === q.correct_answer_id
          const selectedId = answers[q.id]
          const typeConfig = q.question_type ? QUESTION_TYPE_CONFIG[q.question_type] : null
          const TypeIcon = typeConfig?.Icon

          return (
            <div key={q.id} className={`bg-white rounded-xl p-5 border relative ${
              typeConfig && isEnglishLearner ? typeConfig.borderColor : 'border-slate-200'
            }`}>
               {/* Question Header */}
               <div className="flex items-center gap-3 mb-4">
                 <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
                   {idx + 1}
                 </span>
                 {typeConfig && isEnglishLearner && (
                   <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md border ${typeConfig.badgeBg} ${typeConfig.badgeBorder}`}>
                     <span className={`w-1.5 h-1.5 rounded-full ${typeConfig.dotColor}`} />
                     {TypeIcon && <TypeIcon className={`w-3.5 h-3.5 ${typeConfig.accentColor}`} />}
                     <span className={`text-[10px] font-semibold tracking-wide ${typeConfig.accentColor}`}>
                       {typeConfig.labelShort}
                     </span>
                   </div>
                 )}
               </div>

              {/* Highlighted Text (for vocabulary/grammar questions) */}
              {q.highlighted_text && isEnglishLearner && typeConfig && (
                <div className={`mb-4 px-4 py-3 rounded-lg border-l-2 ${typeConfig.highlightBg} ${typeConfig.leftBorder}`}>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1">
                    {q.question_type === 'vocabulary' ? 'Target Expression' : 'Sentence Structure'}
                  </p>
                  <p className={`text-sm leading-relaxed font-medium ${typeConfig.highlightText}`}>
                    {q.highlighted_text}
                  </p>
                </div>
              )}

              <h3 className="text-base font-medium text-slate-800 mb-5 leading-relaxed">
                {q.question}
              </h3>

              <div className="space-y-2">
                {q.options.map((opt) => {
                    let optionClass = "border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    let statusIcon = null
                    
                    if (submitted) {
                        if (opt.id === q.correct_answer_id) {
                            optionClass = "bg-emerald-50 border-emerald-200 text-emerald-800"
                            statusIcon = (
                              <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )
                        } else if (opt.id === selectedId) {
                            optionClass = "bg-red-50 border-red-200 text-red-800"
                            statusIcon = (
                              <svg className="w-4 h-4 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )
                        } else {
                            optionClass = "opacity-40 border-slate-100 bg-slate-50"
                        }
                    } else if (selectedId === opt.id) {
                        optionClass = isEnglishLearner 
                          ? "bg-pink-500 border-pink-500 text-white"
                          : "bg-blue-600 border-blue-600 text-white"
                    }

                    return (
                        <button
                            key={opt.id}
                            onClick={() => handleOptionSelect(q.id, opt.id)}
                            disabled={submitted}
                            className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex items-start justify-between group ${optionClass}`}
                        >
                            <div className="flex items-start gap-3">
                                <span className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center text-[11px] font-semibold transition-colors mt-0.5 ${
                                    selectedId === opt.id && !submitted
                                     ? 'border-transparent bg-white/25 text-white' 
                                     : submitted && opt.id === q.correct_answer_id
                                     ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                                     : submitted && opt.id === selectedId
                                     ? 'border-red-300 bg-red-100 text-red-700'
                                     : 'border-slate-200 text-slate-400 group-hover:border-slate-300'
                                }`}>
                                    {opt.id}
                                </span>
                                <span className="leading-relaxed text-sm">{opt.text}</span>
                            </div>
                            {statusIcon}
                        </button>
                    )
                })}
              </div>

              {submitted && (
                  <div className="mt-5 pt-4 border-t border-slate-100">
                      <div className="flex gap-3 text-sm">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide shrink-0 pt-0.5">Explanation</span>
                          <p className="text-slate-600 leading-relaxed">{q.explanation}</p>
                      </div>
                  </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8 flex justify-end gap-3 pb-8">
        {submitted ? (
            <button 
                onClick={handleRetry}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition border ${
                  isEnglishLearner 
                    ? 'text-pink-600 border-pink-200 hover:bg-pink-50' 
                    : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
                Retry Quiz
            </button>
        ) : (
            <button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length < questions.length}
                className={`px-5 py-2 rounded-lg text-sm font-medium text-white transition-all ${
                    Object.keys(answers).length < questions.length
                    ? 'bg-slate-300 cursor-not-allowed'
                    : isEnglishLearner 
                      ? 'bg-pink-500 hover:bg-pink-600' 
                      : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
                Submit
            </button>
        )}
      </div>
    </div>
  )
}

