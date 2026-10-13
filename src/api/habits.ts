import type { Habit, HabitInput, Track } from '../types'
import { request } from './client'

export const habitsApi = {
  list: () => request<Habit[]>('GET', 'habits'),
  create: (input: HabitInput) => request<Habit>('POST', 'habits', input),
  update: (id: number, input: Partial<HabitInput>) =>
    request<Habit>('PATCH', `habits/${id}`, input),
  remove: (id: number) => request<void>('DELETE', `habits/${id}`),
  // Without a date the server stamps the entry with its own clock
  addTrack: (habitId: number, date?: Date) =>
    request<Track & { habitId: number }>(
      'POST',
      `habits/${habitId}/tracks`,
      date ? { date: date.toISOString() } : {}
    ),
  removeTrack: (id: number) => request<void>('DELETE', `tracks/${id}`)
}
