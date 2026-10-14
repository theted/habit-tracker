import { describe, expect, it, vi } from 'vitest'
import { json, mockFetch } from '../test/utils'
import { ApiError, request, setUnauthorizedHandler } from './client'

describe('request', () => {
  it('sends a JSON body, and no credentials of its own (the cookie goes by itself)', async () => {
    const fetch = mockFetch(() => json({ id: 1 }, 201))

    const result = await request('POST', 'habits', { title: 'Read' })

    expect(result).toEqual({ id: 1 })
    const [url, init] = fetch.mock.calls[0]!
    expect(url).toBe('/api/habits')
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init?.body).toBe('{"title":"Read"}')
  })

  it('returns nothing for 204 No Content', async () => {
    mockFetch(() => json(null, 204))
    await expect(request('DELETE', 'habits/1')).resolves.toBeUndefined()
  })

  it('throws an ApiError carrying the validation issues', async () => {
    mockFetch(() =>
      json(
        { error: 'Bad Request', issues: [{ path: 'title', message: 'Give the habit a name' }] },
        400
      )
    )

    const err = (await request('POST', 'habits', {}).catch((e: unknown) => e)) as ApiError

    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(400)
    expect(err.message).toBe('Give the habit a name')
    expect(err.issueFor('title')).toBe('Give the habit a name')
    expect(err.issueFor('color')).toBeUndefined()
  })

  it('reports an ended session, but not a failed login', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    mockFetch(() => json({ error: 'Unauthorized' }, 401))

    await expect(request('POST', 'auth/login', {})).rejects.toBeInstanceOf(ApiError)
    expect(handler).not.toHaveBeenCalled()

    await expect(request('GET', 'habits')).rejects.toBeInstanceOf(ApiError)
    expect(handler).toHaveBeenCalledOnce()
  })
})
