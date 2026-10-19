// When in the day a habit happens, and how far apart its entries are. Like the rest of the stats
// it's computed in the viewer's local time, and everything takes `now` as an argument.
//
// Times of day go round in a circle: 23:50 is close to 00:10. So before taking a median or a range,
// the clock is cut open at the habit's quiet time, the longest stretch of the day without entries.
// For a habit done at night that's in the afternoon, and 23:50 and 00:10 stay neighbours.
import { getDay, getHours, startOfDay, startOfWeek, subDays } from 'date-fns'

export const DAY_MINUTES = 24 * 60
// With fewer entries, a "usual time" means little
export const MIN_ENTRIES = 3
// How far back the usual time looks: recent enough to follow a change of routine
export const RECENT_DAYS = 90
// A usual window wider than this is no particular time at all
const ANY_TIME = 8 * 60

const wrap = (minute: number) => ((minute % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES

export const minuteOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes()

// For putting times in the order of a day as people live it, which runs on past midnight: minutes
// since 04:00
export const dayOrder = (minute: number) => wrap(minute - 4 * 60)

// From a to b the short way round the clock, in minutes: negative when b is later than a
export const clockDifference = (a: number, b: number) => {
  const difference = wrap(a - b)
  return difference > DAY_MINUTES / 2 ? difference - DAY_MINUTES : difference
}

// Where this habit's day begins: the first entry after the longest gap
export const dayStart = (minutes: number[]) => {
  const sorted = [...minutes].sort((a, b) => a - b)
  let start = sorted[0] ?? 0
  let longest = sorted.length ? sorted[0]! + DAY_MINUTES - sorted.at(-1)! : DAY_MINUTES
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i]! - sorted[i - 1]!
    if (gap > longest) {
      longest = gap
      start = sorted[i]!
    }
  }
  return start
}

// Linear interpolation between the closest ranks of a sorted list
const quantile = (sorted: number[], p: number) => {
  const rank = (sorted.length - 1) * p
  const below = Math.floor(rank)
  const above = Math.min(sorted.length - 1, below + 1)
  return sorted[below]! + (sorted[above]! - sorted[below]!) * (rank - below)
}

export interface TypicalTime {
  // The median time, in minutes after midnight
  minute: number
  // The middle two thirds of entries fall between these
  from: number
  to: number
  // How long that window is, in minutes; it may run past midnight, so to - from won't do
  width: number
  anyTime: boolean
  count: number
}

export const typicalTime = (dates: Date[]): TypicalTime | undefined => {
  if (dates.length < MIN_ENTRIES) return undefined
  const minutes = dates.map(minuteOfDay)
  const start = dayStart(minutes)
  const shifted = minutes.map((minute) => wrap(minute - start)).sort((a, b) => a - b)
  const at = (p: number) => wrap(Math.round(quantile(shifted, p) + start))
  const width = Math.round(quantile(shifted, 5 / 6) - quantile(shifted, 1 / 6))
  return {
    minute: at(0.5),
    from: at(1 / 6),
    to: at(5 / 6),
    width,
    anyTime: width > ANY_TIME,
    count: dates.length
  }
}

const within = (dates: Date[], from: Date, to: Date) =>
  dates.filter((date) => date > from && date <= to)

// The last RECENT_DAYS days, today included, from midnight
export const windowStart = (now: Date) => startOfDay(subDays(now, RECENT_DAYS - 1))
export const inWindow = (dates: Date[], now: Date) => {
  const start = windowStart(now)
  return dates.filter((date) => date >= start && date <= now)
}

export interface UsualTime extends TypicalTime {
  // Over the last RECENT_DAYS, or over every entry when those were too few
  recent: boolean
}

export const usualTime = (dates: Date[], now: Date): UsualTime | undefined => {
  const recent = typicalTime(inWindow(dates, now))
  if (recent) return { ...recent, recent: true }
  const all = typicalTime(dates)
  return all && { ...all, recent: false }
}

// How the usual time moved: the last `days` days against the ones before, in minutes, negative
// when it got earlier. Undefined when either stretch has too few entries, or no usual time.
export const drift = (dates: Date[], now: Date, days = 30) => {
  const middle = subDays(now, days)
  const latest = typicalTime(within(dates, middle, now))
  const before = typicalTime(within(dates, subDays(middle, days), middle))
  if (!latest || !before || latest.anyTime || before.anyTime) return undefined
  return clockDifference(latest.minute, before.minute)
}

export interface Persona {
  emoji: string
  label: string
}

// A name for when a habit happens, from its usual time
export const persona = (usual: TypicalTime): Persona => {
  if (usual.anyTime) return { emoji: '🔁', label: 'All day long' }
  const hour = usual.minute / 60
  if (hour >= 4 && hour < 8) return { emoji: '🐦', label: 'Early bird' }
  if (hour >= 8 && hour < 11.5) return { emoji: '☀️', label: 'Morning habit' }
  if (hour >= 11.5 && hour < 14) return { emoji: '🥪', label: 'Lunchtime habit' }
  if (hour >= 14 && hour < 18) return { emoji: '🌤️', label: 'Afternoon habit' }
  if (hour >= 18 && hour < 22) return { emoji: '🌆', label: 'Evening habit' }
  return { emoji: '🦉', label: 'Night owl' }
}

// Entries per weekday (Monday first) and hour: 7 rows of 24
export const byWeekdayAndHour = (dates: Date[]) => {
  const grid = Array.from({ length: 7 }, () => new Array<number>(24).fill(0))
  for (const date of dates) grid[(getDay(date) + 6) % 7]![getHours(date)]!++
  return grid
}

