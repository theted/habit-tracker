// Demo data for development: five habits with a year of plausible history, so the heatmap,
// streaks and charts have something to draw. Leaves a database that already has habits alone.
//
//   npm run db:seed     seed an empty database
//   npm run db:reset    wipe the dev database, re-apply migrations, then seed
import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../server/generated/prisma/client.js'

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? '' })
})

// mulberry32: a seeded PRNG, so every reset produces the same history
const random = (() => {
  let seed = 20231013
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
})()

const between = (min: number, max: number) => min + random() * (max - min)
const chance = (p: number) => random() < p

interface DemoHabit {
  title: string
  emoji: string
  color: string
  description?: string
  days: number
  // Entry times (hours as fractions, local time) for one day; daysAgo 0 is today
  entries: (day: Date, daysAgo: number) => number[]
}

const habits: DemoHabit[] = [
  {
    title: 'Drink water',
    emoji: '💧',
    color: 'sky',
    description: 'A glass at a time.',
    days: 300,
    entries: () => Array.from({ length: Math.round(between(3, 8)) }, () => between(7, 21.5))
  },
  {
    title: 'Read',
    emoji: '📚',
    color: 'violet',
    description: 'At least twenty pages before bed.',
    days: 365,
    entries: (day, daysAgo) => {
      const weekend = day.getDay() === 0 || day.getDay() === 6
      // The last twelve days are an unbroken run, so there is a streak to show
      const read = (daysAgo >= 1 && daysAgo <= 12) || chance(weekend ? 0.85 : 0.65)
      return read ? [between(20, 23.5)] : []
    }
  },
  {
    title: 'Run',
    emoji: '🏃',
    color: 'emerald',
    days: 365,
    entries: (day) => {
      const runDay = [2, 4, 6].includes(day.getDay())
      const summer = day.getMonth() >= 4 && day.getMonth() <= 7
      return chance(runDay ? (summer ? 0.9 : 0.7) : 0.05) ? [between(6, 8)] : []
    }
  },
  {
    title: 'Meditate',
    emoji: '🧘',
    color: 'amber',
    days: 75,
    entries: () => (chance(0.72) ? [between(6.5, 8.5)] : [])
  },
  {
    title: 'Coffee',
    emoji: '☕',
    color: 'orange',
    description: 'Cutting down, one cup at a time.',
    days: 365,
    // Tapers from about four cups a day a year ago to one or two now
    entries: (_day, daysAgo) => {
      const cups = Math.max(0, Math.round(1.3 + (daysAgo / 365) * 2.5 + between(-1, 1)))
      return Array.from({ length: cups }, () => between(7, 16))
    }
  }
]

const main = async () => {
  if (await prisma.habit.count()) {
    console.log('The database already has habits; not seeding. Use npm run db:reset to start over.')
    return
  }

  const now = new Date()
  for (const demo of habits) {
    const dates: Date[] = []
    for (let daysAgo = demo.days; daysAgo >= 0; daysAgo--) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo)
      for (const hour of demo.entries(day, daysAgo)) {
        const date = new Date(day)
        date.setHours(0, 0, 0, Math.round(hour * 3_600_000))
        if (date < now) dates.push(date)
      }
    }
    dates.sort((a, b) => a.getTime() - b.getTime())

    const { id } = await prisma.habit.create({
      data: {
        title: demo.title,
        emoji: demo.emoji,
        color: demo.color,
        description: demo.description ?? null,
        createdAt: dates[0] ?? now,
        userId: 1
      }
    })
    await prisma.track.createMany({ data: dates.map((date) => ({ habitId: id, date })) })
    console.log(`${demo.emoji} ${demo.title}: ${dates.length} entries`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
