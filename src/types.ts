// Shapes returned by the API (server/db.ts). Dates arrive as ISO strings.
export interface Track {
  id: number
  habitId: number
  date: string
}

export interface Habit {
  id: number
  title: string
  description: string | null
  userId: number
}

export interface HabitSummary extends Habit {
  _count: { tracks: number }
}

export interface HabitWithTracks extends Habit {
  tracks: Track[]
}
