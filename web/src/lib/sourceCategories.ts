export type SourceCategoryKey = 'research' | 'academic' | 'media' | 'blog' | 'newsletter' | 'science'

export interface SourceCategoryMeta {
  id: SourceCategoryKey
  label: string
  displayName: string
  description: string
  accent: string
  icon: string
}

export const SOURCE_CATEGORIES: SourceCategoryMeta[] = [
  {
    id: 'research',
    label: 'Research Lab',
    displayName: 'Research Lab',
    description: 'AI research labs and organizations',
    accent: '#8b5cf6', // violet
    icon: '🔬',
  },
  {
    id: 'academic',
    label: 'Academic Paper',
    displayName: 'Academic Paper',
    description: 'Academic papers and publications',
    accent: '#3b82f6', // blue
    icon: '🎓',
  },
  {
    id: 'media',
    label: 'News',
    displayName: 'News',
    description: 'News outlets and media',
    accent: '#ef4444', // red
    icon: '📰',
  },
  {
    id: 'blog',
    label: 'Blog',
    displayName: 'Blog',
    description: 'Personal and company blogs',
    accent: '#f97316', // orange
    icon: '✍️',
  },
  {
    id: 'newsletter',
    label: 'Newsletter',
    displayName: 'Newsletter',
    description: 'Email newsletters and digests',
    accent: '#10b981', // emerald
    icon: '📧',
  },
  {
    id: 'science',
    label: 'Science & Tech',
    displayName: 'Science & Tech',
    description: 'Science and technology publications',
    accent: '#06b6d4', // cyan
    icon: '🔭',
  },
]

export const getSourceCategoryLabel = (categoryId?: string | null): string => {
  if (!categoryId) {
    return 'Uncategorized'
  }
  const category = SOURCE_CATEGORIES.find(c => c.id === categoryId)
  return category?.label ?? categoryId
}
