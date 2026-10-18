import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, json, mockFetch, mountWithApp } from '../test/utils'
import type { Moment } from '../types'
import AgentsView from './AgentsView.vue'

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-15T15:00:00Z'), toFake: ['Date'] })
})

let nextId = 1
const moment = (date: string, kind: Moment['kind'], project: string | null = null): Moment => ({
  id: nextId++,
  kind,
  note: `A ${kind} moment`,
  agent: 'Claude Code',
  project,
  date
})

const tile = (wrapper: Awaited<ReturnType<typeof mountWithApp>>['wrapper'], key: string) =>
  wrapper.get(`[data-tile="${key}"]`).text()

describe('AgentsView', () => {
  it('sums up the last 30 days against the 30 before', async () => {
    mockFetch(() =>
      json([
        // The 30 days before
        moment('2026-09-01T10:00:00Z', 'good'),
        moment('2026-09-02T10:00:00Z', 'annoying'),
        // The last 30 days
        moment('2026-10-10T23:30:00Z', 'user_annoying', 'kolla'),
        moment('2026-10-12T09:00:00Z', 'good', 'habit-tracker'),
        moment('2026-10-13T09:00:00Z', 'good', 'habit-tracker'),
        moment('2026-10-14T09:00:00Z', 'good', 'habit-tracker')
      ])
    )
    const { wrapper } = await mountWithApp(AgentsView)
    await flushPromises()

    expect(tile(wrapper, 'good')).toContain('3')
    expect(tile(wrapper, 'good')).toContain('was 1')
    expect(tile(wrapper, 'share')).toContain('75%')
    expect(tile(wrapper, 'share')).toContain('was 50%')
    expect(wrapper.text()).toContain('4 moments in the last 30 days · 75% of the moods good')
    expect(wrapper.text()).toContain("You're most annoying between 23:00 and 00:00")
    expect(wrapper.text()).toContain('habit-tracker')
    expect(wrapper.findAll('li').length).toBeGreaterThanOrEqual(6)
  })

  it('narrows everything to the period picked', async () => {
    mockFetch(() =>
      json([moment('2026-09-20T10:00:00Z', 'annoying'), moment('2026-10-14T10:00:00Z', 'good')])
    )
    const { wrapper } = await mountWithApp(AgentsView)
    await flushPromises()

    await wrapper
      .findAll('[role="radio"]')
      .find((radio) => radio.text() === '7 days')!
      .trigger('click')

    expect(wrapper.text()).toContain('1 moment in the last 7 days · 100% of the moods good')
    expect(tile(wrapper, 'annoying')).toContain('0')
  })

  it('explains how to connect an agent when nothing has been reported', async () => {
    mockFetch(() => json([]))
    const { wrapper } = await mountWithApp(AgentsView)
    await flushPromises()

    expect(wrapper.text()).toContain('No moments yet')
    expect(wrapper.text()).toContain('Connect an agent')
  })
})
