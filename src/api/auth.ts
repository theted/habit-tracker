import type { AuthStatus, User } from '../types'
import { request } from './client'

export const authApi = {
  status: () => request<AuthStatus>('GET', 'auth/status'),
  register: (username: string, password: string) =>
    request<{ user: User }>('POST', 'auth/register', { username, password }),
  login: (username: string, password: string) =>
    request<{ user: User }>('POST', 'auth/login', { username, password }),
  logout: () => request<void>('POST', 'auth/logout'),
  updateAccount: (input: { currentPassword: string; username?: string; newPassword?: string }) =>
    request<{ user: User }>('PATCH', 'account', input),
  deleteAccount: (password: string) => request<void>('DELETE', 'account', { password })
}
