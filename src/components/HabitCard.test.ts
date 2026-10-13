import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHabitsStore } from '../stores/habits'
import { useToastStore } from '../stores/toasts'
import { flushPromises, json, makeHabit, mockFetch, mountWithApp } from '../test/utils'
import HabitCard from './HabitCard.vue'

beforeEach(() => {
  // Tuesday 13 October 2026; only Date is faked, timers stay real
  vi.useFakeTimers({ now: new Date('2026-10-13T15:00:00Z'), toFake: ['Date'] })
})

const habit = () =>
  makeHabit({
    title: 'Read',
    emoji: '📚',
    tracks: [
      { id: 1, date: '2026-10-11T20:00:00.000Z' },
      { id: 2, date: '2026-10-12T20:00:00.000Z' },
      { id: 3, date: '2026-10-13T09:00:00.000Z' },
      { id: 4, date: '2026-10-13T12:00:00.000Z' }
    ]
  })

const mountCard = async () => {
  const result = await mountWithApp(HabitCard, { habit: habit() })
  // The card reads its habit from the store, as on the home page
  const store = useHabitsStore()
  store.habits = [result.wrapper.props('habit')]
  await result.wrapper.setProps({ habit: store.habits[0] })
  return result
}

describe('HabitCard', () => {
  it("shows today's count, the streak and a done badge", async () => {
    const { wrapper } = await mountCard()

    expect(wrapper.get('h2').text()).toBe('Read')
    expect(wrapper.text()).toContain('2 today')
    expect(wrapper.text()).toContain('3 days')
    expect(wrapper.find('[title="Done today"]').exists()).toBe(true)
  })

  it('draws the last fourteen days, today last', async () => {
    const { wrapper } = await mountCard()

    const bars = wrapper.findAll('[role="img"] > span')
    expect(bars).toHaveLength(14)
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toMatch(/1, 1, 2$/)
  })

  it('links to the habit', async () => {
    const { wrapper } = await mountCard()
    const id = wrapper.props('habit').id

    expect(wrapper.get('a').attributes('href')).toBe(`/habits/${id}`)
  })

  it('logs an entry with + and offers to undo it', async () => {
    const { wrapper } = await mountCard()
    const id = wrapper.props('habit').id
    const fetch = mockFetch((method) =>
      method === 'POST'
        ? json({ id: 99, habitId: id, date: '2026-10-13T15:00:00.000Z' }, 201)
        : json(null, 204)
    )

    await wrapper.get('button[aria-label="Log Read"]').trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith(`/api/habits/${id}/tracks`, expect.anything())
    expect(wrapper.text()).toContain('3 today')
    const toast = useToastStore().toasts[0]!
    expect(toast.message).toBe('📚 Read logged')

    await toast.action!.run()
    await flushPromises()
    expect(fetch).toHaveBeenLastCalledWith('/api/tracks/99', expect.anything())
    expect(wrapper.text()).toContain('2 today')
  })

  it('says so when logging fails', async () => {
    const { wrapper } = await mountCard()
    mockFetch(() => json({ error: 'Internal Server Error' }, 500))

    await wrapper.get('button[aria-label="Log Read"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('2 today')
    expect(useToastStore().toasts[0]).toMatchObject({ tone: 'error' })
  })
})
