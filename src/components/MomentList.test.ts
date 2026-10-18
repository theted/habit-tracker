import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMomentsStore } from '../stores/moments'
import { flushPromises, json, mockFetch, mountWithApp } from '../test/utils'
import type { Moment } from '../types'
import MomentList from './MomentList.vue'

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-15T15:00:00Z'), toFake: ['Date'] })
})

const moments: Moment[] = [
  {
    id: 1,
    kind: 'annoying',
    note: 'The test runner hung twice',
    agent: null,
    project: 'kolla',
    date: '2026-10-14T20:15:00.000Z'
  },
  {
    id: 2,
    kind: 'good',
    note: 'Found the bug at last',
    agent: 'Claude Code (Opus 5.5)',
    project: 'habit-tracker',
    date: '2026-10-15T08:00:00.000Z'
  },
  {
    id: 3,
    kind: 'user_annoying',
    note: 'Asked for the opposite of yesterday',
    agent: null,
    project: null,
    date: '2026-10-15T12:45:00.000Z'
  }
]

const mountList = async () => {
  const result = await mountWithApp(MomentList, { moments })
  const store = useMomentsStore()
  store.moments = [...moments]
  await result.wrapper.setProps({ moments: store.moments })
  return result
}

describe('MomentList', () => {
  it('lists moments newest first, grouped by day, with where they came from', async () => {
    const { wrapper } = await mountList()

    expect(wrapper.findAll('h3').map((heading) => heading.text())).toEqual([
      'Today · 2',
      'Yesterday · 1'
    ])
    const items = wrapper.findAll('li').map((item) => item.text())
    expect(items[0]).toContain('Asked for the opposite of yesterday')
    expect(items[1]).toContain('08:00 · habit-tracker · Claude Code (Opus 5.5)')
    expect(items[2]).toContain('20:15 · kolla')
  })

  it('filters by kind', async () => {
    const { wrapper } = await mountList()

    await wrapper.findAll('[role="group"] button')[1]!.trigger('click')

    expect(wrapper.findAll('li')).toHaveLength(1)
    expect(wrapper.get('li').text()).toContain('Found the bug at last')
  })

  it('removes a moment', async () => {
    const { wrapper } = await mountList()
    const fetch = mockFetch(() => json(null, 204))

    await wrapper.get('button[aria-label^="Remove the moment at 12:45"]').trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith(
      '/api/moments/3',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(wrapper.findAll('li')).toHaveLength(2)
  })
})
