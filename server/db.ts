import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { Prisma, PrismaClient } from './generated/prisma/client.js'
import type { HabitCreate, HabitUpdate, MomentInput, MomentKind } from './validation.js'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')

export const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL })
})

// Thrown when a row doesn't exist or belongs to someone else; both are a 404, so the API never
// confirms that another user's habit exists
export class NotFoundError extends Error {}

// P2025: the row to update or delete doesn't exist (or isn't the user's)
export const isNotFound = (err: unknown) =>
  err instanceof NotFoundError ||
  (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025')

// P2002: a unique constraint, which for users means the username is taken
export const isTaken = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'

// Users

export const publicUser = { id: true, username: true, createdAt: true } satisfies Prisma.UserSelect

export const findUserByUsername = (username: string) =>
  prisma.user.findUnique({ where: { username } })

export const findUserById = (id: number) => prisma.user.findUnique({ where: { id } })

export const createUser = (username: string, passwordHash: string) =>
  prisma.user.create({ data: { username, passwordHash }, select: publicUser })

export const updateUser = (id: number, data: { username?: string; passwordHash?: string }) =>
  prisma.user.update({ where: { id }, data, select: publicUser })

// Habits, entries and sessions go with it (onDelete: Cascade)
export const deleteUser = (id: number) => prisma.user.delete({ where: { id } })

// Habits and entries, always scoped to the user asking

// What the API returns for a habit: its fields plus every entry, oldest first. Stats are computed
// in the browser, where "today" means the viewer's day rather than the server's.
const habitSelect = {
  id: true,
  title: true,
  description: true,
  emoji: true,
  color: true,
  createdAt: true,
  tracks: {
    select: { id: true, date: true },
    orderBy: { date: 'asc' }
  }
} satisfies Prisma.HabitSelect

const trackSelect = { id: true, habitId: true, date: true } satisfies Prisma.TrackSelect

export const listHabits = (userId: number) =>
  prisma.habit.findMany({ where: { userId }, select: habitSelect, orderBy: { id: 'asc' } })

export const getHabit = (userId: number, id: number) =>
  prisma.habit.findFirst({ where: { id, userId }, select: habitSelect })

export const createHabit = (userId: number, input: HabitCreate) =>
  prisma.habit.create({
    data: { ...input, user: { connect: { id: userId } } },
    select: habitSelect
  })

export const updateHabit = (userId: number, id: number, input: HabitUpdate) =>
  prisma.habit.update({ where: { id, userId }, data: input, select: habitSelect })

// Its entries go with it (onDelete: Cascade)
export const deleteHabit = (userId: number, id: number) =>
  prisma.habit.delete({ where: { id, userId } })

export const addTrack = async (userId: number, habitId: number, date?: Date) => {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    select: { id: true }
  })
  if (!habit) throw new NotFoundError()
  return prisma.track.create({ data: { habitId, ...(date && { date }) }, select: trackSelect })
}

export const deleteTrack = async (userId: number, id: number) => {
  const { count } = await prisma.track.deleteMany({ where: { id, habit: { userId } } })
  if (!count) throw new NotFoundError()
}

// Moments that AI agents report (server/mcp.ts), always scoped to the user whose key reported them

const momentSelect = {
  id: true,
  kind: true,
  note: true,
  agent: true,
  project: true,
  date: true
} satisfies Prisma.MomentSelect

// Oldest first, like a habit's entries; the stats are computed in the browser
export const listMoments = (userId: number) =>
  prisma.moment.findMany({ where: { userId }, select: momentSelect, orderBy: { date: 'asc' } })

export const createMoment = (userId: number, input: MomentInput) =>
  prisma.moment.create({ data: { ...input, userId }, select: momentSelect })

export const deleteMoment = async (userId: number, id: number) => {
  const { count } = await prisma.moment.deleteMany({ where: { id, userId } })
  if (!count) throw new NotFoundError()
}

// Newest first
export const recentMoments = (
  userId: number,
  { limit, kind, project }: { limit: number; kind?: MomentKind; project?: string }
) =>
  prisma.moment.findMany({
    where: { userId, kind, project },
    select: momentSelect,
    orderBy: { date: 'desc' },
    take: limit
  })

// How many moments fall in [from, to), grouped by one field
export const countMoments = async (
  userId: number,
  by: 'kind' | 'project' | 'agent',
  from: Date,
  to: Date
) => {
  const groups = await prisma.moment.groupBy({
    by: [by],
    where: { userId, date: { gte: from, lt: to } },
    _count: { _all: true }
  })
  return groups.map((group) => ({ key: group[by], count: group._count._all }))
}
