import api from './client'
import type { User } from './auth'

export interface UserCreate {
  username: string
  full_name: string
  password: string
  role: User['role']
}

export interface UserUpdate {
  full_name?: string
  role?: User['role']
  password?: string
}

export async function listUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>('/users/')
  return data
}

export async function createUser(body: UserCreate): Promise<User> {
  const { data } = await api.post<User>('/users/', body)
  return data
}

export async function updateUser(id: number, body: UserUpdate): Promise<User> {
  const { data } = await api.patch<User>(`/users/${id}`, body)
  return data
}

export async function deactivateUser(id: number): Promise<User> {
  const { data } = await api.post<User>(`/users/${id}/deactivate`)
  return data
}

export async function activateUser(id: number): Promise<User> {
  const { data } = await api.post<User>(`/users/${id}/activate`)
  return data
}
