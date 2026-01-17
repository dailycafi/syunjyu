export const NEWS_CATEGORY_LABELS = {
  media: 'News',
  blog: 'Blog',
  academic: 'Academic Paper',
  research: 'Research Lab',
  newsletter: 'Newsletter',
  science: 'Science & Tech',
} as const

export type NewsCategoryKey = keyof typeof NEWS_CATEGORY_LABELS
export type NewsCategoryFilter = 'all' | NewsCategoryKey

export const NEWS_CATEGORY_FILTERS: { key: NewsCategoryFilter; label: string }[] = [
  { key: 'all', label: 'All Types' },
  { key: 'media', label: NEWS_CATEGORY_LABELS.media },
  { key: 'research', label: NEWS_CATEGORY_LABELS.research },
  { key: 'academic', label: NEWS_CATEGORY_LABELS.academic },
  { key: 'blog', label: NEWS_CATEGORY_LABELS.blog },
  { key: 'newsletter', label: NEWS_CATEGORY_LABELS.newsletter },
  { key: 'science', label: NEWS_CATEGORY_LABELS.science },
]

export const getNewsCategoryLabel = (category?: string | null) => {
  if (!category) {
    return 'Uncategorized'
  }
  return NEWS_CATEGORY_LABELS[category as NewsCategoryKey] ?? category
}

