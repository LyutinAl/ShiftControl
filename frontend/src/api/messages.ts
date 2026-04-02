import api from './client'
import type { User } from './auth'

export interface Message {
  id: number
  body: string
  needs_attention: boolean
  is_read: boolean
  created_at: string
  author: User
}

export async function listMessages(params?: {
  unread_only?: boolean
  skip?: number
  limit?: number
}): Promise<Message[]> {
  const { data } = await api.get<Message[]>('/messages/', { params })
  return data
}

export async function createMessage(body: string, needs_attention: boolean): Promise<Message> {
  const { data } = await api.post<Message>('/messages/', { body, needs_attention })
  return data
}

export async function markAsRead(id: number): Promise<Message> {
  const { data } = await api.post<Message>(`/messages/${id}/read`)
  return data
}
