import api from './client'
import type { User } from './auth'

export type ShiftType = 'day' | 'night'

export interface Shift {
  id: number
  shift_type: ShiftType
  started_at: string
  closed_at: string | null
  equipment_status: string | null
  completed_works: string | null
  open_issues: string | null
  notes: string | null
  is_closed: boolean
  author: User
}

export interface ShiftCreate {
  shift_type: ShiftType
  equipment_status?: string
  completed_works?: string
  open_issues?: string
  notes?: string
}

export interface ShiftUpdate {
  equipment_status?: string | null
  completed_works?: string | null
  open_issues?: string | null
  notes?: string | null
}

export async function listShifts(skip = 0, limit = 20): Promise<Shift[]> {
  const { data } = await api.get<Shift[]>('/shifts/', { params: { skip, limit } })
  return data
}

export async function getShift(id: number): Promise<Shift> {
  const { data } = await api.get<Shift>(`/shifts/${id}`)
  return data
}

export async function createShift(body: ShiftCreate): Promise<Shift> {
  const { data } = await api.post<Shift>('/shifts/', body)
  return data
}

export async function updateShift(id: number, body: ShiftUpdate): Promise<Shift> {
  const { data } = await api.patch<Shift>(`/shifts/${id}`, body)
  return data
}

export async function closeShift(id: number): Promise<Shift> {
  const { data } = await api.post<Shift>(`/shifts/${id}/close`)
  return data
}
