import type { HabitColor } from './lib/colors'
import type { MomentKind } from './lib/moments'

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

// Something an AI agent reported over MCP (server/mcp.ts)
export interface Moment {
  id: number
  kind: MomentKind
  note: string
  agent: string | null
  project: string | null
  date: string
}

// A key for /mcp. The secret itself only comes back once, from create.
export interface ApiToken {
  id: number
  name: string
  createdAt: string
  lastUsedAt: string | null
}
