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

  // The message for one field, if the server had something to say about it
  issueFor(path: string) {
    return this.issues.find((issue) => issue.path === path)?.message
  }
}

// Set by main.ts: what to do when the session has ended (expired, or logged out elsewhere)
let onUnauthorized = () => {}
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler
}

// The session is an HttpOnly cookie, which the browser sends by itself on same-origin requests
export const request = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })

  // A wrong login is a 401 too, but it isn't a session that ended
  if (res.status === 401 && !path.startsWith('auth/')) onUnauthorized()
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const issues: Issue[] = data.issues ?? []
    throw new ApiError(res.status, issues[0]?.message ?? data.error ?? res.statusText, issues)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}
