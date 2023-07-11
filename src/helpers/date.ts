import { parseISO, getHours, getDay, getDate, getMonth } from 'date-fns'
import { fillArray, countOccurrences } from './utils'

export const countOccurrencesByHour = (dates: string[]): { [key: number]: number } => {
  const hours = dates.map((date) => getHours(parseISO(date)))
  return countOccurrences(hours)
}

export const countOccurrencesByDayOfWeek = (dates: string[]): { [key: number]: number } => {
  const daysOfWeek = dates.map((date) => getDay(parseISO(date)))
  return countOccurrences(daysOfWeek)
}

export const countOccurrencesByDayOfMonth = (dates: string[]): { [key: number]: number } => {
  const daysOfMonth = dates.map((date) => getDate(parseISO(date)))
  return countOccurrences(daysOfMonth)
}

export const countOccurrencesByMonth = (dates: string[]): { [key: number]: number } => {
  const daysOfMonth = dates.map((date) => getMonth(parseISO(date)))
  return countOccurrences(daysOfMonth)
}

export const calculateDates = (dates: Date[]) => ({
  occurrencesByHour: fillArray(countOccurrencesByHour(dates), 24),
  occurrencesByDayOfWeek: fillArray(countOccurrencesByDayOfWeek(dates), 7),
  occurrencesByDayOfMonth: fillArray(countOccurrencesByDayOfMonth(dates), 31),
  occurrencesByMonth: fillArray(countOccurrencesByMonth(dates), 31)
})
