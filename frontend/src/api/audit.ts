import api from './client'

export type ActionType = 'create' | 'update' | 'delete' | 'login' | 'logout'

export interface AuditLog {
  id: number
  user_id: number | null
  action_type: ActionType
  entity_type: string
  entity_id: number | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
}

export async function listAuditLogs(params?: {
  skip?: number
  limit?: number
  entity_type?: string
}): Promise<AuditLog[]> {
  const { data } = await api.get<AuditLog[]>('/audit/', { params })
  return data
}
