// Statistics for one habit, computed in the browser so that "today" is the viewer's day.
// Everything takes `now` as an argument, which keeps it pure and testable.
import {
  addDays,
  differenceInCalendarDays,
  format,
  getDay,
  getHours,
  getMonth,
  min as earliest,
  startOfDay,
  startOfWeek,
  subDays,
  subWeeks
} from 'date-fns'

export type DayCounts = Map<string, number>

export const dayKey = (date: Date) => format(date, 'yyyy-MM-dd')

export const countByDay = (dates: Date[]): DayCounts => {
  const counts: DayCounts = new Map()
  for (const date of dates) {
    const key = dayKey(date)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

const parseDayKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}

// Consecutive days with at least one entry, ending today. A streak that reached yesterday is still
// alive: today isn't over yet.
export const currentStreak = (days: DayCounts, now: Date) => {
  let day = startOfDay(now)
  if (!days.has(dayKey(day))) day = subDays(day, 1)
  let streak = 0
  while (days.has(dayKey(day))) {
    streak++
    day = subDays(day, 1)
  }
  return streak
}

export const bestStreak = (days: DayCounts) => {
  let best = 0
  let run = 0
  let previous: Date | undefined
  for (const key of [...days.keys()].sort()) {
    const day = parseDayKey(key)
    run = previous && differenceInCalendarDays(day, previous) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    previous = day
  }
  return best
}

export interface DayCount {
  date: Date
  count: number
}

// The last n days, oldest first, ending with today
export const lastDays = (days: DayCounts, n: number, now: Date): DayCount[] => {
  const today = startOfDay(now)
  return Array.from({ length: n }, (_, i) => {
    const date = subDays(today, n - 1 - i)
    return { date, count: days.get(dayKey(date)) ?? 0 }
  })
}

const tally = (size: number, dates: Date[], bucket: (date: Date) => number) => {
  const counts = new Array<number>(size).fill(0)
  for (const date of dates) counts[bucket(date)]!++
  return counts
}

export const byHour = (dates: Date[]) => tally(24, dates, getHours)
// Monday first
export const byWeekday = (dates: Date[]) => tally(7, dates, (date) => (getDay(date) + 6) % 7)
export const byMonth = (dates: Date[]) => tally(12, dates, getMonth)

// The index of the largest bucket, or undefined when every bucket is empty
export const peak = (counts: number[]) => {
  const top = Math.max(...counts)
  return top > 0 ? counts.indexOf(top) : undefined
}

export interface HeatmapCell {
  date: Date
  count: number
  // 0 is no entries; 1–4 are quarters of the busiest day in view
  level: 0 | 1 | 2 | 3 | 4
  future: boolean
}

// Columns of weeks, Monday to Sunday, ending with the current week
export const heatmap = (days: DayCounts, weeks: number, now: Date): HeatmapCell[][] => {
  const start = startOfWeek(subWeeks(now, weeks - 1), { weekStartsOn: 1 })
  const today = startOfDay(now)
  const columns = Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = addDays(start, week * 7 + weekday)
      return { date, count: days.get(dayKey(date)) ?? 0, future: date > today }
    })
  )
  const busiest = Math.max(1, ...columns.flat().map((cell) => cell.count))
  return columns.map((column) =>
    column.map((cell) => ({
      ...cell,
      level: (cell.count === 0
        ? 0
        : Math.min(4, Math.ceil((cell.count / busiest) * 4))) as HeatmapCell['level']
    }))
  )
}

export interface Summary {
  today: number
  last7: number
  last30: number
  total: number
  currentStreak: number
  bestStreak: number
  // Entries per day since the habit started (its creation or its first entry, whichever is
  // earlier), counting today
  dailyAverage: number
}

export const summarize = (dates: Date[], createdAt: Date, now: Date): Summary => {
  const days = countByDay(dates)
  const sum = (n: number) => lastDays(days, n, now).reduce((total, day) => total + day.count, 0)
  const start = dates.length ? earliest([createdAt, ...dates]) : createdAt
  const daysTracked = Math.max(1, differenceInCalendarDays(now, start) + 1)
  return {
    today: days.get(dayKey(now)) ?? 0,
    last7: sum(7),
    last30: sum(30),
    total: dates.length,
    currentStreak: currentStreak(days, now),
    bestStreak: bestStreak(days),
    dailyAverage: dates.length / daysTracked
  }
}
