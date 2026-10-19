import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TimeScatter from './TimeScatter.vue'

// Tests run in UTC
const NOW = new Date('2026-10-19T15:00:00Z')
const label = 'Entry times'

describe('TimeScatter', () => {
  it('puts a dot for each entry of the last 90 days, earlier ones higher', () => {
    const wrapper = mount(TimeScatter, {
      props: {
        now: NOW,
        label,
        dates: [
          new Date('2026-10-12T06:30:00Z'),
          new Date('2026-10-13T08:30:00Z'),
          // Too long ago
          new Date('2026-05-01T07:00:00Z')
        ]
      }
    })
    const dots = wrapper.findAll('[data-dot]')

    expect(dots).toHaveLength(2)
    const [early, late] = dots.map((dot) => Number(dot.attributes('cy')))
    expect(early).toBeLessThan(late!)
    expect(wrapper.find('svg').attributes('aria-label')).toBe(label)
    expect(wrapper.findAll('text').map((text) => text.text())).toContain('07:00')
  })

  it("joins up consecutive weeks' medians", () => {
    const wrapper = mount(TimeScatter, {
      props: {
        now: NOW,
        label,
        dates: [
          new Date('2026-10-05T07:00:00Z'),
          new Date('2026-10-06T07:30:00Z'),
          new Date('2026-10-12T07:10:00Z'),
          new Date('2026-10-13T07:20:00Z')
        ]
      }
    })

    expect(wrapper.findAll('polyline')).toHaveLength(1)
    expect(wrapper.find('polyline').attributes('points')!.split(' ')).toHaveLength(2)
  })

  it('says so when nothing was logged lately', () => {
    const wrapper = mount(TimeScatter, {
      props: { now: NOW, label, dates: [new Date('2026-01-01T07:00:00Z')] }
    })

    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.text()).toContain('Nothing logged in the last 90 days')
  })
})
