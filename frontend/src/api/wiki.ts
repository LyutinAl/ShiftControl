import api from './client'
import type { User } from './auth'

export type WikiVisibility = 'public' | 'restricted' | 'private'

export interface WikiSection {
  id: number
  title: string
  parent_id: number | null
}

export interface WikiArticleListItem {
  id: number
  title: string
  section_id: number | null
  tags: string[]
  visibility: WikiVisibility
  updated_at: string
  author: User
}

export interface WikiArticle extends WikiArticleListItem {
  content: string
  created_at: string
  section: WikiSection | null
  permissions: { user_id: number; user: User }[]
}

export interface WikiVersion {
  id: number
  article_id: number
  created_at: string
  author: User
}

export interface WikiArticleCreate {
  title: string
  content?: string
  section_id?: number | null
  tags?: string[]
  visibility?: WikiVisibility
  allowed_user_ids?: number[]
}

export interface WikiArticleUpdate {
  title?: string
  content?: string
  section_id?: number | null
  tags?: string[]
  visibility?: WikiVisibility
  allowed_user_ids?: number[]
}

export async function listSections(): Promise<WikiSection[]> {
  const { data } = await api.get<WikiSection[]>('/wiki/sections')
  return data
}

export async function createSection(title: string, parent_id?: number | null): Promise<WikiSection> {
  const { data } = await api.post<WikiSection>('/wiki/sections', { title, parent_id })
  return data
}

export async function listArticles(params?: {
  section_id?: number
  tag?: string
  skip?: number
  limit?: number
}): Promise<WikiArticleListItem[]> {
  const { data } = await api.get<WikiArticleListItem[]>('/wiki/articles', { params })
  return data
}

export async function getArticle(id: number): Promise<WikiArticle> {
  const { data } = await api.get<WikiArticle>(`/wiki/articles/${id}`)
  return data
}

export async function createArticle(body: WikiArticleCreate): Promise<WikiArticle> {
  const { data } = await api.post<WikiArticle>('/wiki/articles', body)
  return data
}

export async function updateArticle(id: number, body: WikiArticleUpdate): Promise<WikiArticle> {
  const { data } = await api.patch<WikiArticle>(`/wiki/articles/${id}`, body)
  return data
}

export async function deleteArticle(id: number): Promise<void> {
  await api.delete(`/wiki/articles/${id}`)
}

export async function listVersions(articleId: number): Promise<WikiVersion[]> {
  const { data } = await api.get<WikiVersion[]>(`/wiki/articles/${articleId}/versions`)
  return data
}

export async function restoreVersion(articleId: number, versionId: number): Promise<WikiArticle> {
  const { data } = await api.post<WikiArticle>(`/wiki/articles/${articleId}/restore/${versionId}`)
  return data
}

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<{ url: string }>('/wiki/images', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.url
}
