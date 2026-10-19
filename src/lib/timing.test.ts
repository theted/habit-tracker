import { describe, expect, it } from 'vitest'
import {
  byWeekdayAndHour,
  clockDifference,
  dayStart,
  drift,
  formatAround,
  formatClock,
  formatDuration,
  formatWindow,
  gapHistogram,
  inWindow,
  persona,
  rhythm,
  timeAxis,
  typicalTime,
  usualTime,
  weeklyMedians
} from './timing'

// Tests run with TZ=UTC (vitest.config.ts). Monday 19 October 2026, mid-afternoon.
const NOW = new Date('2026-10-19T15:00:00Z')
const at = (iso: string) => new Date(iso)
// One entry a day at each time, on consecutive days ending yesterday
const daily = (...times: string[]) =>
  times.map((time, i) => {
    const date = new Date(NOW)
    date.setUTCDate(date.getUTCDate() - times.length + i)
    const [hours, minutes] = time.split(':').map(Number)
    date.setUTCHours(hours!, minutes!, 0, 0)
    return date
  })
const clock = (minute: number) => formatClock(minute)

describe('the usual time', () => {
  it('takes the median and the middle two thirds', () => {
    const usual = typicalTime(daily('06:00', '06:30', '07:00', '07:10', '07:30', '08:00', '11:00'))!

    expect(clock(usual.minute)).toBe('07:10')
    expect([clock(usual.from), clock(usual.to)]).toEqual(['06:30', '08:00'])
    expect(usual.width).toBe(90)
    expect(usual.anyTime).toBe(false)
    expect(usual.count).toBe(7)
  })

  it('keeps a habit that crosses midnight together', () => {
    const usual = typicalTime(daily('23:20', '23:50', '00:10', '00:40', '23:40'))!

    expect(clock(usual.minute)).toBe('23:50')
    expect([clock(usual.from), clock(usual.to)]).toEqual(['23:33', '00:20'])
    expect(usual.width).toBe(47)
  })

  it('needs a few entries, and says when there is no particular time', () => {
    expect(typicalTime(daily('07:00', '07:30'))).toBeUndefined()
    expect(typicalTime(daily('02:00', '06:00', '10:00', '14:00', '18:00', '22:00'))!.anyTime).toBe(
      true
    )
  })

  it('cuts the day open after its longest gap', () => {
    expect(dayStart([1380, 30, 60])).toBe(1380)
    // 08:00 to 21:00 is longer than 21:00 to 07:00
    expect(dayStart([420, 480, 1260])).toBe(1260)
  })

  it('looks at the last 90 days, or everything when they hold too little', () => {
    const old = [at('2026-01-05T21:00Z'), at('2026-01-06T21:00Z'), at('2026-01-07T21:00Z')]
    const recent = daily('07:00', '07:10', '07:20')

    expect(usualTime([...old, ...recent], NOW)).toMatchObject({ minute: 430, recent: true })
    expect(usualTime([...old, ...recent.slice(1)], NOW)).toMatchObject({
      minute: 1260,
      recent: false
    })
    expect(inWindow([at('2026-07-22T00:00Z'), at('2026-07-21T23:59Z')], NOW)).toHaveLength(1)
  })

  it('names the time of day', () => {
    const named = (time: string) => persona(typicalTime(daily(time, time, time))!).label
    expect(['05:30', '09:00', '12:30', '15:00', '20:00', '23:30', '02:00'].map(named)).toEqual([
      'Early bird',
      'Morning habit',
      'Lunchtime habit',
      'Afternoon habit',
      'Evening habit',
      'Night owl',
      'Night owl'
    ])
    expect(persona({ ...typicalTime(daily('09:00', '09:00', '09:00'))!, anyTime: true })).toEqual({
      emoji: '🔁',
      label: 'All day long'
    })
  })
})

describe('drift', () => {
  // Thirty days at one time, then thirty at another
  const months = (before: string, latest: string) => [
    ...daily(...Array<string>(30).fill(before)).map((date) => new Date(+date - 30 * 86_400_000)),
    ...daily(...Array<string>(30).fill(latest))
  ]

  it('compares the last 30 days with the 30 before', () => {
    expect(drift(months('07:30', '07:00'), NOW)).toBe(-30)
    expect(drift(months('23:40', '00:20'), NOW)).toBe(40)
  })

  it('needs enough entries in both', () => {
    expect(drift(daily('07:00', '07:00', '07:00'), NOW)).toBeUndefined()
  })

  it('goes the short way round the clock', () => {
    expect(clockDifference(10, 1430)).toBe(20)
    expect(clockDifference(1430, 10)).toBe(-20)
  })
})

