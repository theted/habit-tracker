import { describe, expect, it } from 'vitest'
import type { Moment } from '../types'
import {
  buckets,
  countKinds,
  emptyCounts,
  goodShare,
  groupMoments,
  inRange,
  kindsByHour,
  kindsByWeekday,
  peakOf,
  periodRange,
  type MomentKind
} from './moments'

// Thursday 15 October 2026, mid-afternoon (tests run in UTC)
const NOW = new Date('2026-10-15T15:00:00Z')

let nextId = 1
const moment = (date: string, kind: MomentKind = 'good', extra: Partial<Moment> = {}): Moment => ({
  id: nextId++,
  kind,
  note: 'Something happened',
  agent: null,
  project: null,
  date: new Date(date).toISOString(),
  ...extra
})

describe('counting kinds', () => {
  it('counts each kind', () => {
    const counts = countKinds([
      moment('2026-10-15T09:00Z', 'good'),
      moment('2026-10-15T10:00Z', 'good'),
      moment('2026-10-15T11:00Z', 'user_annoying')
    ])
    expect(counts).toEqual({ good: 2, annoying: 0, user_annoying: 1, other: 0 })
  })

  it('works out the share of good moods, leaving "other" out', () => {
    expect(goodShare({ good: 3, annoying: 0, user_annoying: 1, other: 10 })).toBe(0.75)
    expect(goodShare({ ...emptyCounts(), other: 2 })).toBeUndefined()
  })
})

describe('buckets', () => {
  it('splits the last 7 days into days, ending today', () => {
    const result = buckets(
      [
        moment('2026-10-15T09:00Z', 'good'),
        moment('2026-10-15T23:59Z', 'annoying'),
        moment('2026-10-09T00:00Z', 'other'),
        // A day too early
        moment('2026-10-08T23:59Z', 'good')
      ],
      'week',
      NOW
    )

    expect(result).toHaveLength(7)
    expect(result[0]!.start).toEqual(new Date('2026-10-09T00:00Z'))
    expect(result[0]!.counts.other).toBe(1)
    expect(result[6]!.counts).toEqual({ good: 1, annoying: 1, user_annoying: 0, other: 0 })
    expect(result.slice(1, 6).every((bucket) => !bucket.counts.good)).toBe(true)
  })

  it('splits 12 weeks into weeks starting on Mondays', () => {
    const result = buckets(
      [moment('2026-10-12T08:00Z'), moment('2026-07-20T08:00Z')],
      'quarter',
      NOW
    )

    expect(result).toHaveLength(12)
    expect(result[11]!.start).toEqual(new Date('2026-10-12T00:00Z'))
    expect(result[0]!.start).toEqual(new Date('2026-07-27T00:00Z'))
    expect(result[11]!.counts.good).toBe(1)
    // 20 July is in the week before the first bucket
    expect(result.reduce((sum, bucket) => sum + bucket.counts.good, 0)).toBe(1)
  })

  it('splits the year into months', () => {
    const result = buckets([moment('2025-11-30T12:00Z'), moment('2025-10-31T12:00Z')], 'year', NOW)

    expect(result.map((bucket) => bucket.start.getMonth())).toEqual([
      10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
    ])
    expect(result[0]!.counts.good).toBe(1)
  })

  it('finds where a period and the one before it start', () => {
    expect(periodRange('month', NOW)).toEqual({
      from: new Date('2026-09-16T00:00Z'),
      previousFrom: new Date('2026-08-17T00:00Z')
    })
    const moments = [moment('2026-08-17T00:00Z'), moment('2026-09-16T00:00Z')]
    expect(inRange(moments, new Date('2026-08-17T00:00Z'), new Date('2026-09-16T00:00Z'))).toEqual([
      moments[0]
    ])
  })
})

describe('patterns', () => {
  const moments = [
    moment('2026-10-12T23:10Z', 'user_annoying'),
    moment('2026-10-13T23:40Z', 'user_annoying'),
    moment('2026-10-14T09:00Z', 'good'),
    moment('2026-10-14T09:30Z', 'good'),
    moment('2026-10-14T09:45Z', 'good')
  ]

  it('tallies kinds by hour and by weekday, Monday first', () => {
    expect(kindsByHour(moments)[23]!.user_annoying).toBe(2)
    expect(kindsByHour(moments)[9]!.good).toBe(3)
    expect(kindsByWeekday(moments).map((counts) => counts.good + counts.user_annoying)).toEqual([
      1, 1, 3, 0, 0, 0, 0
    ])
  })

  it('finds the peak for some kinds or all of them', () => {
    const hours = kindsByHour(moments)
    expect(peakOf(hours)).toBe(9)
    expect(peakOf(hours, ['user_annoying'])).toBe(23)
    expect(peakOf(hours, ['annoying'])).toBeUndefined()
  })
})

describe('grouping', () => {
  it('groups by project, busiest first, with unnamed ones together', () => {
    const groups = groupMoments(
      [
        moment('2026-10-14T09:00Z', 'good', { project: 'kolla' }),
        moment('2026-10-14T10:00Z', 'annoying', { project: 'habits' }),
        moment('2026-10-14T11:00Z', 'annoying', { project: 'habits' }),
        moment('2026-10-14T12:00Z', 'other')
      ],
      'project',
      { unnamed: 'No project' }
    )

    expect(groups.map((group) => [group.name, group.total])).toEqual([
      ['habits', 2],
      ['kolla', 1],
      ['No project', 1]
    ])
    expect(groups[0]!.counts.annoying).toBe(2)
  })

  it('folds the tail into one group', () => {
    const moments = ['a', 'b', 'c', 'd'].map((agent) =>
      moment('2026-10-14T09:00Z', 'good', { agent })
    )

    const groups = groupMoments(moments, 'agent', { limit: 3 })

    expect(groups.map((group) => [group.name, group.total])).toEqual([
      ['a', 1],
      ['b', 1],
      ['Others (2)', 2]
    ])
  })
})
