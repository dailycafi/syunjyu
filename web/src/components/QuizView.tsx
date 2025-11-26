'use client'

import { useState, useEffect } from 'react'
import { generateQuiz, type QuizQuestion } from '@/lib/api'
import { useUserPreferences } from '@/lib/preferences'

interface QuizViewProps {
  newsId: number
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
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
          isEnglishLearner ? 'bg-pink-50 text-pink-500' : 'bg-blue-50 text-blue-500'
        }`}>
          <span className="text-4xl">
            {isEnglishLearner ? '📝' : '🧠'}
          </span>
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {isEnglishLearner ? 'Test Your Comprehension' : 'Verify Your Insights'}
        </h2>
        
        <p className="text-slate-500 max-w-md mb-8 leading-relaxed">
          {isEnglishLearner 
            ? 'Take a quick IELTS-style reading test generated from this article to check your understanding and vocabulary mastery.'
            : 'Challenge your understanding of the key strategic viewpoints and future implications discussed in this analysis.'
          }
        </p>
        
        <button
          onClick={loadQuiz}
          disabled={loading}
          className={`btn px-8 py-3 rounded-xl font-semibold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 ${
            isEnglishLearner ? 'bg-pink-500 shadow-pink-200' : 'bg-blue-600 shadow-blue-200'
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Generating Questions...
            </span>
          ) : (
            'Start Quiz'
          )}
        </button>

        {error && (
          <p className="mt-4 text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isEnglishLearner ? 'Reading Comprehension' : 'Critical Analysis'}
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-rounded">
            Question {Object.keys(answers).length} of {questions.length} answered
          </p>
        </div>
        
        {submitted && (
            <div className="flex items-center gap-3 bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                <span className="text-green-700 font-bold text-lg font-rounded">
                    {calculateScore()} / {questions.length}
                </span>
                <span className="text-green-600 text-sm font-medium">Correct</span>
            </div>
        )}
      </div>

      <div className="space-y-8">
        {questions.map((q, idx) => {
          const isAnswered = !!answers[q.id]
          const isCorrect = answers[q.id] === q.correct_answer_id
          const selectedId = answers[q.id]

          return (
            <div key={q.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
               {/* Question Number */}
               <div className="absolute top-0 left-0 bg-slate-50 px-3 py-1 rounded-br-xl border-b border-r border-slate-100 text-xs font-bold text-slate-400 font-rounded">
                 {idx + 1}
               </div>

              <h3 className="text-lg font-semibold text-slate-800 mb-6 mt-2 leading-relaxed">
                {q.question}
              </h3>

              <div className="space-y-3">
                {q.options.map((opt) => {
                    let optionClass = "border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    let icon = null
                    
                    if (submitted) {
                        if (opt.id === q.correct_answer_id) {
                            optionClass = "bg-green-50 border-green-200 text-green-800 ring-1 ring-green-200"
                            icon = <span className="text-green-600">✓</span>
                        } else if (opt.id === selectedId) {
                            optionClass = "bg-red-50 border-red-200 text-red-800 ring-1 ring-red-200"
                            icon = <span className="text-red-600">✗</span>
                        } else {
                            optionClass = "opacity-50 border-slate-100 bg-slate-50"
                        }
                    } else if (selectedId === opt.id) {
                        optionClass = isEnglishLearner 
                            ? "bg-pink-50 border-pink-200 text-pink-900 ring-1 ring-pink-200"
                            : "bg-blue-50 border-blue-200 text-blue-900 ring-1 ring-blue-200"
                    }

                    return (
                        <button
                            key={opt.id}
                            onClick={() => handleOptionSelect(q.id, opt.id)}
                            disabled={submitted}
                            className={`w-full text-left p-4 rounded-xl border transition-all flex items-start justify-between group ${optionClass}`}
                        >
                            <div className="flex items-start gap-3">
                                <span className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold transition-colors font-rounded mt-0.5 ${
                                    selectedId === opt.id || (submitted && opt.id === q.correct_answer_id)
                                     ? 'border-transparent bg-white/50' 
                                     : 'border-slate-300 text-slate-400 group-hover:border-slate-400'
                                }`}>
                                    {opt.id}
                                </span>
                                <span className="leading-snug">{opt.text}</span>
                            </div>
                            {icon}
                        </button>
                    )
                })}
              </div>

              {submitted && (
                  <div className="mt-6 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                      <div className="flex gap-2 text-sm">
                          <span className="font-bold text-slate-700 shrink-0">Explanation:</span>
                          <p className="text-slate-600 leading-relaxed">{q.explanation}</p>
                      </div>
                  </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-10 flex justify-end gap-4 pb-12">
        {submitted ? (
            <button 
                onClick={handleRetry}
                className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition"
            >
                Try Another Quiz
            </button>
        ) : (
            <button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length < questions.length}
                className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${
                    Object.keys(answers).length < questions.length
                    ? 'bg-slate-300 cursor-not-allowed'
                    : isEnglishLearner ? 'bg-pink-500 hover:bg-pink-600 shadow-pink-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                }`}
            >
                Submit Answers
            </button>
        )}
      </div>
    </div>
  )
}

