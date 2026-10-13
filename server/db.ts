import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { Prisma, PrismaClient } from './generated/prisma/client.js'
import type { HabitCreate, HabitUpdate } from './validation.js'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')

export const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL })
})

// Every habit belongs to the single owner row created by the owner_user migration, until the app
// has real accounts.
const OWNER_ID = 1

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

export const listHabits = () =>
  prisma.habit.findMany({ select: habitSelect, orderBy: { id: 'asc' } })

export const getHabit = (id: number) =>
  prisma.habit.findUnique({ where: { id }, select: habitSelect })

export const createHabit = (input: HabitCreate) =>
  prisma.habit.create({
    data: { ...input, user: { connect: { id: OWNER_ID } } },
    select: habitSelect
  })

export const updateHabit = (id: number, input: HabitUpdate) =>
  prisma.habit.update({ where: { id }, data: input, select: habitSelect })

// Its entries go with it (onDelete: Cascade)
export const deleteHabit = (id: number) => prisma.habit.delete({ where: { id } })

export const addTrack = (habitId: number, date?: Date) =>
  prisma.track.create({ data: { habitId, ...(date && { date }) }, select: trackSelect })

export const deleteTrack = (id: number) => prisma.track.delete({ where: { id } })

// P2025: the row to update or delete doesn't exist. P2003: a track for a habit that doesn't.
export const isNotFound = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && ['P2025', 'P2003'].includes(err.code)