describe('the punch card', () => {
  it('counts entries by weekday, Monday first, and hour', () => {
    const grid = byWeekdayAndHour([
      at('2026-10-19T07:15Z'),
      at('2026-10-19T07:45Z'),
      at('2026-10-25T23:59Z')
    ])

    expect(grid).toHaveLength(7)
    expect(grid[0]![7]).toBe(2)
    expect(grid[6]![23]).toBe(1)
    expect(grid.flat().reduce((sum, count) => sum + count, 0)).toBe(3)
  })
})

describe('the time axis', () => {
  it('fits the entries in whole hours', () => {
    const axis = timeAxis([380, 400, 470])

    expect([axis.top, axis.bottom]).toEqual([360, 480])
    expect(axis.ticks).toEqual([360, 420, 480])
    expect(axis.place(400)).toBe(400)
  })

  it('runs past midnight for a night habit', () => {
    const axis = timeAxis([1350, 1420, 20, 75])

    expect([axis.top, axis.bottom]).toEqual([1320, 1560])
    expect(axis.ticks.map(clock)).toEqual(['22:00', '23:00', '00:00', '01:00', '02:00'])
    expect(axis.place(20)).toBe(1460)
    expect(axis.place(1350)).toBe(1350)
  })

  it('is at least two hours tall, and shows the whole day for all-day habits', () => {
    const single = timeAxis([425])
    expect([single.top, single.bottom]).toEqual([360, 480])
    const late = timeAxis([468, 470])
    expect([late.top, late.bottom]).toEqual([420, 540])

    const allDay = timeAxis([60, 300, 600, 900, 1200, 1400])
    expect([allDay.top, allDay.bottom]).toEqual([0, 1440])
    expect(allDay.ticks).toEqual([0, 360, 720, 1080, 1440])
  })

  it('draws a line through the median of each week with two or more entries', () => {
    const dates = [
      at('2026-10-05T07:00Z'),
      at('2026-10-06T07:20Z'),
      at('2026-10-07T08:00Z'),
      // A week with one entry is skipped
      at('2026-10-14T09:00Z')
    ]
    const axis = timeAxis(dates.map((date) => date.getUTCHours() * 60 + date.getUTCMinutes()))

    expect(weeklyMedians(dates, axis, at('2026-07-22T00:00Z'), NOW)).toEqual([
      { week: at('2026-10-05T00:00Z'), date: at('2026-10-06T07:26:40Z'), minute: 440 }
    ])
  })
})

describe('rhythm', () => {
  it('finds the typical and the longest gap', () => {
    const result = rhythm([
      at('2026-10-01T08:00Z'),
      at('2026-10-02T08:00Z'),
      at('2026-10-12T09:00Z'),
      at('2026-10-03T08:00Z')
    ])!

    expect(result.gaps).toEqual([1440, 1440, 9 * 1440 + 60])
    expect(result.typical).toBe(1440)
    expect(result.longest).toEqual({
      from: at('2026-10-03T08:00Z'),
      to: at('2026-10-12T09:00Z'),
      minutes: 9 * 1440 + 60
    })
    expect(rhythm([NOW])).toBeUndefined()
  })

  it('buckets gaps from minutes to weeks', () => {
    expect(gapHistogram([30, 120, 600, 1440, 2900, 5000, 20_000, 1500])).toEqual([
      1, 1, 1, 2, 1, 1, 1
    ])
  })
})

describe('formatting', () => {
  it('writes clock times and estimates', () => {
    expect(formatClock(425)).toBe('07:05')
    expect(formatClock(1440 + 30)).toBe('00:30')
    expect(formatClock(-30)).toBe('23:30')
    expect(formatAround(427)).toBe('07:05')
    expect(formatAround(1438)).toBe('00:00')
    expect(formatWindow(380, 470)).toBe('06:20–07:50')
    expect(formatWindow(468, 471)).toBe('07:50')
  })

  it('writes durations from minutes to days', () => {
    expect([0.2, 25, 130, 840, 1440, 2160, 17_280].map(formatDuration)).toEqual([
      'under a minute',
      '25 min',
      '2 h 10 min',
      '14 h',
      '1 day',
      '1.5 days',
      '12 days'
    ])
  })
})
