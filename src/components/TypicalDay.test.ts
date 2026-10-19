import { afterEach, describe, expect, it } from 'vitest'
import { makeHabit, mountWithApp } from '../test/utils'
import TypicalDay from './TypicalDay.vue'

// Tests run in UTC. Monday 19 October 2026, 15:00.
const NOW = new Date('2026-10-19T15:00:00Z')
// An entry on each of the three days before today, at this time
const at = (time: string, ...extra: string[]) =>
  ['2026-10-16', '2026-10-17', '2026-10-18', ...extra].map((day, i) => ({
    id: i,
    date: `${day.length > 10 ? day : `${day}T${time}:00Z`}`
  }))

let unmount: () => void
afterEach(() => unmount?.())

const mountDay = async (habits: ReturnType<typeof makeHabit>[]) => {
  const { wrapper } = await mountWithApp(TypicalDay, { habits, now: NOW })
  unmount = () => wrapper.unmount()
  return wrapper
}

describe('TypicalDay', () => {
  it('lists habits by their usual time, the day running on past midnight', async () => {
    const wrapper = await mountDay([
      makeHabit({ title: 'Read', tracks: at('23:30') }),
      makeHabit({ title: 'Late-night snack', tracks: at('01:10') }),
      makeHabit({ title: 'Run', tracks: at('07:00') }),
      makeHabit({ title: 'Lunch walk', tracks: at('12:15') }),
      makeHabit({ title: 'New', tracks: at('09:00').slice(0, 2) })
    ])

    const rows = wrapper.findAll('[data-row]').map((row) => row.find('a .truncate').text())
    expect(rows).toEqual(['Run', 'Lunch walk', 'Read', 'Late-night snack'])
    expect(wrapper.findAll('[data-row]')[0]!.text()).toContain('07:00')
  })

  it("says what's next, skipping what's already done today", async () => {
    const wrapper = await mountDay([
      makeHabit({ title: 'Stretch', emoji: '🤸', tracks: at('16:00', '2026-10-19T14:50:00Z') }),
      makeHabit({ title: 'Read', emoji: '📚', tracks: at('21:40') })
    ])

    expect(wrapper.find('[data-insight]').text()).toBe('Next up: 📚 Read, usually around 21:40')
    expect(wrapper.findAll('[data-row]')[0]!.text()).toContain('done today')
  })

  it('stays hidden until a habit has a usual time', async () => {
    const wrapper = await mountDay([makeHabit({ tracks: at('07:00').slice(0, 2) })])

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
