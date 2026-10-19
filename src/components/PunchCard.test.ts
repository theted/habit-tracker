import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PunchCard from './PunchCard.vue'

// Tests run in UTC. 19 October 2026 is a Monday.
const dates = [
  new Date('2026-10-19T07:10:00Z'),
  new Date('2026-10-19T07:40:00Z'),
  new Date('2026-10-12T07:05:00Z'),
  new Date('2026-10-24T21:30:00Z')
]

describe('PunchCard', () => {
  it('draws a cell per weekday and hour, with a dot where there are entries', () => {
    const wrapper = mount(PunchCard, { props: { dates } })
    const cells = wrapper.findAll('[data-cell]')

    expect(cells).toHaveLength(7 * 24)
    expect(cells[7]!.attributes('data-count')).toBe('3')
    // Saturday, 21:00
    expect(cells[5 * 24 + 21]!.attributes('data-count')).toBe('1')
    expect(cells.filter((cell) => cell.attributes('data-count') !== '0')).toHaveLength(2)
  })

  it('names the busiest slot, and describes a cell on hover', async () => {
    const wrapper = mount(PunchCard, { props: { dates } })

    expect(wrapper.find('figcaption').text()).toContain(
      'Busiest on Mondays between 07:00 and 08:00'
    )
    await wrapper.findAll('[data-cell]')[5 * 24 + 21]!.trigger('mouseenter')
    expect(wrapper.find('figcaption').text()).toContain('Saturdays 21:00–21:59 · 1 entry')
  })

  it('has the counts in a table for screen readers', () => {
    const wrapper = mount(PunchCard, { props: { dates } })

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(7)
    expect(rows[0]!.find('th').text()).toBe('Monday')
    expect(rows[0]!.findAll('td')[7]!.text()).toBe('3')
  })
})
