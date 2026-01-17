export type SourceCategoryKey = 'research' | 'academic' | 'media' | 'blog' | 'newsletter' | 'science'

export interface SourceCategoryMeta {
  id: SourceCategoryKey
  label: string
  description: string
}

export const SOURCE_CATEGORIES: SourceCategoryMeta[] = [
  {
    id: 'research',
    label: 'Research Lab',
    description: 'AI research labs and organizations',
  },
  {
    id: 'academic',
    label: 'Academic Paper',
    description: 'Academic papers and publications',
  },
  {
    id: 'media',
    label: 'News',
    description: 'News outlets and media',
  },
  {
    id: 'blog',
    label: 'Blog',
    description: 'Personal and company blogs',
  },
  {
    id: 'newsletter',
    label: 'Newsletter',
    description: 'Email newsletters and digests',
  },
  {
    id: 'science',
    label: 'Science & Tech',
    description: 'Science and technology publications',
  },
]

export const getSourceCategoryLabel = (categoryId?: string | null): string => {
  if (!categoryId) {
    return 'Uncategorized'
  }
  const category = SOURCE_CATEGORIES.find(c => c.id === categoryId)
  return category?.label ?? categoryId
}
