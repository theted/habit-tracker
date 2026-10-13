import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from './generated/prisma/client.js'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL })
})

// Every habit belongs to the single owner row created by the owner_user migration, until the app
// has real accounts.
const OWNER_ID = 1

const getHabits = async () =>
  prisma.habit.findMany({
    include: {
      _count: {
        select: { tracks: true }
      }
    }
  })

const getHabit = async (id: number) =>
  prisma.habit.findUnique({
    where: { id },
    include: {
      tracks: {
        select: {
          id: true,
          date: true,
          habitId: true
        }
      }
    }
  })

const createHabit = async (title: string) =>
  prisma.habit.create({
    data: {
      title,
      user: { connect: { id: OWNER_ID } }
    }
  })

const deleteHabit = async (id: number) => {
  // delete tracks for habit first
  await prisma.track.deleteMany({
    where: {
      habitId: id
    }
  })

  return prisma.habit.delete({
    where: { id }
  })
}

const addTrack = async (habitId: number) =>
  prisma.track.create({
    data: {
      habitId
    }
  })

export { getHabits, getHabit, createHabit, deleteHabit, addTrack }
