'use client'

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  analyzeArticle,
  explainSnippet,
  checkSentence,
  getNewsDetail,
  getPhrases,
  getAllPhraseTexts,
  savePhrase,
  deletePhrase,
  refetchNews,
  generateTTS,
  fetchDictionaryDefinition,
  formatDictionaryDefinition,
  defineWord,
  type AnalysisScope,
  type NewsRecord,
  type PhraseRecord,
  type ArticleStructure,
  type StructureNode,
  type StructureNodeType,
  type VocabularyItem,
} from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { format } from 'date-fns'
import { getNewsCategoryLabel } from '@/lib/newsCategories'
import { useToast } from '@/components/Toast'
import ConfirmModal from '@/components/ConfirmModal'
import { useUserPreferences } from '@/lib/preferences'
import QuizView from '@/components/QuizView'

interface NewsDetailPageClientProps {
  newsId: number
}

interface SelectionMenu {
  text: string
  top: number
  left: number
  start: number
  end: number
}

interface SelectionMeta {
  start: number
  end: number
  context_before: string
  context_after: string
}

const TERM_HIGHLIGHT_COLOR = '#e0e7ff' // indigo-100
const VOCAB_HIGHLIGHT_COLOR = '#fff3b0' // amber-100

const NODE_VARIANTS: Record<
  StructureNodeType | 'default',
  { label: string; bg: string; accent: string; ring: string; glow: string; text: string; subtext: string; badge_bg: string }
> = {
  conclusion: {
    label: 'Key Takeaway',
    bg: 'bg-white',
    accent: 'text-purple-700',
    ring: 'ring-purple-200',
    glow: 'shadow-lg shadow-purple-100',
    text: 'text-slate-900',
    subtext: 'text-slate-500',
    badge_bg: 'bg-purple-50'
  },
  argument: {
    label: 'Core Argument',
    bg: 'bg-white',
    accent: 'text-blue-700',
    ring: 'ring-blue-200',
    glow: 'shadow-md shadow-blue-100',
    text: 'text-slate-900',
    subtext: 'text-slate-500',
    badge_bg: 'bg-blue-50'
  },
  evidence: {
    label: 'Key Evidence',
    bg: 'bg-white',
    accent: 'text-emerald-700',
    ring: 'ring-emerald-200',
    glow: 'shadow-sm shadow-emerald-100',
    text: 'text-slate-900',
    subtext: 'text-slate-500',
    badge_bg: 'bg-emerald-50'
  },
  logic: {
    label: 'Logical Deduction',
    bg: 'bg-white',
    accent: 'text-amber-700',
    ring: 'ring-amber-200',
    glow: 'shadow-sm shadow-amber-100',
    text: 'text-slate-900',
    subtext: 'text-slate-500',
    badge_bg: 'bg-amber-50'
  },
  insight: {
    label: 'Deep Insight',
    bg: 'bg-white',
    accent: 'text-indigo-700',
    ring: 'ring-indigo-200',
    glow: 'shadow-sm shadow-indigo-100',
    text: 'text-slate-900',
    subtext: 'text-slate-500',
    badge_bg: 'bg-indigo-50'
  },
  impact: {
    label: 'Potential Impact',
    bg: 'bg-white',
    accent: 'text-rose-700',
    ring: 'ring-rose-200',
    glow: 'shadow-sm shadow-rose-100',
    text: 'text-slate-900',
    subtext: 'text-slate-500',
    badge_bg: 'bg-rose-50'
  },
  default: {
    label: 'Node',
    bg: 'bg-white',
    accent: 'text-slate-700',
    ring: 'ring-slate-200',
    glow: 'shadow-sm shadow-slate-100',
    text: 'text-slate-900',
    subtext: 'text-slate-500',
    badge_bg: 'bg-slate-50'
  },
}

