import { useHabitsStore } from '../stores/habits'
import { useToastStore } from '../stores/toasts'
import type { Habit } from '../types'

// Logging and un-logging entries, each with a toast that can undo it
export const useTracking = () => {
  const store = useHabitsStore()
  const toasts = useToastStore()

  const track = async (habit: Habit, date?: Date) => {
    try {
      const saved = await store.track(habit.id, date)
      toasts.show(`${habit.emoji} ${habit.title} logged`, {
        action: { label: 'Undo', run: () => store.untrack(habit.id, saved.id) }
      })
    } catch (err) {
      toasts.error(err, `Couldn't log ${habit.title}`)
    }
  }

  const untrack = async (habit: Habit, trackId: number) => {
    try {
      const removed = await store.untrack(habit.id, trackId)
      if (!removed) return
      toasts.show('Entry removed', {
        action: { label: 'Undo', run: () => store.track(habit.id, new Date(removed.date)) }
      })
    } catch (err) {
      toasts.error(err, "Couldn't remove the entry")
    }
  }

  return { track, untrack }
}
