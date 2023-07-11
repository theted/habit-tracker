import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const getUsers = async () => prisma.user.findMany()

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

const createHabit = async (title: string, userId: number) => {
  const habit = await prisma.habit.create({
    data: {
      title,
      user: { connect: { id: userId } }
    }
  })

  return habit
}

const deleteHabit = async (id: number) => {
  // delete tracks for habit first
  await prisma.track.deleteMany({
    where: {
      habitId: id
    }
  })

  const habit = await prisma.habit.delete({
    where: { id }
  })

  return habit
}

const getTracks = async () => prisma.track.findMany()

const addTrack = async (habitId: number) =>
  prisma.track.create({
    data: {
      habitId
    }
  })

export { getUsers, getHabits, getHabit, createHabit, deleteHabit, getTracks, addTrack }
