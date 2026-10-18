// What AI agents report over MCP, and the statistics the Agents page draws from them. Like the
// habit stats, everything takes `now` as an argument, so it's pure and testable.
import {
  getDay,
  getHours,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks
} from 'date-fns'
import type { Moment } from '../types'

// Keep in step with MOMENT_KINDS in server/validation.ts. The order is the stacking order, bottom
// up, and the legend's; the colours (--kind-* in style.css) were checked for colour-blind
// separation in that order.
export const MOMENT_KINDS = ['good', 'annoying', 'user_annoying', 'other'] as const
export type MomentKind = (typeof MOMENT_KINDS)[number]

export const KINDS: Record<MomentKind, { label: string; plural: string; emoji: string }> = {
  good: { label: 'Good time', plural: 'Good times', emoji: '😊' },
  annoying: { label: 'Annoying time', plural: 'Annoying times', emoji: '😤' },
  user_annoying: { label: 'You being annoying', plural: 'You being annoying', emoji: '🙄' },
  other: { label: 'Something else', plural: 'Something else', emoji: '💬' }
}

export const kindColor = (kind: MomentKind) => `var(--kind-${kind.replace('_', '-')})`

export type KindCounts = Record<MomentKind, number>

export const emptyCounts = (): KindCounts => ({ good: 0, annoying: 0, user_annoying: 0, other: 0 })

export const totalOf = (counts: KindCounts) =>
  MOMENT_KINDS.reduce((sum, kind) => sum + counts[kind], 0)

const isKind = (kind: string): kind is MomentKind => kind in KINDS

export const countKinds = (moments: Moment[]) => {
  const counts = emptyCounts()
  for (const moment of moments) if (isKind(moment.kind)) counts[moment.kind]++
  return counts
}

// Good times as a share of the moments with a mood (good, annoying, you being annoying), 0–1;
// undefined when there are none
export const goodShare = (counts: KindCounts) => {
  const rated = counts.good + counts.annoying + counts.user_annoying
  return rated ? counts.good / rated : undefined
}

export type Period = 'week' | 'month' | 'quarter' | 'year'
type Unit = 'day' | 'week' | 'month'

export const PERIODS: Record<Period, { label: string; span: string; unit: Unit; count: number }> = {
  week: { label: '7 days', span: 'the last 7 days', unit: 'day', count: 7 },
  month: { label: '30 days', span: 'the last 30 days', unit: 'day', count: 30 },
  quarter: { label: '12 weeks', span: 'the last 12 weeks', unit: 'week', count: 12 },
  year: { label: 'Year', span: 'the last 12 months', unit: 'month', count: 12 }
}

const UNITS: Record<Unit, { start: (date: Date) => Date; sub: (date: Date, n: number) => Date }> = {
  day: { start: startOfDay, sub: subDays },
  week: { start: (date) => startOfWeek(date, { weekStartsOn: 1 }), sub: subWeeks },
  month: { start: startOfMonth, sub: subMonths }
}

export interface Bucket {
  start: Date
  counts: KindCounts
}

// The period's days, weeks or months, oldest first, ending with the current one
export const buckets = (moments: Moment[], period: Period, now: Date): Bucket[] => {
  const { unit, count } = PERIODS[period]
  const { start, sub } = UNITS[unit]
  const result = Array.from({ length: count }, (_, i) => ({
    start: start(sub(now, count - 1 - i)),
    counts: emptyCounts()
  }))
  const index = new Map(result.map((bucket) => [bucket.start.getTime(), bucket]))
  for (const moment of moments) {
    const bucket = index.get(start(new Date(moment.date)).getTime())
    if (bucket && isKind(moment.kind)) bucket.counts[moment.kind]++
  }
  return result
}

// Where the period starts, and the one before it of the same length
export const periodRange = (period: Period, now: Date) => {
  const { unit, count } = PERIODS[period]
  const { start, sub } = UNITS[unit]
  const from = start(sub(now, count - 1))
  return { from, previousFrom: sub(from, count) }
}

export const inRange = (moments: Moment[], from: Date, to?: Date) =>
  moments.filter((moment) => {
    const date = new Date(moment.date)
    return date >= from && (!to || date < to)
  })

const tallyKinds = (size: number, moments: Moment[], bucket: (date: Date) => number) => {
  const counts = Array.from({ length: size }, emptyCounts)
  for (const moment of moments) {
    if (isKind(moment.kind)) counts[bucket(new Date(moment.date))]![moment.kind]++
  }
  return counts
}

export const kindsByHour = (moments: Moment[]) => tallyKinds(24, moments, getHours)
// Monday first
export const kindsByWeekday = (moments: Moment[]) =>
  tallyKinds(7, moments, (date) => (getDay(date) + 6) % 7)

// The index whose chosen kinds add up the most, or undefined when they're all zero
export const peakOf = (counts: KindCounts[], kinds: readonly MomentKind[] = MOMENT_KINDS) => {
  const sums = counts.map((bucket) => kinds.reduce((sum, kind) => sum + bucket[kind], 0))
  const top = Math.max(0, ...sums)
  return top > 0 ? sums.indexOf(top) : undefined
}

export interface Group {
  name: string
  counts: KindCounts
  total: number
}

// Moments per project or agent, busiest first. Past `limit` groups the rest are folded into one.
export const groupMoments = (
  moments: Moment[],
  field: 'project' | 'agent',
  { limit = 6, unnamed = 'Not named', others = 'Others' } = {}
): Group[] => {
  const groups = new Map<string, Moment[]>()
  for (const moment of moments) {
    const name = moment[field] || unnamed
    groups.set(name, [...(groups.get(name) ?? []), moment])
  }
  const sorted = [...groups].map(([name, list]) => {
    const counts = countKinds(list)
    return { name, counts, total: totalOf(counts) }
  })
  sorted.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
  if (sorted.length <= limit) return sorted
  const rest = sorted.slice(limit - 1)
  const counts = emptyCounts()
  for (const group of rest) for (const kind of MOMENT_KINDS) counts[kind] += group.counts[kind]
  return [
    ...sorted.slice(0, limit - 1),
    { name: `${others} (${rest.length})`, counts, total: totalOf(counts) }
  ]
}
