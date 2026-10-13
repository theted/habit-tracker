import { describe, expect, it, vi } from 'vitest'
import { getPassword, setPassword } from '../auth'
import { json, mockFetch } from '../test/utils'
import { ApiError, checkPassword, request, setUnauthorizedHandler } from './client'

describe('request', () => {
  it('sends the stored password and a JSON body', async () => {
    setPassword('secret')
    const fetch = mockFetch(() => json({ id: 1 }, 201))

    const result = await request('POST', 'habits', { title: 'Read' })

    expect(result).toEqual({ id: 1 })
    const [url, init] = fetch.mock.calls[0]!
    expect(url).toBe('/api/habits')
    expect(init?.headers).toMatchObject({
      'X-Password': 'secret',
      'Content-Type': 'application/json'
    })
    expect(init?.body).toBe('{"title":"Read"}')
  })

  it('returns nothing for 204 No Content', async () => {
    mockFetch(() => json(null, 204))
    await expect(request('DELETE', 'habits/1')).resolves.toBeUndefined()
  })

  it('throws an ApiError carrying the first validation message', async () => {
    mockFetch(() =>
      json(
        { error: 'Bad Request', issues: [{ path: 'title', message: 'Give the habit a name' }] },
        400
      )
    )

    const err = await request('POST', 'habits', {}).catch((e: unknown) => e)

    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({
      status: 400,
      message: 'Give the habit a name',
      issues: [{ path: 'title', message: 'Give the habit a name' }]
    })
  })

  it('forgets the password and calls the unauthorized handler on a 401', async () => {
    setPassword('stale')
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    mockFetch(() => json({ error: 'Unauthorized' }, 401))

    await expect(request('GET', 'habits')).rejects.toBeInstanceOf(ApiError)

    expect(getPassword()).toBeNull()
    expect(handler).toHaveBeenCalledOnce()
  })
})

describe('checkPassword', () => {
  it('is true for 204 and false for 401, without storing anything', async () => {
    mockFetch((_method, _url) => json(null, 204))
    await expect(checkPassword('right')).resolves.toBe(true)

    mockFetch(() => json({ error: 'Unauthorized' }, 401))
    await expect(checkPassword('wrong')).resolves.toBe(false)
    expect(getPassword()).toBeNull()
  })
})
