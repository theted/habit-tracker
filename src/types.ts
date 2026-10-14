import type { HabitColor } from './lib/colors'

// Shapes returned by the API (server/db.ts). Dates arrive as ISO strings.
export interface Track {
  id: number
  date: string
}

export interface Habit {
  id: number
  title: string
  description: string | null
  emoji: string
  color: HabitColor
  createdAt: string
  // Oldest first
  tracks: Track[]
}

export interface HabitInput {
  title: string
  description?: string | null
  emoji?: string
  color?: HabitColor
}

export interface User {
  id: number
  username: string
  createdAt: string
}

export interface AuthStatus {
  user: User | null
  signupEnabled: boolean
}