// A time axis that fits the entries: whole hours from just before the first to just after the
// last, the clock cut open at the habit's quiet time. Values are minutes after the midnight before
// `top`, so they can run past 1440 for a habit that goes on past midnight.
export interface TimeAxis {
  top: number
  bottom: number
  ticks: number[]
  // Where an entry at this time of day goes on the axis
  place: (minute: number) => number
}

export const timeAxis = (minutes: number[]): TimeAxis => {
  const start = dayStart(minutes)
  const span = Math.max(0, ...minutes.map((minute) => wrap(minute - start)))
  let top = Math.floor(start / 60) * 60
  let bottom = Math.ceil((start + span) / 60) * 60
  if (bottom - top > 16 * 60) {
    // Spread over most of the day: show all of it, as the clock has it
    top = 0
    bottom = DAY_MINUTES
  }
  // At least two hours tall, so a few entries close together aren't squashed into a line. Hours
  // go on whichever side has less room, to keep the entries near the middle.
  const middle = start + span / 2
  while (bottom - top < 2 * 60) {
    if (middle - top < bottom - middle) top -= 60
    else bottom += 60
  }
  const hours = (bottom - top) / 60
  const step = (hours <= 4 ? 1 : hours <= 8 ? 2 : hours <= 16 ? 3 : 6) * 60
  const ticks: number[] = []
  for (let tick = Math.ceil(top / step) * step; tick <= bottom; tick += step) ticks.push(tick)
  return {
    top,
    bottom,
    ticks,
    place: (minute) => top + wrap(minute - top)
  }
}

// The median time of each week's entries (weeks start on Monday), for a line through them. Each
// sits at the average date of its week's entries, among them.
export const weeklyMedians = (dates: Date[], axis: TimeAxis, from: Date, to: Date) => {
  const weeks = new Map<number, Date[]>()
  for (const date of within(dates, from, to)) {
    const week = startOfWeek(date, { weekStartsOn: 1 }).getTime()
    weeks.set(week, [...(weeks.get(week) ?? []), date])
  }
  return [...weeks.entries()]
    .filter(([, entries]) => entries.length >= 2)
    .sort(([a], [b]) => a - b)
    .map(([week, entries]) => ({
      week: new Date(week),
      date: new Date(entries.reduce((sum, date) => sum + date.getTime(), 0) / entries.length),
      minute: quantile(
        entries.map((date) => axis.place(minuteOfDay(date))).sort((a, b) => a - b),
        0.5
      )
    }))
}

export interface Rhythm {
  // Minutes between each entry and the next, oldest first
  gaps: number[]
  // The median gap
  typical: number
  longest: { from: Date; to: Date; minutes: number }
}

export const rhythm = (dates: Date[]): Rhythm | undefined => {
  if (dates.length < 2) return undefined
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
  const gaps = sorted.slice(1).map((date, i) => (date.getTime() - sorted[i]!.getTime()) / 60_000)
  const longest = gaps.indexOf(Math.max(...gaps))
  return {
    gaps,
    typical: quantile(
      [...gaps].sort((a, b) => a - b),
      0.5
    ),
    longest: { from: sorted[longest]!, to: sorted[longest + 1]!, minutes: gaps[longest]! }
  }
}

const HOUR = 60
const DAY = DAY_MINUTES

// Buckets for the time between entries: from several a day to once in a while
export const GAP_BUCKETS = [
  { label: '<1 h', name: 'Under an hour', below: HOUR },
  { label: '1–6 h', name: '1 to 6 hours', below: 6 * HOUR },
  { label: '6–18 h', name: '6 to 18 hours', below: 18 * HOUR },
  { label: '1 day', name: 'About a day', below: 1.5 * DAY },
  { label: '2 days', name: 'About two days', below: 2.5 * DAY },
  { label: '3–6 d', name: '3 to 6 days', below: 6.5 * DAY },
  { label: '1 wk+', name: 'A week or more', below: Infinity }
]

export const gapHistogram = (gaps: number[]) => {
  const counts = new Array<number>(GAP_BUCKETS.length).fill(0)
  for (const gap of gaps) counts[GAP_BUCKETS.findIndex((bucket) => gap < bucket.below)]!++
  return counts
}

// 07:05, from minutes after midnight (wrapping round)
export const formatClock = (minute: number) => {
  const value = wrap(Math.round(minute))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(value / 60))}:${pad(value % 60)}`
}

// "Around 07:05": rounded to five minutes, as an estimate should be
export const formatAround = (minute: number) => formatClock(Math.round(minute / 5) * 5)

// "07:05–07:50", or one time when both ends round to it
export const formatWindow = (from: number, to: number) => {
  const [start, end] = [formatAround(from), formatAround(to)]
  return start === end ? start : `${start}–${end}`
}

// Under a minute, 25 min, 2 h 10 min, 14 h, 1.5 days, 12 days
export const formatDuration = (minutes: number) => {
  const rounded = Math.round(minutes)
  if (rounded < 1) return 'under a minute'
  if (rounded < 60) return `${rounded} min`
  if (rounded < DAY) {
    const hours = Math.floor(rounded / 60)
    const rest = rounded % 60
    return hours < 10 && rest ? `${hours} h ${rest} min` : `${Math.round(rounded / 60)} h`
  }
  const days = rounded / DAY
  const shown = days < 10 ? Math.round(days * 10) / 10 : Math.round(days)
  return `${shown} ${shown === 1 ? 'day' : 'days'}`
}
