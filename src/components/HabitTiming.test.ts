import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HabitTiming from './HabitTiming.vue'

// Tests run in UTC
const NOW = new Date('2026-10-19T15:00:00Z')
// One entry a day for the last `days` days, at a time that moves `step` minutes a day
const days = (count: number, start: string, step = 0) =>
  Array.from({ length: count }, (_, i) => {
    const date = new Date(`2026-10-18T${start}:00Z`)
    date.setUTCDate(date.getUTCDate() - (count - 1 - i))
    date.setUTCMinutes(date.getUTCMinutes() + i * step)
    return date
  })

describe('HabitTiming', () => {
  it('gives the usual time, a name for it, and how it moved', () => {
    // 60 days, getting a minute later each day
    const wrapper = mount(HabitTiming, { props: { dates: days(60, '06:00', 1), now: NOW } })

    expect(wrapper.find('header').text()).toContain('Usually between')
    expect(wrapper.find('header').text()).toContain('over the last 90 days')
    expect(wrapper.find('[data-persona]').text()).toBe('🐦 Early bird')
    expect(wrapper.find('dl').text()).toContain('29 min later')
    expect(wrapper.findAll('[data-cell]')).toHaveLength(7 * 24)
    expect(wrapper.findAll('[data-dot]')).toHaveLength(60)
  })

  it('names a time when the entries all come together', () => {
    const wrapper = mount(HabitTiming, { props: { dates: days(3, '21:30'), now: NOW } })

    expect(wrapper.find('header').text()).toContain('Usually around 21:30, over the last 90 days')
    expect(wrapper.find('[data-persona]').text()).toBe('🌆 Evening habit')
  })

  it('waits for a few entries', () => {
    const wrapper = mount(HabitTiming, { props: { dates: days(2, '07:00'), now: NOW } })

    expect(wrapper.text()).toContain('Log a few entries')
    expect(wrapper.find('[data-persona]').exists()).toBe(false)
    expect(wrapper.find('[data-cell]').exists()).toBe(false)
  })
})
