import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { json, makeHabit, mockFetch } from '../test/utils'
import { useHabitsStore } from './habits'
import { useSessionStore } from './session'

const ted = { id: 1, username: 'ted', createdAt: '2026-10-14T08:00:00.000Z' }
const ann = { id: 2, username: 'ann', createdAt: '2026-10-14T08:00:00.000Z' }

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useSessionStore', () => {
  it('asks the server who is logged in, once', async () => {
    const fetch = mockFetch(() => json({ user: ted, signupEnabled: false }))
    const session = useSessionStore()

    await Promise.all([session.ensureLoaded(), session.ensureLoaded()])
    await session.ensureLoaded()

    expect(fetch).toHaveBeenCalledOnce()
    expect(session.user).toEqual(ted)
    expect(session.signupEnabled).toBe(false)
  })

  it('logs in, and drops habits that belonged to someone else', async () => {
    const session = useSessionStore()
    const habits = useHabitsStore()
    session.user = ann
    habits.habits = [makeHabit()]
    habits.status = 'ready'
    const fetch = mockFetch(() => json({ user: ted }))

    await session.login('ted', 'secret password')

    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toEqual({
      username: 'ted',
      password: 'secret password'
    })
    expect(session.user).toEqual(ted)
    expect(habits.habits).toEqual([])
    expect(habits.status).toBe('idle')
  })

  it('registers', async () => {
    const fetch = mockFetch(() => json({ user: ted }, 201))
    const session = useSessionStore()

    await session.register('ted', 'secret password')

    expect(fetch.mock.calls[0]![0]).toBe('/api/auth/register')
    expect(session.user).toEqual(ted)
  })

  it('logs out, forgetting the user and their habits even if the server is unreachable', async () => {
    const session = useSessionStore()
    session.user = ted
    useHabitsStore().habits = [makeHabit()]
    mockFetch(() => json({ error: 'Bad Gateway' }, 502))

    await expect(session.logout()).rejects.toThrow()

    expect(session.user).toBeNull()
    expect(useHabitsStore().habits).toEqual([])
  })

  it('keeps the account up to date after a change, and forgets it once deleted', async () => {
    const session = useSessionStore()
    session.user = ted
    mockFetch((method) =>
      method === 'PATCH' ? json({ user: { ...ted, username: 'teddy' } }) : json(null, 204)
    )

    await session.updateAccount({ currentPassword: 'x', username: 'teddy' })
    expect(session.user?.username).toBe('teddy')

    await session.deleteAccount('x')
    expect(session.user).toBeNull()
  })
})
