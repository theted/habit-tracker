import { useMinuteClock } from './useMinuteClock'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { countByDay, summarize } from '../lib/stats'
import type { Habit } from '../types'

export const useHabitStats = (habit: MaybeRefOrGetter<Habit>) => {
  // Ticks once a minute, so a page left open rolls over to the next day by itself
  const now = useMinuteClock()
  const dates = computed(() => toValue(habit).tracks.map((track) => new Date(track.date)))
  const days = computed(() => countByDay(dates.value))
  const summary = computed(() =>
    summarize(dates.value, new Date(toValue(habit).createdAt), now.value)
  )
  return { now, dates, days, summary }
}
