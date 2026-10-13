import { describe, expect, it } from 'vitest'
import {
  bestStreak,
  byHour,
  byMonth,
  byWeekday,
  countByDay,
  currentStreak,
  dayKey,
  heatmap,
  lastDays,
  peak,
  summarize
} from './stats'

// Tests run with TZ=UTC (vitest.config.ts). Tuesday 13 October 2026, mid-afternoon.
const NOW = new Date('2026-10-13T15:00:00Z')
const at = (iso: string) => new Date(iso)
const days = (...keys: string[]) => countByDay(keys.map((key) => at(`${key}T12:00:00Z`)))

describe('countByDay', () => {
  it('buckets entries by local calendar day', () => {
    const counts = countByDay([
      at('2026-10-12T23:59:00Z'),
      at('2026-10-13T00:01:00Z'),
      at('2026-10-13T18:00:00Z')
    ])
    expect(Object.fromEntries(counts)).toEqual({ '2026-10-12': 1, '2026-10-13': 2 })
  })
})

describe('currentStreak', () => {
  it('counts back from today', () => {
    expect(currentStreak(days('2026-10-11', '2026-10-12', '2026-10-13'), NOW)).toBe(3)
  })

  it('keeps a streak that reached yesterday alive', () => {
    expect(currentStreak(days('2026-10-11', '2026-10-12'), NOW)).toBe(2)
  })

  it('is zero once a whole day has been missed', () => {
    expect(currentStreak(days('2026-10-10', '2026-10-11'), NOW)).toBe(0)
  })

  it('is zero without entries', () => {
    expect(currentStreak(new Map(), NOW)).toBe(0)
  })
})

describe('bestStreak', () => {
  it('finds the longest run, across month boundaries', () => {
    const counts = days(
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-10',
      '2026-09-11'
    )
    expect(bestStreak(counts)).toBe(4)
  })

  it('is zero without entries', () => {
    expect(bestStreak(new Map())).toBe(0)
  })
})

describe('lastDays', () => {
  it('returns n days, oldest first, ending today', () => {
    const result = lastDays(days('2026-10-13', '2026-10-13', '2026-10-11'), 3, NOW)
    expect(result.map((day) => [dayKey(day.date), day.count])).toEqual([
      ['2026-10-11', 1],
      ['2026-10-12', 0],
      ['2026-10-13', 2]
    ])
  })
})

describe('distributions', () => {
  const dates = [
    at('2026-10-12T08:15:00Z'), // Monday
    at('2026-10-13T08:45:00Z'), // Tuesday
    at('2026-10-18T21:00:00Z'), // Sunday
    at('2026-01-05T08:00:00Z') // Monday in January
  ]

  it('counts by hour of day', () => {
    const hours = byHour(dates)
    expect(hours).toHaveLength(24)
    expect(hours[8]).toBe(3)
    expect(hours[21]).toBe(1)
  })

  it('counts by weekday, Monday first', () => {
    expect(byWeekday(dates)).toEqual([2, 1, 0, 0, 0, 0, 1])
  })

  it('counts by month, January first', () => {
    const months = byMonth(dates)
    expect(months).toHaveLength(12)
    expect(months[0]).toBe(1)
    expect(months[9]).toBe(3)
  })

  it('finds the peak bucket, or none when everything is empty', () => {
    expect(peak([0, 3, 1])).toBe(1)
    expect(peak([0, 0, 0])).toBeUndefined()
  })
})

describe('heatmap', () => {
  it('lays out whole weeks, Monday to Sunday, ending this week', () => {
    const columns = heatmap(new Map(), 2, NOW)

    expect(columns).toHaveLength(2)
    expect(columns.every((column) => column.length === 7)).toBe(true)
    expect(dayKey(columns[0]![0]!.date)).toBe('2026-10-05')
    expect(dayKey(columns[1]![6]!.date)).toBe('2026-10-18')
  })

  it('marks days after today as future', () => {
    const thisWeek = heatmap(new Map(), 1, NOW)[0]!
    expect(thisWeek.map((cell) => cell.future)).toEqual([
      false,
      false,
      true,
      true,
      true,
      true,
      true
    ])
  })

  it('scales levels against the busiest day in view', () => {
    const counts = countByDay([
      ...Array.from({ length: 4 }, () => at('2026-10-12T09:00:00Z')),
      at('2026-10-13T09:00:00Z')
    ])
    const [monday, tuesday, wednesday] = heatmap(counts, 1, NOW)[0]!
    expect([monday!.level, tuesday!.level, wednesday!.level]).toEqual([4, 1, 0])
  })
})

describe('summarize', () => {
  it('sums today, the last week and month, and the streaks', () => {
    const dates = [
      at('2026-10-13T08:00:00Z'),
      at('2026-10-13T09:00:00Z'),
      at('2026-10-12T08:00:00Z'),
      at('2026-10-01T08:00:00Z'),
      at('2026-08-01T08:00:00Z')
    ]

    expect(summarize(dates, at('2026-08-01T00:00:00Z'), NOW)).toMatchObject({
      today: 2,
      last7: 3,
      last30: 4,
      total: 5,
      currentStreak: 2,
      bestStreak: 2
    })
  })

  it('averages per day from the earlier of creation and the first entry, counting today', () => {
    const dates = [at('2026-10-11T08:00:00Z'), at('2026-10-13T08:00:00Z')]

    // Created after its first (backdated) entry: three days, 11–13 October
    expect(summarize(dates, at('2026-10-12T00:00:00Z'), NOW).dailyAverage).toBeCloseTo(2 / 3)
  })

  it('is all zeros for a habit created today without entries', () => {
    expect(summarize([], at('2026-10-13T10:00:00Z'), NOW)).toEqual({
      today: 0,
      last7: 0,
      last30: 0,
      total: 0,
      currentStreak: 0,
      bestStreak: 0,
      dailyAverage: 0
    })
  })
})
