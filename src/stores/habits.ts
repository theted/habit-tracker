import { defineStore } from 'pinia'
import { ref } from 'vue'
import { habitsApi } from '../api/habits'
import type { Habit, HabitInput, Track } from '../types'

// Keeps tracks oldest first, which is the order the API returns them in
const insertTrack = (habit: Habit, track: Track) => {
  const index = habit.tracks.findIndex((existing) => existing.date > track.date)
  habit.tracks.splice(index === -1 ? habit.tracks.length : index, 0, track)
}

const removeTrack = (habit: Habit, trackId: number) => {
  const index = habit.tracks.findIndex((track) => track.id === trackId)
  return index === -1 ? undefined : habit.tracks.splice(index, 1)[0]
}

export const useHabitsStore = defineStore('habits', () => {
  const habits = ref<Habit[]>([])
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')

  const byId = (id: number) => habits.value.find((habit) => habit.id === id)

  const load = async () => {
    status.value = habits.value.length ? status.value : 'loading'
    try {
      habits.value = await habitsApi.list()
      status.value = 'ready'
    } catch (err) {
      status.value = 'error'
      throw err
    }
  }

  // Loads once; views call this on mount
  const ensureLoaded = () => (status.value === 'idle' ? load() : Promise.resolve())

  const create = async (input: HabitInput) => {
    const habit = await habitsApi.create(input)
    habits.value.push(habit)
    return habit
  }

  const update = async (id: number, input: Partial<HabitInput>) => {
    const updated = await habitsApi.update(id, input)
    const index = habits.value.findIndex((habit) => habit.id === id)
    if (index !== -1) habits.value[index] = updated
    return updated
  }

  const remove = async (id: number) => {
    await habitsApi.remove(id)
    habits.value = habits.value.filter((habit) => habit.id !== id)
  }

  // Optimistic: the entry shows up at once, under a temporary negative id, and is taken back out
  // if the server refuses it
  let temporaryId = -1
  const track = async (habitId: number, date?: Date) => {
    const habit = byId(habitId)
    if (!habit) throw new Error('Unknown habit')
    const pending: Track = { id: temporaryId--, date: (date ?? new Date()).toISOString() }
    insertTrack(habit, pending)
    try {
      const saved = await habitsApi.addTrack(habitId, date)
      removeTrack(habit, pending.id)
      insertTrack(habit, { id: saved.id, date: saved.date })
      return saved
    } catch (err) {
      removeTrack(habit, pending.id)
      throw err
    }
  }

  const untrack = async (habitId: number, trackId: number) => {
    const habit = byId(habitId)
    const removed = habit && removeTrack(habit, trackId)
    if (!habit || !removed) return
    try {
      await habitsApi.removeTrack(trackId)
    } catch (err) {
      insertTrack(habit, removed)
      throw err
    }
    return removed
  }

  // For logging out, or in as someone else
  const reset = () => {
    habits.value = []
    status.value = 'idle'
  }

  return {
    habits,
    status,
    byId,
    load,
    ensureLoaded,
    create,
    update,
    remove,
    track,
    untrack,
    reset
  }
})
