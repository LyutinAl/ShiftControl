import api from './client'
import type { Incident } from './incidents'
import type { WikiArticleListItem } from './wiki'

export interface SearchResults {
  incidents: Incident[]
  articles: WikiArticleListItem[]
}

export async function search(q: string): Promise<SearchResults> {
  const { data } = await api.get<SearchResults>('/search/', { params: { q } })
  return data
}
