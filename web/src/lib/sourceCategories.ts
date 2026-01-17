export type SourceCategoryKey = 'research' | 'academic' | 'media' | 'blog' | 'newsletter' | 'science'

export interface SourceCategoryMeta {
  id: SourceCategoryKey
  label: string
  description: string
  accent: string
}

export const SOURCE_CATEGORIES: SourceCategoryMeta[] = [
  {
    id: 'research',
    label: 'Research Lab',
    description: 'AI research labs and organizations',
    accent: '#8b5cf6', // violet
  },
  {
    id: 'academic',
    label: 'Academic Paper',
    description: 'Academic papers and publications',
    accent: '#3b82f6', // blue
  },
  {
    id: 'media',
    label: 'News',
    description: 'News outlets and media',
    accent: '#ef4444', // red
  },
  {
    id: 'blog',
    label: 'Blog',
    description: 'Personal and company blogs',
    accent: '#f97316', // orange
  },
  {
    id: 'newsletter',
    label: 'Newsletter',
    description: 'Email newsletters and digests',
    accent: '#10b981', // emerald
  },
  {
    id: 'science',
    label: 'Science & Tech',
    description: 'Science and technology publications',
    accent: '#06b6d4', // cyan
  },
]

export const getSourceCategoryLabel = (categoryId?: string | null): string => {
  if (!categoryId) {
    return 'Uncategorized'
  }
  const category = SOURCE_CATEGORIES.find(c => c.id === categoryId)
  return category?.label ?? categoryId
}
