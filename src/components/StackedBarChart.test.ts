import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { emptyCounts } from '../lib/moments'
import StackedBarChart from './StackedBarChart.vue'

const grow = () => new Promise((resolve) => setTimeout(resolve, 5))

const bars = [
  { counts: { ...emptyCounts(), good: 3, annoying: 1 }, label: 'Mon', tooltip: 'Monday' },
  { counts: emptyCounts(), label: 'Tue', tooltip: 'Tuesday' },
  { counts: { ...emptyCounts(), user_annoying: 2 }, label: 'Wed', tooltip: 'Wednesday' }
]

const columns = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('[data-bar] > div:first-child').map((column) => column.element as HTMLElement)

describe('StackedBarChart', () => {
  it('stacks a segment per kind, with columns in proportion to the tallest', async () => {
    const wrapper = mount(StackedBarChart, { props: { bars, label: 'Test' } })
    await grow()

    expect(columns(wrapper).map((column) => column.style.height)).toEqual(['100%', '2px', '50%'])
    const first = wrapper.findAll('[data-bar]')[0]!
    expect(first.findAll('[data-kind]').map((segment) => segment.attributes('data-kind'))).toEqual([
      'good',
      'annoying'
    ])
    expect((first.get('[data-kind="good"]').element as HTMLElement).style.flex).toBe('3 1 0px')
  })

  it('makes every column full height in share mode', async () => {
    const wrapper = mount(StackedBarChart, { props: { bars, label: 'Test', share: true } })
    await grow()

    expect(columns(wrapper).map((column) => column.style.height)).toEqual(['100%', '2px', '100%'])
    expect(wrapper.text()).toContain('100%')
  })

  it('breaks a column down on hover', async () => {
    const wrapper = mount(StackedBarChart, { props: { bars, label: 'Test' } })

    await wrapper.findAll('[data-bar]')[0]!.trigger('mouseenter')

    const tooltip = wrapper.get('[data-tooltip]').text()
    expect(tooltip).toContain('Monday')
    expect(tooltip).toMatch(/Good times\s*3/)
    expect(tooltip).toMatch(/Annoying times\s*1/)
    expect(tooltip).not.toContain('Something else')
  })

  it('has a legend, and a table for screen readers', () => {
    const wrapper = mount(StackedBarChart, { props: { bars, label: 'Moments this week' } })

    expect(wrapper.get('figcaption').text()).toContain('You being annoying')
    const table = wrapper.get('table')
    expect(table.get('caption').text()).toBe('Moments this week')
    expect(table.findAll('tbody tr')[2]!.text()).toBe('Wednesday00202')
  })
})
