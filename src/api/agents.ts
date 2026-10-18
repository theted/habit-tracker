import type { ApiToken, Moment } from '../types'
import { request } from './client'

export const agentsApi = {
  moments: () => request<Moment[]>('GET', 'moments'),
  removeMoment: (id: number) => request<void>('DELETE', `moments/${id}`),
  tokens: () => request<ApiToken[]>('GET', 'tokens'),
  // The only time the key itself is seen
  createToken: (name: string) => request<ApiToken & { token: string }>('POST', 'tokens', { name }),
  revokeToken: (id: number) => request<void>('DELETE', `tokens/${id}`)
}
