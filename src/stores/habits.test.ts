import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { json, makeHabit, mockFetch } from '../test/utils'
import { useHabitsStore } from './habits'

beforeEach(() => {
  setActivePinia(createPinia())
})

// A fetch whose responses resolve only when the test says so
const deferredFetch = () => {
  let respond!: (response: Response) => void
  const fetch = mockFetch(() => {
    throw new Error('replaced below')
  })
  fetch.mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        respond = resolve
      })
  )
  return { fetch, respond: (response: Response) => respond(response) }
}

describe('useHabitsStore', () => {
  it('loads the habits', async () => {
    const habit = makeHabit()
    mockFetch(() => json([habit]))
    const store = useHabitsStore()

    await store.load()

    expect(store.status).toBe('ready')
    expect(store.habits).toEqual([habit])
    expect(store.byId(habit.id)).toEqual(habit)
  })

  it('records a failed load', async () => {
    mockFetch(() => json({ error: 'Internal Server Error' }, 500))
    const store = useHabitsStore()

    await expect(store.load()).rejects.toThrow()
    expect(store.status).toBe('error')
  })

  it('adds a created habit and replaces an updated one', async () => {
    const store = useHabitsStore()
    const created = makeHabit({ title: 'Run' })
    mockFetch(() => json(created, 201))
    await store.create({ title: 'Run' })

    mockFetch(() => json({ ...created, title: 'Run far' }))
    await store.update(created.id, { title: 'Run far' })

    expect(store.habits.map((habit) => habit.title)).toEqual(['Run far'])
  })

  it('drops a deleted habit', async () => {
    const store = useHabitsStore()
    store.habits = [makeHabit(), makeHabit()]
    const [first, second] = store.habits
    mockFetch(() => json(null, 204))

    await store.remove(first!.id)

    expect(store.habits).toEqual([second])
  })

  it('shows an entry at once, then swaps in the saved one', async () => {
    const store = useHabitsStore()
    const habit = makeHabit()
    store.habits = [habit]
    const { respond } = deferredFetch()

    const pending = store.track(habit.id)
    const shown = store.habits[0]!.tracks
    expect(shown).toHaveLength(1)
    expect(shown[0]!.id).toBeLessThan(0)

    respond(json({ id: 42, habitId: habit.id, date: '2026-10-13T10:00:00.000Z' }, 201))
    await pending

    expect(store.habits[0]!.tracks).toEqual([{ id: 42, date: '2026-10-13T10:00:00.000Z' }])
  })

  it('takes the entry back out when the server refuses it', async () => {
    const store = useHabitsStore()
    store.habits = [makeHabit()]
    mockFetch(() => json({ error: 'Internal Server Error' }, 500))

    await expect(store.track(store.habits[0]!.id)).rejects.toThrow()

    expect(store.habits[0]!.tracks).toEqual([])
  })

  it('keeps entries oldest first when one is backdated', async () => {
    const store = useHabitsStore()
    store.habits = [
      makeHabit({
        tracks: [
          { id: 1, date: '2026-10-01T08:00:00.000Z' },
          { id: 3, date: '2026-10-03T08:00:00.000Z' }
        ]
      })
    ]
    mockFetch((_method, _url, body) =>
      json({ id: 2, habitId: 1, date: (body as { date: string }).date }, 201)
    )

    await store.track(store.habits[0]!.id, new Date('2026-10-02T08:00:00.000Z'))

    expect(store.habits[0]!.tracks.map((track) => track.id)).toEqual([1, 2, 3])
  })

  it('removes an entry, and puts it back if the server refuses', async () => {
    const store = useHabitsStore()
    const track = { id: 7, date: '2026-10-01T08:00:00.000Z' }
    store.habits = [makeHabit({ tracks: [track] })]
    const habitId = store.habits[0]!.id

    mockFetch(() => json({ error: 'Internal Server Error' }, 500))
    await expect(store.untrack(habitId, 7)).rejects.toThrow()
    expect(store.habits[0]!.tracks).toEqual([track])

    mockFetch(() => json(null, 204))
    await expect(store.untrack(habitId, 7)).resolves.toEqual(track)
    expect(store.habits[0]!.tracks).toEqual([])
  })
})
