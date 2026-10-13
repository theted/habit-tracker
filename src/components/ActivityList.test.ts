import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHabitsStore } from '../stores/habits'
import { useToastStore } from '../stores/toasts'
import { flushPromises, json, makeHabit, mockFetch, mountWithApp } from '../test/utils'
import ActivityList from './ActivityList.vue'

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-13T15:00:00Z'), toFake: ['Date'] })
})

const mountList = async () => {
  const habit = makeHabit({
    tracks: [
      { id: 1, date: '2026-10-05T07:30:00.000Z' },
      { id: 2, date: '2026-10-12T20:15:00.000Z' },
      { id: 3, date: '2026-10-13T08:00:00.000Z' },
      { id: 4, date: '2026-10-13T12:45:00.000Z' }
    ]
  })
  const result = await mountWithApp(ActivityList, { habit })
  const store = useHabitsStore()
  store.habits = [habit]
  await result.wrapper.setProps({ habit: store.habits[0] })
  return result
}

describe('ActivityList', () => {
  it('lists entries newest first, grouped by day', async () => {
    const { wrapper } = await mountList()

    expect(wrapper.findAll('h3').map((heading) => heading.text())).toEqual([
      'Today · 2',
      'Yesterday · 1',
      'Monday 5 October · 1'
    ])
    expect(wrapper.findAll('li').map((item) => item.text())).toEqual([
      '12:45',
      '08:00',
      '20:15',
      '07:30'
    ])
  })

  it('removes an entry, with an undo that logs it again at the same time', async () => {
    const { wrapper } = await mountList()
    const fetch = mockFetch((method, _url, body) =>
      method === 'DELETE'
        ? json(null, 204)
        : json({ id: 5, habitId: 1, date: (body as { date: string }).date }, 201)
    )

    await wrapper.get('button[aria-label^="Remove the entry at 12:45"]').trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith(
      '/api/tracks/4',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(wrapper.findAll('li')).toHaveLength(3)

    await useToastStore().toasts[0]!.action!.run()
    await flushPromises()
    expect(JSON.parse(String(fetch.mock.calls[1]![1]!.body))).toEqual({
      date: '2026-10-13T12:45:00.000Z'
    })
    expect(wrapper.findAll('li')).toHaveLength(4)
  })

  it('says when there is nothing yet', async () => {
    const { wrapper } = await mountWithApp(ActivityList, { habit: makeHabit() })
    expect(wrapper.text()).toContain('No entries yet')
  })
})
