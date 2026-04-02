import api from './client'
import type { User } from './auth'

export type IncidentStatus = 'new' | 'in_progress' | 'waiting' | 'resolved' | 'closed' | 'rejected'
export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical'

export interface ShiftBrief {
  id: number
  shift_type: 'day' | 'night'
  started_at: string
}

export interface Incident {
  id: number
  title: string
  description: string | null
  category: string | null
  priority: IncidentPriority
  status: IncidentStatus
  equipment_ref: string | null
  resolution: string | null
  created_at: string
  closed_at: string | null
  author: User
  assignee: User | null
  shift_id: number | null
  shift: ShiftBrief | null
}

export interface Comment {
  id: number
  body: string
  created_at: string
  author: User
}

export interface IncidentCreate {
  title: string
  description?: string
  category?: string
  priority?: IncidentPriority
  equipment_ref?: string
  assignee_id?: number | null
  shift_id?: number | null
}

export interface IncidentUpdate {
  title?: string
  description?: string | null
  category?: string | null
  priority?: IncidentPriority
  equipment_ref?: string | null
  assignee_id?: number | null
  shift_id?: number | null
  resolution?: string | null
}

// Допустимые переходы — зеркалим backend-логику на клиенте
export const ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  new:         ['in_progress', 'rejected'],
  in_progress: ['waiting', 'resolved', 'rejected'],
  waiting:     ['in_progress', 'rejected'],
  resolved:    ['closed', 'in_progress'],
  closed:      [],
  rejected:    [],
}

export const TERMINAL_STATUSES: IncidentStatus[] = ['closed', 'rejected']

export async function listIncidents(params?: {
  skip?: number
  limit?: number
  status?: IncidentStatus
  priority?: IncidentPriority
  shift_id?: number
}): Promise<Incident[]> {
  const { data } = await api.get<Incident[]>('/incidents/', { params })
  return data
}

export async function getIncident(id: number): Promise<Incident> {
  const { data } = await api.get<Incident>(`/incidents/${id}`)
  return data
}

export async function createIncident(body: IncidentCreate): Promise<Incident> {
  const { data } = await api.post<Incident>('/incidents/', body)
  return data
}

export async function updateIncident(id: number, body: IncidentUpdate): Promise<Incident> {
  const { data } = await api.patch<Incident>(`/incidents/${id}`, body)
  return data
}

export async function changeIncidentStatus(id: number, status: IncidentStatus): Promise<Incident> {
  const { data } = await api.post<Incident>(`/incidents/${id}/status`, { status })
  return data
}

export async function setAssignee(id: number, assignee_id: number | null): Promise<Incident> {
  const { data } = await api.patch<Incident>(`/incidents/${id}/assignee`, { assignee_id })
  return data
}

export async function listIncidentComments(id: number): Promise<Comment[]> {
  const { data } = await api.get<Comment[]>(`/incidents/${id}/comments`)
  return data
}

export async function addIncidentComment(id: number, body: string): Promise<Comment> {
  const { data } = await api.post<Comment>(`/incidents/${id}/comments`, { body })
  return data
}

export async function deleteComment(commentId: number): Promise<void> {
  await api.delete(`/comments/${commentId}`)
}
