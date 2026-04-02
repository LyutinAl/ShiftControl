import api from './client'

export interface User {
  id: number
  username: string
  full_name: string
  role: 'admin' | 'engineer' | 'manager' | 'observer'
  is_active: boolean
}

export async function login(username: string, password: string): Promise<void> {
  await api.post('/auth/login', { username, password })
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await api.get<User>('/auth/me')
  return data
}
