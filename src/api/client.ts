import { clearPassword, getPassword } from '../auth'

export interface Issue {
  path: string
  message: string
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues: Issue[] = []
  ) {
    super(message)
  }
}

// Set by main.ts: where to send the user when the stored password stops working
let onUnauthorized = () => {}
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler
}

export const request = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  const headers: Record<string, string> = { 'X-Password': getPassword() ?? '' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`/api/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  })

  if (res.status === 401) {
    clearPassword()
    onUnauthorized()
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const issues: Issue[] = data.issues ?? []
    throw new ApiError(res.status, issues[0]?.message ?? data.error ?? res.statusText, issues)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

// Asks the API whether a password is right without storing it or redirecting on a 401
export const checkPassword = async (password: string) => {
  const res = await fetch('/api/auth', { headers: { 'X-Password': password } })
  return res.status === 204
}
