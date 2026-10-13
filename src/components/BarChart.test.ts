import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BarChart from './BarChart.vue'

const grow = () => new Promise((resolve) => setTimeout(resolve, 5))

describe('BarChart', () => {
  it('draws bars in proportion to the largest, after growing in', async () => {
    const wrapper = mount(BarChart, {
      props: { values: [2, 4, 0, 1], labels: ['a', 'b', 'c', 'd'], label: 'Test' }
    })
    const heights = () =>
      wrapper.findAll('[data-bar] > div').map((bar) => (bar.element as HTMLElement).style.height)

    expect(heights()).toEqual(['2px', '2px', '2px', '2px'])
    await grow()
    expect(heights()).toEqual(['50%', '100%', '2px', '25%'])
  })

  it('labels every nth bar and the scale', () => {
    const wrapper = mount(BarChart, {
      props: { values: [1, 2, 3, 4], labels: ['a', 'b', 'c', 'd'], tickEvery: 2, label: 'Test' }
    })

    const ticks = wrapper.findAll('[aria-hidden="true"] > span').map((tick) => tick.text())
    expect(ticks).toEqual(['a', '', 'c', ''])
    expect(wrapper.text()).toContain('4')
  })

  it('highlights one bar and explains a bar on hover', async () => {
    const wrapper = mount(BarChart, {
      props: {
        values: [1, 2],
        labels: ['Mon', 'Tue'],
        tooltips: ['Monday', 'Tuesday'],
        highlight: 1,
        label: 'Test'
      }
    })
    const bars = wrapper.findAll('[data-bar]')

    expect(bars[1]!.get('div').classes()).toContain('bg-habit')
    await bars[0]!.trigger('mouseenter')
    expect(wrapper.text()).toContain('Monday · 1')
  })
})
