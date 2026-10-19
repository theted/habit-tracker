import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HabitRhythm from './HabitRhythm.vue'

// Tests run in UTC
const NOW = new Date('2026-10-19T15:00:00Z')
const at = (iso: string) => new Date(iso)

describe('HabitRhythm', () => {
  it('shows the typical gap, the longest break and the time since the last entry', () => {
    const wrapper = mount(HabitRhythm, {
      props: {
        now: NOW,
        dates: [
          at('2026-10-01T08:00Z'),
          at('2026-10-02T08:00Z'),
          at('2026-10-03T08:00Z'),
          at('2026-10-12T08:00Z'),
          at('2026-10-19T12:00Z')
        ]
      }
    })
    const figures = wrapper.find('dl').text()

    expect(wrapper.find('header').text()).toContain('Usually 4.1 days from one entry to the next')
    expect(figures).toContain('Longest break9 days3 Oct – 12 Oct 2026')
    expect(figures).toContain('Since the last one3 h')
    expect(wrapper.find('[data-record]').exists()).toBe(false)
    expect(wrapper.find('[role="img"]').attributes('aria-label')).toContain('about two days: 0')
  })

  it('notices when the break going on now is the longest yet', () => {
    const wrapper = mount(HabitRhythm, {
      props: { now: NOW, dates: [at('2026-10-01T08:00Z'), at('2026-10-01T08:00:20Z')] }
    })

    expect(wrapper.find('dl').text()).toContain(
      'Longest breakUnder a minute1 Oct 2026, 08:00–08:00'
    )
    expect(wrapper.find('[data-record]').text()).toBe('Your longest break yet')
  })

  it('waits for a second entry', () => {
    const wrapper = mount(HabitRhythm, { props: { now: NOW, dates: [at('2026-10-01T08:00Z')] } })

    expect(wrapper.text()).toContain('Log a couple of entries')
    expect(wrapper.find('dl').exists()).toBe(false)
  })
})