const StructureNodeTree = ({ node }: { node: StructureNode }) => {
  const variant = NODE_VARIANTS[node.type] ?? NODE_VARIANTS.default

  return (
    <div className="relative">
      <div
        className={`relative rounded-2xl border bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 ${variant.glow} ${variant.ring} ring-1`}
      >
        <div className="flex items-start gap-3">
          <div className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold tracking-wider uppercase ${variant.badge_bg} ${variant.accent}`}>
            {variant.label}
          </div>
          <div className="space-y-1.5">
            <h5 className={`text-base font-bold leading-snug ${variant.text}`}>{node.label}</h5>
            <p className={`text-sm leading-relaxed ${variant.subtext}`}>{node.summary}</p>
          </div>
        </div>
        
        {node.children && node.children.length > 0 && (
          <div className="mt-4 space-y-4">
             {/* Recursive Children */}
            {node.children.map((child) => (
              <StructureNodeTree key={child.id} node={child} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Takeaway item can be a string (old format) or an object with type and content (new format)
type TakeawayItem = string | { type: string; content: string }

const StructureConclusion = ({ takeaways }: { takeaways?: TakeawayItem[] }) => {
  if (!takeaways || !Array.isArray(takeaways) || takeaways.length === 0) return null

  // Helper to get display text from takeaway item
  const getTakeawayText = (item: TakeawayItem): string => {
    if (typeof item === 'string') return item
    if (typeof item === 'object' && item !== null && 'content' in item) return item.content
    return String(item)
  }

  // Helper to get type label from takeaway item
  const getTakeawayType = (item: TakeawayItem): string => {
    if (typeof item === 'object' && item !== null && 'type' in item) {
      const typeMap: Record<string, string> = {
        'question': 'Key Question',
        'strategic': 'Strategic',
        'connection': 'Connection',
        'insight': 'Insight',
      }
      return typeMap[item.type] || 'Insight'
    }
    return 'Insight'
  }

  return (
    <div className="mt-10 rounded-3xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/50 p-8 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-purple-100 pb-6 mb-6">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-purple-600 uppercase">Key Takeaways</p>
          <h4 className="mt-2 text-2xl font-bold text-slate-900">Strategic Insights</h4>
        </div>
        <div className="flex gap-3">
          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">AI Synthesis</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {takeaways.map((item, idx) => (
          <div key={idx} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:border-purple-200 transition-colors">
            <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-xs font-bold">
                    {idx + 1}
                </span>
                <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{getTakeawayType(item)}</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-700 font-medium">{getTakeawayText(item)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const normalizeStructurePayload = (raw: unknown): ArticleStructure | undefined => {
  if (!raw) return undefined

  if (typeof raw === 'object' && raw !== null) {
    const structured = raw as ArticleStructure
    if (structured.root || structured.takeaways || structured.legacySections) {
      return structured
    }
  }

  const asAny = raw as unknown as {
    nodes?: StructureNode[]
    conclusion?: { insight?: string; impact?: string }
  }

  if (Array.isArray(asAny.nodes)) {
    const insight = asAny.conclusion?.insight || 'Core narrative'
    const impact = asAny.conclusion?.impact
    return {
      root: {
        id: 'root',
        label: insight,
        type: 'conclusion',
        summary: impact || insight,
        children: asAny.nodes,
      },
      takeaways: [insight, impact].filter(Boolean) as string[],
    }
  }

  if (Array.isArray(raw as [])) {
    return {
      legacySections: raw as unknown as { section: string; description: string }[],
    }
  }

  return raw as ArticleStructure
}

const renderHighlightedContent = (
    text: string, 
    phrases: PhraseRecord[], 
    globalPhrases: string[], 
    aiVocabulary: VocabularyItem[], 
    ignoredTerms: string[] = [],
    currentAudioTime: number = -1,
    subtitles: any[] = [],
    isAiMode: boolean = false,
    onAiTermClick?: (term: string, definition: string, rect: DOMRect) => void,
    onLocalPhraseClick?: (phraseId: number, term: string, note: string, rect: DOMRect) => void,
    onGlobalPhraseClick?: (term: string, rect: DOMRect) => void
): ReactNode => {
  if (!text) return null
  
  // Clean up junk patterns that may have slipped through backend processing
  // 1. Remove lines that are just separators like |---| 
  text = text.replace(/^\s*\|[-\s|]+\|\s*$/gm, '')
  // 2. Remove "Got a Tip?" style lines
  text = text.replace(/^\s*\|?\s*Got a [Tt]ip\?\s*\|?\s*$/gm, '')
  // 3. Remove lines starting with | that aren't tables (no second |)
  text = text.replace(/^\s*\|\s+(?![^\n]*\|)/gm, '')
  // 4. Remove trailing pipe characters from lines
  text = text.replace(/\s*\|\s*$/gm, '')
  // 5. Remove "Are you a current or former..." lines
  text = text.replace(/^.*Are you a current or former.*$/gm, '')
  // 6. Remove "Contact the reporter" lines  
  text = text.replace(/^.*[Cc]ontact the reporter[s]? securely.*$/gm, '')
  // 7. Clean up multiple consecutive blank lines
  text = text.replace(/\n{3,}/g, '\n\n')
  
  // Collect all ranges to highlight
  interface HighlightRange {
    start: number
    end: number
    type: 'local' | 'global' | 'ai' | 'playback' | 'markdown_table' | 'code_block'
    payload?: any
  }

  const ranges: HighlightRange[] = []
  const textLower = text.toLowerCase()

  // 0a. Code Blocks (Highest Priority - Structural)
  // Detect fenced code blocks like ```python ... ```
  const CODE_BLOCK_REGEX = /```(\w*)\n?([\s\S]*?)```/g
  let codeMatch
  CODE_BLOCK_REGEX.lastIndex = 0
  
  while ((codeMatch = CODE_BLOCK_REGEX.exec(text)) !== null) {
      const language = codeMatch[1] || 'text'
      const codeContent = codeMatch[2]
      const matchIndex = codeMatch.index
      const matchLength = codeMatch[0].length
      
      ranges.push({
          start: matchIndex,
          end: matchIndex + matchLength,
          type: 'code_block',
          payload: { language, code: codeContent }
      })
  }

  // 0b. Markdown Tables (Highest Priority - Structural)
  // Detect tables to preserve their structure and render as Markdown
  // Regex to match GFM tables: Header row, Separator row, optional Data rows
  // Adjusted to allow rows that don't strictly start/end with | but contain |
  const TABLE_REGEX = /(?:^|\n)((?:\|[^\n]+\|\r?\n)+\|[-:|\s]+\|(?:\r?\n.*\|.*)*)/g
  let tableMatch
  // Reset lastIndex just in case
  TABLE_REGEX.lastIndex = 0
  
  while ((tableMatch = TABLE_REGEX.exec(text)) !== null) {
      const tableText = tableMatch[1]
      // Calculate true start index (accounting for potential newline in group 0 but not group 1)
      const fullMatch = tableMatch[0]
      const offset = fullMatch.indexOf(tableText)
      const matchIndex = tableMatch.index + offset
      
      ranges.push({
          start: matchIndex,
          end: matchIndex + tableText.length,
          type: 'markdown_table',
          payload: tableText
      })
  }

  // 0. Playback Highlight (highest priority for visibility, but maybe overlays others?)
  // Actually we want playback to be a distinct style, maybe background color change that composites
  // For simplicity, let's add it as a high priority range
  if (currentAudioTime >= 0 && subtitles.length > 0) {
      // Find current subtitle segment
      // Format usually: { "text_items": [ { "text": "...", "start_time": 0, "end_time": 500 }, ... ] } or similar
      // Need to check actual Minimax format. Assuming standard aligned format.
      // Minimax format from docs is not fully specified for "json", but likely list of words/chars or sentences.
      // If we get a list of segments with char offsets, that's best.
      // If no char offsets, we have to approximate by text matching (hard).
      // Let's assume we can match time.
      
      // Note: The alignment from TTS might not match raw text perfectly if text was pre-processed.
      // But here we passed raw text.
      
      // Let's iterate subtitles to find current one
      const currentMs = currentAudioTime * 1000
      const currentSub = subtitles.find((s: any) => {
          // Assuming structure: { begin_time: ms, end_time: ms, text: string }
          return currentMs >= s.begin_time && currentMs < s.end_time
      })
      
      if (currentSub) {
          // We need to find where this text is in the article.
          // Since we don't have char offsets from API (usually), we might need to do a fuzzy match or just sequential match?
          // Actually, generating TTS with the EXACT text means we can try to map it.
          // But multiple occurrences of same word...
          // IF Minimax returns char index, use it. 
          // If not, this is hard. 
          // Let's try simple text matching for the demo, searching near "expected" progress?
          
          // Fallback: If no alignment data, we can't highlight precise words.
          // But if user just wants a progress bar, the audio player has one.
          // "Showing where I read" implies text highlighting.
          
          // Hack: search for the text segment in the full text.
          // Since subtitles are sequential, we could track current index.
          // But render is stateless.
          
          // Let's assume unique match for now or find all matches? No, that's messy.
          // Real implementation needs character-level alignment from TTS engine.
          // If Minimax doesn't provide char offset, we assume it returns text.
          
          // Let's try to find the text in the article.
          if (currentSub.text) {
             // This is risky without offsets.
             // Let's skip text highlighting for now if we can't guarantee accuracy, 
             // OR just highlight the first match?
             // Better: Do nothing for now in text body, just rely on audio player progress?
             // User asked for "show where I read".
             
             // Let's try to match roughly.
             const subText = currentSub.text.trim()
             if (subText.length > 3) {
                 const pos = text.indexOf(subText)
                 if (pos >= 0) {
                     ranges.push({
                         start: pos,
                         end: pos + subText.length,
                         type: 'playback',
                         payload: currentSub
                     })
                 }
             }
          }
      }
  }

  // 1. Local Phrases (highest priority)
  phrases.forEach(p => {
     if (typeof p.start_offset === 'number' && typeof p.end_offset === 'number' && p.end_offset > p.start_offset) {
         ranges.push({
             start: p.start_offset,
             end: p.end_offset,
             type: 'local',
             payload: p
         })
     }
  })

  // 2. Global Phrases (medium priority) - simple string matching
  // Only if not overlapping with local
  if (globalPhrases.length > 0) {
      globalPhrases.forEach(term => {
          if (!term || term.length < 2) return
          const termLower = term.toLowerCase()
          let pos = textLower.indexOf(termLower)
          while (pos !== -1) {
              // Check bounds (whole word check roughly)
              // Simple check: check overlapping with existing local highlights
              // We will filter overlaps later, just add candidates
              ranges.push({
                  start: pos,
                  end: pos + term.length,
                  type: 'global',
                  payload: term
              })
              pos = textLower.indexOf(termLower, pos + 1)
          }
      })
  }

  // Resolve overlaps: prefer Playback > Local > Global > AI. 
  // But wait, if we have multiple matches for the same term, we want to highlight all of them.
  // The issue user reported is "I marked ChatGPT Shopping Research but others didn't appear".
  // This implies either:
  // 1. The other terms were not found by AI.
  // 2. They were found but not matched in text.
  // 3. They were matched but overlapped and got filtered out.
  
  // Let's debug overlap logic.
  // We sort by priority.
  // Playback > Local > Global > AI.
  // If AI terms overlap with each other?
  // e.g. "Reinforcement Learning" vs "Learning".
  // We should prefer the longer one?
  // Current sort: Priority -> Length (desc) -> Start (asc).
  // So longer AI term should win over shorter AI term.
  
  // BUT, maybe the matching logic itself is too strict or failing?
  // "ChatGPT Shopping Research" -> matches.
  // "Reinforcement Learning (RL)" -> The term from AI might be "Reinforcement Learning (RL)".
  // But text only says "reinforcement learning".
  // We need to handle fuzzy matching or clean the term.
  // The prompt asks for "term": "Word or phrase".
  // If AI returns "Reinforcement Learning (RL)", we should try to match that verbatim first.
  // If fail, maybe try to match without parens?
  // Let's improve matching logic in renderHighlightedContent.
  
  // Helper to clean term for matching
  const cleanTerm = (t: string) => t.replace(/\s*\([^)]*\)/g, '').trim() // Remove (content)

  // 3. AI Vocabulary (lowest priority)
  if (aiVocabulary.length > 0) {
      aiVocabulary.forEach(item => {
          if (!item.term || item.term.length < 2) return
          // Skip ignored terms
          if (ignoredTerms.includes(item.term)) return
          
          // Try exact match first
          let termToMatch = item.term.trim()
          let pos = textLower.indexOf(termToMatch.toLowerCase())
          
          // If not found, try cleaning (e.g. remove parens)
          if (pos === -1) {
              termToMatch = cleanTerm(item.term)
              if (termToMatch.length > 2) {
                  pos = textLower.indexOf(termToMatch.toLowerCase())
              }
          }
          
          // Find ALL occurrences
          while (pos !== -1) {
              // Check whole word boundary if possible (simple check)
              // Not strict regex here to avoid perf issues, but helps to avoid matching "cat" in "category"
              // Actually, for phrases, we often want exact phrase match.
              
              ranges.push({
                  start: pos,
                  end: pos + termToMatch.length,
                  type: 'ai',
                  payload: item
              })
              pos = textLower.indexOf(termToMatch.toLowerCase(), pos + 1)
          }
      })
  }

  // Sort ranges by start position
  // ranges.sort((a, b) => a.start - b.start) // Duplicate sort

  // Resolve overlaps: prefer Playback > Local > Global > AI. 
  // Also, within same type, prefer longer match? or first match?
  // Simplified merge: if overlap, skip lower priority or later one.
  const mergedRanges: HighlightRange[] = []
  
  let lastEnd = 0
  
  // We re-sort to ensure priority is handled if starts are equal
  // But actually, we should process conflicts. 
  // Let's stick to: if a range starts before lastEnd, it's an overlap.
  // To support priority, we should filter out lower priority overlaps BEFORE strictly linearizing.
  
  // Better approach: Create a mask array for the text length?
  // Text is long, maybe expensive.
  // Let's just filter naively: iterate sorted by priority, keep if no overlap.
  
  // Sort by priority (Table=-2, Playback=-1, Local=0, Global=1, AI=2) then length (desc) then start (asc)
  const getPriority = (t: string) => (t === 'markdown_table' ? -2 : t === 'playback' ? -1 : t === 'local' ? 0 : t === 'global' ? 1 : 2)
  
  // We want to highlight ALL occurrences, but no overlaps.
  // If "Machine Learning" and "Learning" both exist:
  // "Machine Learning" (len 16) vs "Learning" (len 8).
  // We want "Machine Learning" to win.
  // So sorting by length DESC is crucial.
  
  ranges.sort((a, b) => {
      const pA = getPriority(a.type)
      const pB = getPriority(b.type)
      if (pA !== pB) return pA - pB
      // If same priority, prefer longer match
      if ((b.end - b.start) !== (a.end - a.start)) return (b.end - b.start) - (a.end - a.start)
      return a.start - b.start
  })

  const finalRanges: HighlightRange[] = []
  
  // We need to check against already accepted ranges
  // Since we sorted by priority/length, the first valid one we encounter is the "best" one for that region.
  for (const r of ranges) {
      const isOverlapping = finalRanges.some(accepted => 
          (r.start < accepted.end && r.end > accepted.start)
      )
      if (!isOverlapping) {
          finalRanges.push(r)
      }
  }

  // Now sort final ranges by position for rendering
  finalRanges.sort((a, b) => a.start - b.start)

  const segments: ReactNode[] = []
  let cursor = 0
  const length = text.length
  let segmentCounter = 0 // Unique counter for generating keys

  // Helper function to render plain text with basic Markdown formatting
  // This function processes inline Markdown (bold, italic, code) while preserving line breaks
  const renderMarkdownText = (plainText: string, uniqueId: number): ReactNode => {
    // Check if text contains any inline Markdown formatting
    const hasInlineMarkdown = /\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`/.test(plainText)
    // Check if text contains block-level Markdown (headers: ##, ###, ####)
    const hasBlockMarkdown = /^#{2,4} /m.test(plainText)
    
    if (!hasInlineMarkdown && !hasBlockMarkdown) {
      // For plain text, wrap in a span with key to avoid React warnings
      return <span key={`plain-${uniqueId}`}>{plainText}</span>
    }
    
    // Process text line by line to preserve line breaks
    const lines = plainText.split('\n')
    const elements: ReactNode[] = []
    
    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        // Add line break between lines
        elements.push('\n')
      }
      
      // Check for headers (h2, h3, h4)
      const h2Match = line.match(/^## (.+)$/)
      const h3Match = line.match(/^### (.+)$/)
      const h4Match = line.match(/^#### (.+)$/)
      
      if (h4Match) {
        elements.push(
          <span key={`h4-${uniqueId}-${lineIndex}`} className="block text-base font-semibold mt-3 mb-1 text-slate-700">
            {h4Match[1]}
          </span>
        )
        return
      }
      
      if (h3Match) {
        elements.push(
          <span key={`h3-${uniqueId}-${lineIndex}`} className="block text-lg font-semibold mt-4 mb-2 text-slate-700">
            {h3Match[1]}
          </span>
        )
        return
      }
      
      if (h2Match) {
        elements.push(
          <span key={`h2-${uniqueId}-${lineIndex}`} className="block text-xl font-bold mt-6 mb-3 text-slate-800">
            {h2Match[1]}
          </span>
        )
        return
      }
      
      // Process inline markdown (bold, italic, inline code)
      if (/\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`/.test(line)) {
        // Split by markdown patterns and process
        const parts: ReactNode[] = []
        let remaining = line
        let partIndex = 0
        
        while (remaining.length > 0) {
          // Match bold (**text**), italic (*text*), or inline code (`text`)
          const match = remaining.match(/^(.*?)(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)(.*)$/)
          
          if (match) {
            // Add text before the match
            if (match[1]) {
              parts.push(<span key={`t-${uniqueId}-${lineIndex}-${partIndex++}`}>{match[1]}</span>)
            }
            
            // Add the formatted text
            if (match[3]) {
              // Bold
              parts.push(<strong key={`b-${uniqueId}-${lineIndex}-${partIndex++}`} className="font-bold">{match[3]}</strong>)
            } else if (match[4]) {
              // Italic
              parts.push(<em key={`i-${uniqueId}-${lineIndex}-${partIndex++}`} className="italic">{match[4]}</em>)
            } else if (match[5]) {
              // Inline code
              parts.push(<code key={`c-${uniqueId}-${lineIndex}-${partIndex++}`} className="bg-slate-100 px-1 py-0.5 rounded text-sm font-mono text-pink-600">{match[5]}</code>)
            }
            
            remaining = match[6] || ''
          } else {
            // No more matches, add remaining text
            parts.push(<span key={`r-${uniqueId}-${lineIndex}-${partIndex++}`}>{remaining}</span>)
            remaining = ''
          }
        }
        
        elements.push(<span key={`line-${uniqueId}-${lineIndex}`}>{parts}</span>)
      } else {
        // Plain line, just add it
        elements.push(<span key={`plain-${uniqueId}-${lineIndex}`}>{line}</span>)
      }
    })
    
    return <span key={`md-${uniqueId}`}>{elements}</span>
  }

  finalRanges.forEach((r) => {
    if (r.start > cursor) {
        const plainText = text.slice(cursor, r.start)
        segments.push(renderMarkdownText(plainText, segmentCounter++))
    }

    if (r.type === 'code_block') {
        const { language, code } = r.payload
        segments.push(
            <div key={`code-${r.start}`} className="my-6 not-prose">
                {language && (
                    <div className="bg-slate-800 text-slate-400 text-xs px-4 py-2 rounded-t-lg font-mono border-b border-slate-700">
                        {language}
                    </div>
                )}
                <pre className={`bg-slate-900 text-slate-100 p-4 overflow-x-auto text-sm font-mono leading-relaxed ${language ? 'rounded-b-lg' : 'rounded-lg'}`}>
                    <code>{code.trim()}</code>
                </pre>
            </div>
        )
        cursor = r.end
        return
    }

    if (r.type === 'markdown_table') {
        segments.push(
            <div key={`table-${r.start}`} className="my-8 overflow-x-auto not-prose rounded-xl border border-slate-200 shadow-sm bg-white">
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                        table: ({node, ...props}: any) => <table className="min-w-full border-collapse" {...props} />,
                        thead: ({node, ...props}: any) => <thead className="bg-slate-50 border-b-2 border-slate-200" {...props} />,
                        th: ({node, isHeader, ...props}: any) => <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 last:border-r-0" {...props} />,
                        tbody: ({node, ...props}: any) => <tbody className="bg-white divide-y divide-slate-200" {...props} />,
                        tr: ({node, isHeader, ...props}: any) => <tr className="hover:bg-slate-50/80 transition-colors group" {...props} />,
                        td: ({node, isHeader, ...props}: any) => <td className="px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap border-r border-slate-200 last:border-r-0" {...props} />,
                    } as any}
                >
                    {r.payload}
                </ReactMarkdown>
            </div>
        )
        cursor = r.end
        return
    }

    const highlightText = text.slice(r.start, r.end)
    
    // Style based on type
    let style: React.CSSProperties = {}
    let className = "rounded px-0.5 transition-colors cursor-pointer "
    let title = ""
    let onClick: React.MouseEventHandler | undefined = undefined
    
    if (r.type === 'playback') {
        style = { backgroundColor: '#fce7f3', boxShadow: '0 0 0 2px #fce7f3' } // pink-100
        className += "relative z-10" // Bring to front
    } else if (r.type === 'local') {
        // Check type of saved phrase against current mode
        // vocabulary -> show only in English mode
        // terminology -> show only in AI mode
        const type = r.payload.type
        const color = r.payload.color
        
        let shouldShow = true
        if (isAiMode) {
            // Show terminology (blue)
            if (type === 'vocabulary' || (color && color.includes('fff3b0'))) {
                shouldShow = false
            }
        } else {
            // Show vocabulary (yellow)
            if (type === 'terminology' || (color && color.includes('e0e7ff'))) {
                shouldShow = false
            }
        }
        
        if (!shouldShow) return // Skip rendering this mark
        
        // User saved phrases: Use GREEN to distinguish from AI-detected terms
        style = { backgroundColor: '#dcfce7', borderBottom: '2px solid #22c55e' } // green-100 bg, green-500 underline
        className += "hover:bg-green-200"
        title = r.payload.note ? `📚 Saved: ${r.payload.note}` : "📚 Saved - Click to view or remove"
        
        // Add click handler for local phrases
        onClick = (e) => {
            e.stopPropagation()
            onLocalPhraseClick?.(r.payload.id, highlightText, r.payload.note || '', e.currentTarget.getBoundingClientRect())
        }
    } else if (r.type === 'global') {
        // Global phrases might not have type/color attached directly if just a string list?
        // getGlobalPhrases returns strings. 
        // If we want to filter global phrases by type, we need to fetch full objects or filter by logic?
        // Currently 'globalPhrases' is just string[].
        // We can't easily distinguish type without more data.
        // For now, leave global phrases as is or hide them all?
        // User asked "why highlight words saved in English mode when in AI mode".
        // This implies user sees yellow highlights in AI mode.
        // Those are likely 'local' highlights or 'global' ones.
        // Local ones we fixed above.
        // Global ones (from other articles) currently have fixed style:
        // style = { backgroundColor: '#fef9c3', borderBottom: '2px solid #eab308' }
        // This is yellow style.
        
        // If we are in AI mode, maybe we shouldn't show global vocab highlights?
        // But we don't know if a global term is vocab or terminology.
        // Unless we check if it matches a term in current AI extraction? No.
        // We need to know the type of the global phrase.
        // Backend API 'getAllPhraseTexts' returns simple strings.
        // Fix: Update backend to return {text, type} for global phrases?
        // Or for now, just hide global phrases if they don't match current AI mode style preference?
        // Since global highlights are yellow by default code, they look like vocab.
        // Let's hide them in AI mode for now to be safe, assuming most are vocab?
        // Or better: Only show global phrases that match the current mode's intent.
        // Without metadata, we can't filter accurately.
        // Let's just enable global highlights only for English mode for now?
        // Or try to fetch types. 
        // Given constraints, let's hide global yellow highlights in AI mode to respect "don't show vocab".
        
        if (isAiMode) {
             // In AI mode, hide global highlights if we assume they are mostly vocab
             // Ideally we'd show terminology.
             // Let's just hide them to solve the immediate complaint "why yellow highlights".
             return 
        }
        
        // User saved phrases (from other articles): Use GREEN to distinguish from AI-detected terms
        style = { backgroundColor: '#dcfce7', borderBottom: '2px solid #22c55e' } // green-100 bg, green-500 underline
        className += "hover:bg-green-200"
        title = "📚 Saved Vocabulary - Click to view"
        
        // Add click handler for global phrases
        onClick = (e) => {
            e.stopPropagation()
            onGlobalPhraseClick?.(highlightText, e.currentTarget.getBoundingClientRect())
        }
    } else if (r.type === 'ai') {
        // AI-detected terms: Use DASHED underline to distinguish from saved (solid)
        if (isAiMode) {
            // AI/Tech Mode: BLUE dashed underline
            style = { borderBottom: '2px dashed #3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.08)' } // blue-500
            className += "hover:bg-blue-100"
            title = "🤖 AI Term: " + r.payload.definition
        } else {
            // English Learner Mode: YELLOW/AMBER dashed underline
            style = { borderBottom: '2px dashed #f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.08)' } // amber-500
            className += "hover:bg-amber-100"
            title = "📖 Vocabulary: " + r.payload.definition
        }
        
        onClick = (e) => {
            e.stopPropagation()
            onAiTermClick?.(r.payload.term, r.payload.definition, e.currentTarget.getBoundingClientRect())
        }
    }

    segments.push(
      <mark
        key={`${r.type}-${r.start}`}
        id={r.type === 'local' ? `phrase-${r.payload.id}` : undefined}
        style={style}
        className={className}
        title={title}
        onClick={onClick}
      >
        {highlightText}
      </mark>
    )
    
    cursor = r.end
  })

  if (cursor < length) {
    const remainingText = text.slice(cursor)
    segments.push(renderMarkdownText(remainingText, segmentCounter++))
  }

  return segments
}

const VocabularyCard = ({ item, onIgnore, onSave, isAiMode, isSaved: initialSaved = false, onUnsave, onShowFeedback }: { item: VocabularyItem, onIgnore: (term: string) => void, onSave: (item: VocabularyItem) => Promise<void>, isAiMode: boolean, isSaved?: boolean, onUnsave?: (item: VocabularyItem) => Promise<void>, onShowFeedback: (sentence: string, feedback: string, score?: string) => void }) => {
  const { showToast } = useToast()
  const [sentence, setSentence] = useState('')
  const [checking, setChecking] = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [isSaved, setIsSaved] = useState(initialSaved)
  const [phonetic, setPhonetic] = useState<string | null>(null)
  const [loadingPhonetic, setLoadingPhonetic] = useState(false)

  // Sync with props
  useEffect(() => {
      setIsSaved(initialSaved)
  }, [initialSaved])

  // Lazy load phonetic when card is rendered (only for English learner mode)
  useEffect(() => {
    if (isAiMode) return // AI mode doesn't need phonetics
    
    const fetchPhonetic = async () => {
      setLoadingPhonetic(true)
      try {
        const entry = await fetchDictionaryDefinition(item.term)
        if (entry) {
          const ipa = entry.phonetic || entry.phonetics?.find(p => p.text)?.text
          if (ipa) {
            setPhonetic(ipa)
          }
        }
      } catch (e) {
        console.error('Failed to fetch phonetic:', e)
      } finally {
        setLoadingPhonetic(false)
      }
    }
    
    fetchPhonetic()
  }, [item.term, isAiMode])

  // If saved, use GREEN theme to match the highlight color
  const themeClass = isSaved
    ? 'bg-green-50/60 border-green-200 hover:border-green-300'
    : isAiMode 
      ? 'bg-indigo-50/40 border-indigo-100 hover:border-indigo-200' 
      : 'bg-amber-50/40 border-amber-100 hover:border-amber-200'
    
  const textClass = isSaved ? 'text-green-900' : isAiMode ? 'text-indigo-900' : 'text-amber-900'
  const subTextClass = isSaved ? 'text-green-700/70 bg-green-100/50' : isAiMode ? 'text-indigo-700/70 bg-indigo-100/50' : 'text-amber-700/70 bg-amber-100/50'
  const iconClass = isSaved ? 'text-green-400 hover:text-green-600 hover:bg-green-100/50' : isAiMode ? 'text-indigo-300 hover:text-indigo-600 hover:bg-indigo-100/50' : 'text-amber-300 hover:text-amber-600 hover:bg-amber-100/50'
  const buttonClass = isSaved ? 'text-green-500 hover:text-green-700 hover:bg-green-100' : isAiMode ? 'text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100' : 'text-amber-400 hover:text-amber-600 hover:bg-amber-100'

  const handleCheck = async () => {
    if (!sentence.trim()) return
    setChecking(true)
    try {
        const res = await checkSentence(item.term, sentence)
        onShowFeedback(sentence, res.feedback, res.score)
    } catch (e) {
        console.error(e)
        showToast('Check failed, please try again', 'error')
    } finally {
        setChecking(false)
    }
  }

  const handleToggleSave = async () => {
      if (isSaved) {
          if (onUnsave) {
              // Optimistic update
              setIsSaved(false)
              try {
                  // We need to find the phrase ID to delete it.
                  // But 'item' here is VocabularyItem which doesn't have ID.
                  // We rely on parent component to handle the actual deletion logic via onUnsave
                  // or we need to search for it.
                  // Simpler: onUnsave callback handles the logic.
                  await onUnsave(item)
              } catch (e) {
                  console.error("Failed to unsave", e)
                  setIsSaved(true) // Revert
              }
          }
      } else {
      setIsSaved(true)
          try {
              await onSave(item)
          } catch (e) {
              console.error("Failed to save", e)
              setIsSaved(false) // Revert
          }
      }
  }

  return (
    <div className={`${themeClass} rounded-xl p-6 border transition-all group relative`}>
       <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-4 mb-3">
          <h4 className={`text-xl font-bold ${textClass}`}>{item.term}</h4>
          {!isAiMode && (
            loadingPhonetic ? (
              <span className={`text-sm font-mono px-2 py-0.5 rounded ${subTextClass} animate-pulse`}>
                ...
              </span>
            ) : phonetic ? (
              <span className={`text-sm font-mono px-2 py-0.5 rounded ${subTextClass}`}>
                {phonetic}
              </span>
            ) : null
          )}
          
          <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleToggleSave}
                className={`p-1.5 rounded-full transition-colors ${
                    isSaved 
                    ? 'bg-green-100 text-green-600 hover:bg-red-100 hover:text-red-600' 
                    : buttonClass
                }`}
                title={isSaved ? "Saved (Click to unsave)" : "Save to Vocabulary"}
              >
                {isSaved ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                        {/* Show 'X' on hover effect can be done with CSS or just icon swap on hover? Simple icon swap might be tricky without hover state.
                            Let's keep checkmark but make it red on hover.
                        */}
                    </svg>
                ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                )}
              </button>
              
              <button 
                 onClick={() => onIgnore(item.term)}
                 className={`p-1.5 rounded-full transition-colors ${iconClass}`}
                 title="Dismiss (Don't show again)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
          </div>
       </div>
       
       <div className="flex flex-col gap-4">
           <div>
                <p className={`${textClass}/90 font-medium leading-relaxed mb-2`}>{item.definition}</p>
                <div className="bg-white/60 rounded-lg p-3 text-slate-700 italic border-l-4 border-slate-200 text-lg">
                    "{item.example}"
                </div>
           </div>

           {/* Interactive Section */}
           {!isAiMode && (
           <div className="mt-2">
               {!showInput ? (
                   <button 
                     onClick={() => setShowInput(true)}
                     className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 uppercase tracking-wide"
                   >
                     <span className="text-lg">+</span> Sentence Practice (Make a Sentence)
                   </button>
               ) : (
                   <div className="bg-white p-4 rounded-lg border border-amber-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                       <p className="text-xs font-bold text-amber-800/60 mb-2 uppercase tracking-wider">YOUR SENTENCE</p>
                       <div className="flex gap-2 mb-3">
                           <input 
                               type="text" 
                               value={sentence}
                               onChange={e => setSentence(e.target.value)}
                               placeholder={`Try using "${item.term}" in a sentence...`}
                               className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent"
                               onKeyDown={e => e.key === 'Enter' && handleCheck()}
                           />
                           <button 
                               onClick={handleCheck}
                               disabled={checking || !sentence.trim()}
                               className="bg-amber-400 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
                           >
                               {checking ? 'Analyzing...' : 'Check'}
                           </button>
                       </div>
                   </div>
               )}
           </div>
           )}
       </div>
    </div>
  )
}

// Saved phrase card with lazy-loaded phonetic
const SavedPhraseCard = ({ phrase, onDelete, isEnglishLearner }: { phrase: PhraseRecord, onDelete: (id: number) => void, isEnglishLearner: boolean }) => {
  const [phonetic, setPhonetic] = useState<string | null>(null)
  const [loadingPhonetic, setLoadingPhonetic] = useState(false)

  // Lazy load phonetic for English learner mode
  useEffect(() => {
    if (!isEnglishLearner) return
    
    const fetchPhonetic = async () => {
      setLoadingPhonetic(true)
      try {
        const entry = await fetchDictionaryDefinition(phrase.text)
        if (entry) {
          const ipa = entry.phonetic || entry.phonetics?.find(p => p.text)?.text
          if (ipa) {
            setPhonetic(ipa)
          }
        }
      } catch (e) {
        console.error('Failed to fetch phonetic:', e)
      } finally {
        setLoadingPhonetic(false)
      }
    }
    
    fetchPhonetic()
  }, [phrase.text, isEnglishLearner])

  return (
    <div className="bg-green-50/50 p-4 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-all group hover:border-green-300">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h4 className="font-bold text-green-900 text-lg">{phrase.text}</h4>
          {isEnglishLearner && (
            loadingPhonetic ? (
              <span className="text-sm font-mono text-green-600/60 animate-pulse">...</span>
            ) : phonetic ? (
              <span className="text-sm font-mono text-green-600/80">{phonetic}</span>
            ) : null
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-400/80">
            {format(new Date(phrase.created_at), 'MM/dd')}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(phrase.id)
            }}
            className="p-1 rounded-full hover:bg-green-100 text-green-400 hover:text-red-500 transition-colors"
            title="Remove"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {phrase.note && (
        <div className="text-green-800/80 text-sm mb-3 bg-white/60 p-2 rounded border border-green-100 prose prose-sm max-w-none">
          <ReactMarkdown>{phrase.note}</ReactMarkdown>
        </div>
      )}
      {(phrase.context_before || phrase.context_after) && (
        <div className="text-xs text-slate-500 italic border-l-2 border-green-300 pl-2 line-clamp-2 group-hover:line-clamp-none transition-all">
          ...{phrase.context_before} 
          <span className="font-bold text-green-700">{phrase.text}</span> 
          {phrase.context_after}...
        </div>
      )}
    </div>
  )
}

interface TermPopupState {
  term: string
  definition: string
  top: number
  left: number
  phraseId?: number  // If set, this is a saved phrase that can be deleted
  isSaved?: boolean  // Whether this term is already saved
}

interface FeedbackState {
  sentence: string
  feedback: string
  score?: string
}

export default function NewsDetailPageClient({ newsId }: NewsDetailPageClientProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    isDestructive?: boolean
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const { isEnglishLearner, mode } = useUserPreferences()
  
  const [feedbackState, setFeedbackState] = useState<FeedbackState | null>(null)
  
  const [news, setNews] = useState<NewsRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [analysisData, setAnalysisData] = useState<{
    summary?: string
    structure?: ArticleStructure
    vocabulary?: VocabularyItem[]
  }>({})
  const [analysisErrors, setAnalysisErrors] = useState<Partial<Record<AnalysisScope, string>>>({})
  const [loadingScopes, setLoadingScopes] = useState<Record<AnalysisScope, boolean>>({
    summary: false,
    structure: false,
    vocabulary: false,
  })
  const [phrases, setPhrases] = useState<PhraseRecord[]>([])
  const [globalPhrases, setGlobalPhrases] = useState<string[]>([])
  const [selectedText, setSelectedText] = useState('')
  const [note, setNote] = useState('')
  const [saveType, setSaveType] = useState<'vocabulary' | 'content'>('vocabulary')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false)
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenu | null>(null)
  const [termPopup, setTermPopup] = useState<TermPopupState | null>(null)
  const [selectionMeta, setSelectionMeta] = useState<SelectionMeta | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [explaining, setExplaining] = useState(false)
  const [refetching, setRefetching] = useState(false)
  const [ignoredTerms, setIgnoredTerms] = useState<string[]>([])

  // Audio State
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [subtitles, setSubtitles] = useState<any[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [currentAudioTime, setCurrentAudioTime] = useState(-1)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const articleRef = useRef<HTMLDivElement>(null)
  const hasGeneratedVocab = useRef(false)
  const hasGeneratedSummary = useRef(false)

  const [activeTab, setActiveTab] = useState<'article' | 'structure' | 'vocabulary' | 'quiz'>('article')

  const articleText = news?.content_raw || news?.summary || ''
  const structureData = analysisData.structure ? normalizeStructurePayload(analysisData.structure) : undefined
  const structureTree = structureData?.root
  const hasStructureGraph = Boolean(structureTree)

  useEffect(() => {
    loadNews()
  }, [newsId])

  // Reset analysis when mode changes
  useEffect(() => {
    setAnalysisData({})
    setAnalysisErrors({})
    hasGeneratedVocab.current = false
    hasGeneratedSummary.current = false
  }, [mode])

  // Auto-generate content on first load
  useEffect(() => {
    if (!news) return

    // 1. Vocabulary (Top Priority for English Learners, but we want both)
    if (!analysisData.vocabulary && !hasGeneratedVocab.current) {
        hasGeneratedVocab.current = true
        handleAnalyze('vocabulary')
    }

    // 2. Summary (Always generate)
    if (!analysisData.summary && !hasGeneratedSummary.current) {
        hasGeneratedSummary.current = true
        handleAnalyze('summary')
    }
  }, [news, analysisData.vocabulary, analysisData.summary])

  useEffect(() => {
    loadPhrases()
    loadGlobalPhrases()
    // Load ignored terms from local storage
    try {
        const saved = localStorage.getItem('ignored_vocabulary')
        if (saved) {
            setIgnoredTerms(JSON.parse(saved))
        }
    } catch (e) {
        console.error('Failed to load ignored terms', e)
    }
  }, [newsId])

  const handleIgnoreTerm = (term: string) => {
    if (!term) return
    const next = [...ignoredTerms, term]
    setIgnoredTerms(next)
    localStorage.setItem('ignored_vocabulary', JSON.stringify(next))
  }

  // Clean up audio URL on unmount or news change
  useEffect(() => {
    return () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [newsId, audioUrl])

  // Audio control effect
  useEffect(() => {
    if (audioUrl && audioRef.current) {
        audioRef.current.src = audioUrl
        if (isPlaying) {
            audioRef.current.play().catch(e => {
                console.error("Auto-play failed", e)
                setIsPlaying(false)
            })
        }
    }
  }, [audioUrl]) // Trigger when URL changes

  const handleToggleAudio = async () => {
    if (isPlaying) {
        audioRef.current?.pause()
        setIsPlaying(false)
        return
    }

    if (audioUrl) {
        audioRef.current?.play().catch(e => {
            console.error("Resume failed", e)
            setIsPlaying(false)
        })
        setIsPlaying(true)
        return
    }

    // Generate new
    if (!articleText) return
    setIsGeneratingAudio(true)
    try {
        // Use a safe limit for sync API (though backend handles 4000)
        const textToRead = articleText.length > 4000 ? articleText.slice(0, 4000) + "..." : articleText
        const res = await generateTTS(textToRead)
        
        // Decode base64
        const binaryString = atob(res.audio)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes.buffer], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        
        setAudioBlob(blob)
        setAudioUrl(url)
        
        // Subtitles are usually in a slightly complex JSON format. 
        // Check MiniMax response structure: {"subtitles": [...]} 
        // We assume backend extracted and passed it directly.
        if (res.subtitles) {
            // Flatten if necessary or use as is.
            // Assuming list of {text, begin_time, end_time}
            setSubtitles(res.subtitles)
        }
        
        setIsPlaying(true) 
    } catch (error) {
        console.error("TTS Generation failed", error)
        showToast("Failed to generate audio, please try again later", 'error')
    } finally {
        setIsGeneratingAudio(false)
    }
  }

  const handleAudioTimeUpdate = () => {
      if (audioRef.current) {
          setCurrentAudioTime(audioRef.current.currentTime)
      }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    setCurrentAudioTime(-1)
  }

  useEffect(() => {
    let lastScrollY = window.scrollY
    const hideMenu = () => {
        // Only hide if scrolled more than 10px to avoid closing on micro-scrolls
        const scrollDelta = Math.abs(window.scrollY - lastScrollY)
        if (scrollDelta > 10) {
            setSelectionMenu(null)
            setTermPopup(null)
            lastScrollY = window.scrollY
        }
    }
    window.addEventListener('scroll', hideMenu, true)
    return () => window.removeEventListener('scroll', hideMenu, true)
  }, [])

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

  const loadPhrases = async () => {
    try {
      const response = await getPhrases({ news_id: newsId })
      setPhrases(response.phrases || [])
    } catch (error) {
      console.error('Failed to load phrases:', error)
    }
  }

  const loadGlobalPhrases = async () => {
    try {
      const response = await getAllPhraseTexts()
      setGlobalPhrases(response.texts || [])
    } catch (error) {
      console.error('Failed to load global phrases:', error)
    }
  }

  const handleAnalyze = async (scope: AnalysisScope, forceRefresh: boolean = false) => {
    setLoadingScopes(prev => ({ ...prev, [scope]: true }))
    setAnalysisErrors((prev) => {
      const next = { ...prev }
      delete next[scope]
      return next
    })

    // If we already have data for this scope and user clicks the button again,
    // treat it as a "Re-analyze" request with force=true to skip cache
    const shouldForce = forceRefresh || (
      (scope === 'summary' && !!analysisData.summary) ||
      (scope === 'structure' && !!analysisData.structure) ||
      (scope === 'vocabulary' && !!analysisData.vocabulary)
    )

    try {
      const result = await analyzeArticle(newsId, scope, mode, shouldForce)
      if (result.status === 'success') {
        const payload = result.analysis

        if ('error' in payload && payload.error) {
          setAnalysisErrors((prev) => ({ ...prev, [scope]: payload.error }))
          return
        }

        setAnalysisData((prev) => {
          if (payload.scope === 'summary' && 'summary' in payload) {
            return { ...prev, summary: payload.summary }
          }
          if (payload.scope === 'structure' && 'structure' in payload) {
            return { ...prev, structure: normalizeStructurePayload(payload.structure) }
          }
          if (payload.scope === 'vocabulary' && 'vocabulary' in payload) {
            return { ...prev, vocabulary: payload.vocabulary }
          }
          return prev
        })
      }
    } catch (error) {
      console.error('Failed to analyze article:', error)
      const message = error instanceof Error ? error.message : 'AI analysis failed, please try again later'
      setAnalysisErrors((prev) => ({ ...prev, [scope]: message }))
    } finally {
      setLoadingScopes(prev => ({ ...prev, [scope]: false }))
    }
  }

  const handleRefetch = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Re-fetch Article',
      message: 'Are you sure you want to re-fetch this article? This will overwrite current content and analysis.',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
        setRefetching(true)
        try {
            const result = await refetchNews(newsId)
            if (result.status === 'success') {
                // Reload news details
                await loadNews()
            }
        } catch (error) {
            console.error('Refetch failed:', error)
            showToast('Re-fetch failed, please try again later', 'error')
        } finally {
            setRefetching(false)
        }
      }
    })
  }

  const computeSelectionMeta = (selection: SelectionMenu): SelectionMeta | null => {
    if (!articleText) return null
    const before = articleText.slice(Math.max(0, selection.start - 80), selection.start)
    const after = articleText.slice(selection.end, Math.min(articleText.length, selection.end + 80))
    return {
      start: selection.start,
      end: selection.end,
      context_before: before,
      context_after: after,
    }
  }

  const detectTextType = (text: string): 'vocabulary' | 'content' => {
    // Simple heuristic rules
    const wordCount = text.trim().split(/\s+/).length
    // Punctuation that usually indicates a clause or sentence
    const hasPunctuation = /[.?!,;:]/.test(text)
    
    // If it has multiple words (e.g. > 3) OR has sentence punctuation OR is long enough
    if (wordCount > 3 || hasPunctuation || text.length > 30) {
      return 'content'
    }
    return 'vocabulary'
  }


  // Handle selection change only for clearing menu when selection is lost
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        setSelectionMenu(null)
      }
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

  const handleTextSelection = () => {
    if (explaining || showSaveDialog) return

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setSelectionMenu(null)
      return
    }

    const text = selection.toString().trim()
    if (!text) {
      setSelectionMenu(null)
      return
    }

    // Check if selection is within article body
    const range = selection.getRangeAt(0)
    let container = range.commonAncestorContainer
    if (container.nodeType === 3) { // Text node
      container = container.parentNode!
    }
    
    if (!articleRef.current || !articleRef.current.contains(container)) {
      setSelectionMenu(null)
      return
    }

    const rect = range.getBoundingClientRect()
    
    // Calculate offsets relative to article content
    const preSelectionRange = range.cloneRange()
    preSelectionRange.selectNodeContents(articleRef.current)
    preSelectionRange.setEnd(range.startContainer, range.startOffset)
    const start = preSelectionRange.toString().length
    const end = start + text.length

    setSelectionMenu({
      text,
      top: rect.top + window.scrollY - 52,
      left: rect.left + window.scrollX + rect.width / 2,
      start,
      end,
    })
  }


  const handleCopySelection = async () => {
    if (!selectionMenu) return
    await navigator.clipboard.writeText(selectionMenu.text)
    setSelectionMenu(null)
  }

  const handleExplainSelection = async () => {
    if (!selectionMenu) return
    const textToExplain = selectionMenu.text // Capture text
    
    setExplaining(true)
    setExplanation(null) 
    setSelectionMenu(null)
    
    try {
      const result = await explainSnippet(newsId, textToExplain, isEnglishLearner ? 'english_learner' : 'ai_learner')
      if (result.status === 'success') {
        setExplanation(result.explanation)
      } else {
        throw new Error('API returned error status')
      }
    } catch (error) {
      console.error('Failed to explain text:', error)
      showToast('Explanation failed, please try again later', 'error')
      setExplaining(false)
    }
  }

  const openSaveDialog = async () => {
    if (!selectionMenu) return
    const text = selectionMenu.text
    setSelectedText(text)
    setNote('') // 清空之前的 note
    
    // Use helper to detect type
    setSaveType(detectTextType(text))
    
    const meta = computeSelectionMeta(selectionMenu)
    setSelectionMeta(meta)
    setShowSaveDialog(true)
    setSelectionMenu(null)
    
    // 自动获取词汇释义（仅对英语学习模式且是单词/短语时）
    if (isEnglishLearner && text.split(/\s+/).length <= 3) {
      setIsLoadingDefinition(true)
      try {
        // 先尝试免费词典 API（更快）
        const dictEntry = await fetchDictionaryDefinition(text)
        if (dictEntry) {
          const formatted = formatDictionaryDefinition(dictEntry)
          setNote(formatted)
        } else {
          // 如果免费词典没找到，用 AI 定义
          const aiResult = await defineWord(text)
          if (aiResult.status === 'success' && aiResult.definition) {
            setNote(aiResult.definition)
          }
        }
      } catch (error) {
        console.error('Failed to fetch definition:', error)
        // 静默失败，用户可以手动输入
      } finally {
        setIsLoadingDefinition(false)
      }
    }
  }

  const handleSavePhrase = async () => {
    if (!selectedText) return
    try {
      await savePhrase({
        news_id: newsId,
        text: selectedText,
        note: note || undefined,
        context_before: selectionMeta?.context_before,
        context_after: selectionMeta?.context_after,
        start_offset: selectionMeta?.start,
        end_offset: selectionMeta?.end,
        color: isEnglishLearner ? VOCAB_HIGHLIGHT_COLOR : TERM_HIGHLIGHT_COLOR,
        type: isEnglishLearner ? 'vocabulary' : 'terminology',
      })
      
      setShowSaveDialog(false)
      setSelectedText('')
      setNote('')
      setSelectionMeta(null)
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
      
      await loadPhrases()
    } catch (error) {
      console.error('Failed to save phrase:', error)
      showToast('Save failed', 'error')
    }
  }

  const handleSaveVocabularyItem = async (item: VocabularyItem) => {
    try {
        await savePhrase({
            news_id: newsId,
            text: item.term,
            note: item.definition, // Use definition as initial note
            context_before: '', 
            context_after: '',
            // We don't have precise offsets for AI terms unless we search, 
            // but we can just save it as a "global" phrase without offsets for now.
            color: isEnglishLearner ? VOCAB_HIGHLIGHT_COLOR : TERM_HIGHLIGHT_COLOR,
            type: isEnglishLearner ? 'vocabulary' : 'terminology'
        })
        
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2000)
        
        // Reload both local and global phrases to update highlights
        await Promise.all([loadPhrases(), loadGlobalPhrases()])
    } catch (error) {
        console.error('Failed to save vocabulary item:', error)
        showToast('Save failed', 'error')
    }
  }

  const handleUnsaveVocabularyItem = async (item: VocabularyItem) => {
      try {
          // Find the phrase ID
          // We might have duplicates if saved multiple times, delete the first match
          const phrase = phrases.find(p => p.text.toLowerCase() === item.term.toLowerCase())
          if (phrase) {
              await deletePhrase(phrase.id)
              // Reload both local and global phrases to update highlights
              await Promise.all([loadPhrases(), loadGlobalPhrases()])
          }
      } catch (error) {
          console.error('Failed to unsave:', error)
          showToast('Failed to unsave', 'error')
    }
  }

  const handleDeletePhrase = async (phraseId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Phrase',
      message: 'Are you sure you want to remove this from your collection?',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
        try {
          await deletePhrase(phraseId)
          await loadPhrases()
        } catch (error) {
          console.error('Failed to delete phrase:', error)
          showToast('Failed to delete phrase', 'error')
        }
      }
    })
  }

  const handleAiTermClick = (term: string, definition: string, rect: DOMRect) => {
      // Close other menus
      setSelectionMenu(null)
      
      setTermPopup({
          term,
          definition,
          top: rect.bottom + window.scrollY + 8, // Position below the term
          left: rect.left + window.scrollX + rect.width / 2
      })
  }

  const handleLocalPhraseClick = (phraseId: number, term: string, note: string, rect: DOMRect) => {
      // Close other menus
      setSelectionMenu(null)
      
      setTermPopup({
          term,
          definition: note || 'No notes saved for this phrase.',
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX + rect.width / 2,
          phraseId,
          isSaved: true
      })
  }

  const handleGlobalPhraseClick = (term: string, rect: DOMRect) => {
      // Close other menus
      setSelectionMenu(null)
      
      // Find the phrase in the global phrases list to get its ID
      // Global phrases come from all saved phrases, so we need to look them up
      const matchingPhrase = phrases.find(p => p.text.toLowerCase() === term.toLowerCase())
      
      setTermPopup({
          term,
          definition: matchingPhrase?.note || 'Saved vocabulary from your learning library.',
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX + rect.width / 2,
          phraseId: matchingPhrase?.id,
          isSaved: true
      })
  }

  const highlightedContent = useMemo(() => {
    return renderHighlightedContent(
        articleText, 
        phrases, 
        globalPhrases, 
        analysisData.vocabulary || [], 
        ignoredTerms,
        currentAudioTime,
        subtitles,
        !isEnglishLearner, // isAiMode
        handleAiTermClick,
        handleLocalPhraseClick,
        handleGlobalPhraseClick
    )
  }, [articleText, phrases, globalPhrases, analysisData.vocabulary, ignoredTerms, currentAudioTime, subtitles, isEnglishLearner])

  const closeDialog = () => {
    setShowSaveDialog(false)
    setSelectedText('')
    setNote('')
    setSelectionMeta(null)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading article...</p>
        </div>
      </div>
    )
  }

  if (!news) {
    return (
      <div className="container mx-auto px-6 py-8">
        <p className="text-gray-600">Article not found</p>
      </div>
    )
  }

  const dateObj = new Date(news.date)
  const formattedDate = format(dateObj, 'MMMM dd, yyyy')
  const categoryLabel = getNewsCategoryLabel(news.category || 'general')

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl relative z-10">
      {/* Back Button */}
      <div className="mb-6">
        <button 
          onClick={() => router.push('/')}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to List
        </button>
      </div>

      {/* Header */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">{news.title}</h1>

        <div className="flex items-center gap-4 mt-4 text-gray-600 flex-wrap text-sm">
          <span className="font-medium text-primary">{news.source}</span>
          <span>•</span>
          <span>{formattedDate}</span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {categoryLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content Column - Full Width now effectively handled by tabs */}
        <div className="w-full space-y-6">
            
            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('article')}
                    className={`px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
                        activeTab === 'article' 
                        ? 'text-primary border-b-2 border-primary' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Article
                </button>
                <button
                    onClick={() => {
                        setActiveTab('structure')
                        if (!analysisData.structure) handleAnalyze('structure')
                    }}
                    className={`px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
                        activeTab === 'structure' 
                        ? 'text-primary border-b-2 border-primary' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Structure
                </button>
                <button
                    onClick={() => {
                        setActiveTab('vocabulary')
                        if (!analysisData.vocabulary) handleAnalyze('vocabulary')
                    }}
                    className={`px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
                        activeTab === 'vocabulary' 
                        ? 'text-primary border-b-2 border-primary' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    {isEnglishLearner ? 'Vocabulary' : 'Core Terms'}
                </button>
                <button
                    onClick={() => setActiveTab('quiz')}
                    className={`px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
                        activeTab === 'quiz' 
                        ? 'text-primary border-b-2 border-primary' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <span className="flex items-center gap-1.5">
                        {isEnglishLearner ? 'Comprehension Quiz' : 'Insight Check'}
                        <span className="px-1.5 py-0.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] rounded-full font-bold">NEW</span>
                    </span>
                </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[500px]">
                {activeTab === 'article' && (
                    <div className="space-y-8 animate-in fade-in duration-300">

                        {/* AI Summary Section - Visible if generated or loading */}
                        {(analysisData.summary || loadingScopes.summary) && (
                            <div className="mb-8 bg-blue-50/50 rounded-2xl p-6 border border-blue-100 relative overflow-hidden">
                                {/* Decoration */}
                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600">
                                    <path d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z"/>
                                </svg>
                                </div>

                                        <div className="flex justify-between items-start mb-4 relative z-10">
                                            <h3 className="text-blue-900 font-bold text-lg flex items-center gap-2">
                                                <span className="w-1 h-5 bg-blue-500 rounded-full block"></span>
                                                AI Smart Summary
                                            </h3>
                                            <button 
                                                onClick={() => handleAnalyze('summary')}
                                                disabled={loadingScopes.summary}
                                                className="text-blue-600 hover:text-blue-700 text-xs font-medium bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-full transition disabled:opacity-50"
                                            >
                                                {analysisData.summary ? 'Regenerate' : 'Generate Summary'}
                                            </button>
                                        </div>

                                {analysisData.summary ? (
                                <div className="text-blue-900/80 text-base leading-relaxed whitespace-pre-wrap font-medium relative z-10">
                                    {analysisData.summary}
                                </div>
                                ) : (
                                <div className="text-blue-500 text-sm italic flex items-center gap-3 py-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                    </span>
                                    AI is reading and generating summary, please wait...
                                </div>
                                )}
                        </div>
                        )}
                         
                         {/* English Learner: Quick Vocab Hint */}
                         {isEnglishLearner && analysisData.vocabulary && (
                             <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition" onClick={() => setActiveTab('vocabulary')}>
                                <div className="flex items-center gap-3">
                                    <span className="bg-amber-200 text-amber-800 p-2 rounded-lg">📚</span>
                                    <div>
                                        <p className="text-amber-900 font-bold text-sm">Found {analysisData.vocabulary.length} key vocabularies</p>
                                        <p className="text-amber-700 text-xs">Click to view full list</p>
                                    </div>
                                </div>
                                <span className="text-amber-500">→</span>
                             </div>
                         )}

                         {/* AI Learner: Tech Terms Hint */}
                         {!isEnglishLearner && analysisData.vocabulary && (
                             <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 flex items-center justify-between cursor-pointer hover:bg-indigo-100 transition" onClick={() => setActiveTab('vocabulary')}>
                                <div className="flex items-center gap-3">
                                    <span className="bg-indigo-200 text-indigo-800 p-2 rounded-lg">🧠</span>
                                    <div>
                                        <p className="text-indigo-900 font-bold text-sm">Extracted {analysisData.vocabulary.length} core AI terms</p>
                                        <p className="text-indigo-700 text-xs">Click to view analysis</p>
                                    </div>
                                </div>
                                <span className="text-indigo-500">→</span>
                             </div>
                         )}

            {/* Action Bar */}
                        <div className="flex gap-3 flex-wrap justify-end items-center">
                {/* Hidden Audio Element */}
                <audio 
                    ref={audioRef} 
                    onEnded={handleAudioEnded} 
                    onTimeUpdate={handleAudioTimeUpdate}
                    className="hidden" 
                />
                
                <button
                  onClick={handleToggleAudio}
                  disabled={isGeneratingAudio}
                  className={`btn px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all border ${
                      isPlaying 
                      ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {isGeneratingAudio ? (
                    <>
                        <span className="animate-spin h-3 w-3 border-2 border-current border-r-transparent rounded-full"></span>
                        Generating...
                    </>
                  ) : isPlaying ? (
                    <>
                        <span className="relative flex h-2 w-2 mr-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                        Stop Reading
                    </>
                  ) : (
                    <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 5L6 9H2v6h4l5 4V5z" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                        Read Aloud
                    </>
                  )}
                </button>

                <button
                  onClick={handleRefetch}
                  disabled={refetching}
                  className="btn btn-secondary px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                >
                  {refetching ? (
                    <>
                        <span className="animate-spin h-3 w-3 border-2 border-gray-500 border-r-transparent rounded-full"></span>
                        Fetching...
                    </>
                  ) : (
                    <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                            <path d="M16 16h5v5" />
                        </svg>
                        Re-fetch
                    </>
                  )}
                </button>
                <a
                  href={news.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary px-4 py-2 rounded-lg text-sm"
                >
                  View Original ↗
                </a>
            </div>

            {/* Article Body */}
            <div className="prose prose-lg max-w-none relative" onMouseUp={handleTextSelection} onKeyUp={handleTextSelection}>
                
                {loadingScopes.vocabulary && (
                    <div className="absolute top-4 right-4 animate-in fade-in slide-in-from-top-2 z-20 pointer-events-none">
                        <div className={`backdrop-blur text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 border shadow-sm ${
                            isEnglishLearner 
                            ? 'bg-amber-50/90 text-amber-700 border-amber-100' 
                            : 'bg-indigo-50/90 text-indigo-700 border-indigo-100'
                        }`}>
                            <div className={`w-2 h-2 rounded-full animate-ping ${isEnglishLearner ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                            {isEnglishLearner ? 'Mining key vocabulary...' : 'Extracting core terms...'}
                        </div>
                    </div>
                )}
                <div ref={articleRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 leading-loose text-gray-800 whitespace-pre-wrap break-words relative selection:bg-yellow-200 selection:text-gray-900 font-serif text-lg space-y-8 text-justify">
                {articleText ? (
                    <>{highlightedContent}</>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-500 mb-4">Full text not available, showing summary only.</p>
                        <p className="font-medium text-gray-700 italic bg-gray-50 p-4 rounded-lg">{news.summary}</p>
                    </div>
                )}
                </div>
                {termPopup && (
                  <div
                    className="fixed z-50 -translate-x-1/2 w-72"
                    style={{ top: termPopup.top, left: termPopup.left }}
                  >
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-100 p-4 animate-in zoom-in duration-200 slide-in-from-top-2">
                        <div className="flex items-start justify-between mb-2">
                            <h4 className="font-bold text-slate-900">{termPopup.term}</h4>
                            <button 
                                onClick={() => setTermPopup(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-sm text-slate-600 mb-4 leading-relaxed">{termPopup.definition}</p>
                        
                        {termPopup.isSaved && termPopup.phraseId ? (
                            // Show delete button for saved phrases
                            <button
                                onClick={async () => {
                                    try {
                                        await deletePhrase(termPopup.phraseId!)
                                        await loadPhrases()
                                        showToast('Removed from saved words', 'success')
                                    } catch (error) {
                                        console.error('Failed to delete phrase:', error)
                                        showToast('Failed to remove', 'error')
                                    }
                                    setTermPopup(null)
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded-lg text-sm font-bold transition-colors"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Remove Highlight
                            </button>
                        ) : (
                            // Show save button for new terms - GREEN to match saved highlight color
                            <button
                                onClick={() => {
                                    handleSaveVocabularyItem({ 
                                        term: termPopup.term, 
                                        definition: termPopup.definition, 
                                        example: '' 
                                    })
                                    setTermPopup(null)
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-600 hover:bg-green-100 py-2 rounded-lg text-sm font-bold transition-colors"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                </svg>
                                Save to {isEnglishLearner ? 'Vocabulary' : 'Terminology'}
                            </button>
                        )}
                    </div>
                    
                    {/* Arrow */}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white transform rotate-45 border-t border-l border-slate-100"></div>
                  </div>
                )}

                {selectionMenu && (
                  <div
                    className="fixed z-50 -translate-x-1/2 flex gap-1 bg-white rounded-lg shadow-xl border border-gray-100 p-1 animate-in zoom-in duration-200"
                    style={{ top: selectionMenu.top, left: selectionMenu.left }}
                    onMouseDown={(e) => e.preventDefault()} // Prevent losing selection on click
                  >
                    <button
                      onClick={handleCopySelection}
                      className="p-2 hover:bg-gray-50 rounded text-gray-600 hover:text-gray-900"
                      title="Copy"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                    <div className="w-px bg-gray-200 my-1"></div>
                    <button
                      onClick={handleExplainSelection}
                      className="px-3 py-1 hover:bg-blue-50 rounded text-sm font-medium text-blue-600 flex items-center gap-1"
                    >
                      <span className="text-lg">💡</span> Explain
                    </button>
                    <div className="w-px bg-gray-200 my-1"></div>
                    <button
                      onClick={openSaveDialog}
                      className="px-3 py-1 hover:bg-yellow-50 rounded text-sm font-medium text-amber-600 flex items-center gap-1"
                    >
                      <span className="text-lg">🔖</span> Save
                    </button>
                    
                    {/* Arrow */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white transform rotate-45 border-b border-r border-gray-100"></div>
                  </div>
                )}
            </div>

            {/* Explanation Dialog */}
            {(explanation || explaining) && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
                 <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative max-h-[80vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                    <button 
                      onClick={() => {
                          setExplanation(null)
                          setExplaining(false)
                      }}
                      className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1 transition-colors"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                  </button>
                    
                    <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                      💡 Smart Analysis
                    </h3>
                    
                    {explaining && !explanation ? (
                        <div className="py-12 text-center space-y-4">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-r-transparent"></div>
                            <p className="text-gray-500 text-sm animate-pulse">AI is thinking, please wait...</p>
                </div>
                    ) : (
                        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed prose-headings:text-gray-900 prose-strong:text-blue-700">
                           <ReactMarkdown>{explanation || ''}</ReactMarkdown>
                        </div>
                    )}
                 </div>
              </div>
            )}
        </div>
                )}

                {activeTab === 'structure' && (
                    <div className="space-y-8 animate-in fade-in duration-300 max-w-5xl mx-auto">
                        <div className="flex flex-col gap-4 rounded-3xl border border-purple-200/40 bg-white p-6 shadow-sm ring-1 ring-purple-100/40 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-xs font-semibold tracking-[0.4em] text-purple-500">STRUCTURE</p>
                                <h3 className="mt-2 text-2xl font-bold text-slate-900">Logic Flow · Mind Map</h3>
                                <p className="text-sm text-slate-500">
                                    Automatically identify core arguments, evidence chains, and reasoning paths to generate a visualized knowledge graph.
                                </p>
                            </div>
                            <button
                                onClick={() => handleAnalyze('structure')}
                                disabled={loadingScopes.structure}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loadingScopes.structure ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                                        Analyzing...
                                    </>
                                ) : hasStructureGraph ? (
                                    'Re-analyze'
                                ) : (
                                    'Start Analysis'
                                )}
                            </button>
                        </div>

                        {analysisErrors.structure && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">
                                {analysisErrors.structure}
                            </div>
                        )}

                        {structureTree ? (
                            <div className="space-y-12">
                                {/* Tree Visualization */}
                                <div className="relative pl-4 md:pl-0">
                                    <StructureNodeTree node={structureTree} />
                                </div>

                                {/* Key Takeaways */}
                                <StructureConclusion takeaways={structureData?.takeaways} />
                            </div>
                        ) : (

                            <div className="text-center py-24 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-purple-300">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                                    </svg>
                                </div>
                                <h4 className="text-gray-900 font-medium mb-2">Ready to Analyze Structure</h4>
                                <p className="text-gray-500 text-sm max-w-md mx-auto">
                                    AI will deconstruct the argumentation logic, core viewpoints, and supporting evidence to generate a visualized mind map.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'vocabulary' && (
                    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
                        
                        {/* Section 1: My Saved Phrases */}
                        <section>
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <span className="w-1 h-6 rounded-full block bg-green-500"></span>
                                My Collection ({
                                    isEnglishLearner 
                                    ? phrases.filter(p => !p.color?.includes('e0e7ff') && p.type !== 'terminology').length
                                    : phrases.filter(p => p.color?.includes('e0e7ff') || p.type === 'terminology').length
                                })
                            </h3>
                            
                            {/* Show Terminology Group Only in AI Mode */}
                            {!isEnglishLearner && phrases.filter(p => p.color?.includes('e0e7ff') || p.type === 'terminology').length > 0 && (
                                <div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {phrases
                                            .filter(p => p.color?.includes('e0e7ff') || p.type === 'terminology')
                                            .map((phrase) => (
                                              <SavedPhraseCard 
                                                key={phrase.id} 
                                                phrase={phrase} 
                                                onDelete={handleDeletePhrase}
                                                isEnglishLearner={isEnglishLearner}
                                              />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Show Vocabulary Group Only in English Mode */}
                            {isEnglishLearner && phrases.filter(p => !p.color?.includes('e0e7ff') && p.type !== 'terminology').length > 0 && (
                                <div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {phrases
                                            .filter(p => !p.color?.includes('e0e7ff') && p.type !== 'terminology')
                                            .map((phrase) => (
                                              <SavedPhraseCard 
                                                key={phrase.id} 
                                                phrase={phrase} 
                                                onDelete={handleDeletePhrase}
                                                isEnglishLearner={isEnglishLearner}
                                              />
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Empty State for current mode */}
                            {(isEnglishLearner 
                                ? phrases.filter(p => !p.color?.includes('e0e7ff') && p.type !== 'terminology').length === 0
                                : phrases.filter(p => p.color?.includes('e0e7ff') || p.type === 'terminology').length === 0
                            ) && (
                                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm text-gray-500">
                                    {isEnglishLearner ? 'No saved vocabulary' : 'No saved terms'}
                                </div>
                            )}
                        </section>

                        <hr className="border-gray-100" />

                        {/* Section 2: AI Suggested Vocabulary */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <span className={`w-1 h-6 rounded-full block ${isEnglishLearner ? 'bg-amber-500' : 'bg-indigo-500'}`}></span>
                                    {isEnglishLearner ? 'AI Vocabulary Recommendations' : 'AI Core Term Analysis'}
                                </h3>
                                <button
                                    onClick={() => handleAnalyze('vocabulary')}
                                    disabled={loadingScopes.vocabulary}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 transition ${
                                        isEnglishLearner 
                                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                                        : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                                    }`}
                                >
                                    {loadingScopes.vocabulary ? 'Mining...' : (analysisData.vocabulary ? 'Re-mine' : (isEnglishLearner ? 'Mine Vocabulary' : 'Extract Terms'))}
                                </button>
                            </div>

                            {analysisErrors.vocabulary && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm mb-4">
                                    {analysisErrors.vocabulary}
                                </div>
                            )}

                            {analysisData.vocabulary ? (
                                <div className="grid grid-cols-1 gap-6">
                                    {analysisData.vocabulary
                                      .filter(item => !ignoredTerms.includes(item.term))
                                      .map((item, idx) => {
                                          // Check if already saved
                                          const isAlreadySaved = phrases.some(p => p.text.toLowerCase() === item.term.toLowerCase())
                                          
                                          return (
                                            <VocabularyCard 
                                                key={idx} 
                                                item={item} 
                                                onIgnore={handleIgnoreTerm} 
                                                onSave={handleSaveVocabularyItem}
                                                onUnsave={handleUnsaveVocabularyItem}
                                                isAiMode={!isEnglishLearner}
                                                isSaved={isAlreadySaved}
                                                onShowFeedback={(sentence, feedback, score) => setFeedbackState({ sentence, feedback, score })}
                                            />
                                          )
                                      })}
                                </div>
                            ) : loadingScopes.vocabulary ? (
                                <div className="space-y-6">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm animate-pulse">
                                            <div className="flex items-baseline gap-4 mb-4">
                                                <div className="h-8 w-32 bg-slate-200 rounded"></div>
                                                <div className="h-6 w-24 bg-slate-100 rounded"></div>
                                            </div>
                                            <div className="space-y-2 mb-4">
                                                <div className="h-4 w-full bg-slate-100 rounded"></div>
                                                <div className="h-4 w-3/4 bg-slate-100 rounded"></div>
                                            </div>
                                            <div className="h-16 bg-slate-50 rounded"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-amber-50/30 rounded-xl border border-dashed border-amber-100">
                                    <p className="text-gray-500 text-sm">Click the mine button to let AI extract advanced expressions</p>
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === 'quiz' && (
                    <QuizView newsId={newsId} />
                )}
            </div>
        </div>
      </div>

      {/* AI Feedback Modal */}
      {feedbackState && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setFeedbackState(null)}>
               <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                   <button 
                       onClick={() => setFeedbackState(null)}
                       className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                   >
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                           <path d="M18 6L6 18M6 6l12 12" />
                       </svg>
                   </button>

                   <div className="flex items-center gap-3 mb-5 pr-10">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!isEnglishLearner ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                           <span className="text-xl">📝</span>
                       </div>
                       <div>
                           <h3 className="text-lg font-bold text-gray-900">AI Feedback</h3>
                           <p className="text-xs text-gray-500">Review for your sentence</p>
                       </div>
                       {feedbackState.score && (
                           <div className={`ml-auto flex flex-col items-center justify-center w-14 h-14 rounded-2xl border-4 ${
                                ['A', 'S'].includes(feedbackState.score) ? 'border-green-100 bg-green-50 text-green-600' :
                                feedbackState.score === 'B' ? 'border-blue-100 bg-blue-50 text-blue-600' :
                                feedbackState.score === 'C' ? 'border-yellow-100 bg-yellow-50 text-yellow-600' :
                                'border-red-100 bg-red-50 text-red-600'
                           }`}>
                               <span className="text-2xl font-black leading-none">{feedbackState.score}</span>
                           </div>
                       )}
                   </div>

                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
                       <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Your Sentence</div>
                       <p className="italic mb-4 text-gray-900 font-medium">"{feedbackState.sentence}"</p>
                       
                       <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${!isEnglishLearner ? 'text-indigo-600' : 'text-amber-600'}`}>AI Comments</div>
                       <p className="text-gray-700 leading-relaxed text-sm">{feedbackState.feedback}</p>
                   </div>

                   <div className="flex justify-end">
                       <button 
                           onClick={() => setFeedbackState(null)}
                           className={`px-5 py-2.5 text-white rounded-xl font-bold transition-colors shadow-lg ${
                               !isEnglishLearner 
                               ? 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20' 
                               : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                           }`}
                       >
                           Got it
                       </button>
                   </div>
               </div>
           </div>
       )}

      {/* Save Highlight Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                Save to Library
              </h3>
              <button 
                onClick={closeDialog}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Type Indicator */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                  isEnglishLearner 
                    ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}>
                  {isEnglishLearner ? 'Vocabulary' : 'Term'}
                </span>
                <span className="text-xs text-gray-400">Auto-detected from current mode</span>
              </div>

              {/* Selected Text */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Selected Text
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-200 max-h-24 overflow-y-auto font-medium">
                  {selectedText}
                </div>
              </div>

              {/* Definition / Note */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-2">
                  <span>Definition / Note</span>
                  {isLoadingDefinition && (
                    <span className="inline-flex items-center gap-1.5 text-gray-400">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-xs">Fetching...</span>
                    </span>
                  )}
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm leading-relaxed resize-none"
                  rows={5}
                  placeholder={isLoadingDefinition ? "Loading definition..." : "Add notes, translation, or context..."}
                  disabled={isLoadingDefinition}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={closeDialog}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePhrase}
                disabled={isLoadingDefinition}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Animation Overlay */}
      {saveSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-in zoom-in duration-300 slide-in-from-bottom-4">
            <div className="bg-green-500 rounded-full p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span className="font-medium">Added to Learning Library</span>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />
    </div>
  )
}
