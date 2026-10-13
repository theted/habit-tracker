import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { countByDay } from '../lib/stats'
import HeatmapGrid from './HeatmapGrid.vue'

const NOW = new Date('2026-10-13T15:00:00Z')

describe('HeatmapGrid', () => {
  it('draws a square per day for a year of weeks', () => {
    const wrapper = mount(HeatmapGrid, { props: { days: new Map(), now: NOW } })

    expect(wrapper.findAll('[data-level]')).toHaveLength(53 * 7)
  })

  it('shades days by how busy they were, and describes a day on hover', async () => {
    const days = countByDay([
      new Date('2026-10-12T08:00:00Z'),
      new Date('2026-10-12T09:00:00Z'),
      new Date('2026-10-13T08:00:00Z')
    ])
    const wrapper = mount(HeatmapGrid, { props: { days, now: NOW, weeks: 1 } })
    const cells = wrapper.findAll('[data-level]')

    expect(cells.map((cell) => cell.attributes('data-level'))).toEqual([
      '4',
      '2',
      '0',
      '0',
      '0',
      '0',
      '0'
    ])
    await cells[0]!.trigger('mouseenter')
    expect(wrapper.text()).toContain('2 entries on Monday 12 October 2026')
  })
})
