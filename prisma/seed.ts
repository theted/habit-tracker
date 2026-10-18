// Demo data for development: a "demo" account (password "habits-demo") with five habits, and a
// year of plausible history for them and for its AI agents' moments, so the heatmap, streaks and
// charts have something to draw. Skips whatever the demo account already has.
//
//   npm run db:seed     add the demo account
//   npm run db:reset    wipe the dev database, re-apply migrations, then seed
import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../server/generated/prisma/client.js'
import { hashPassword } from '../server/passwords.js'

const DEMO = { username: 'demo', password: 'habits-demo' }

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

// What the demo account's agents said, by kind
const NOTES = {
  good: [
    'Cornered the flaky date test: it depended on the machine timezone.',
    'The refactor went green on the first run.',
    'Clear brief, quick feedback, done in one go.',
    'The new chart came together nicely in both themes.',
    'Found the root cause in the logs within minutes.'
  ],
  annoying: [
    'npm skipped the native build and the error message said nothing useful.',
    'The test runner hung twice before failing with a timeout.',
    'An hour lost to a Prisma client that was generated for the old schema.',
    'Rate-limited by the API halfway through the migration.',
    'The docs and the actual types disagreed.'
  ],
  user_annoying: [
    'Asked for the opposite of what was agreed an hour ago.',
    'Pushed to master before the tests had finished.',
    'Third time explaining why the cache was there.',
    '"Just make it work" with no idea what it should do.'
  ],
  other: [
    'Learned that SQLite has no real date type.',
    'Unsure whether to split the component; left it whole for now.',
    'The bug was in a comment that lied, not the code.'
  ]
} as const

const PROJECTS = ['habit-tracker', 'vibe-chat', 'kolla', 'glass', 'infrastructure']
const AGENTS = ['Claude Code (Opus 5.5)', 'Claude Code (Sonnet 5.5)', 'Claude Code (Fable 5.1)']
const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)]!

// A few moments on most days for a year. Things improve over time, and the user is most
// annoying late in the evening and on Mondays.
const seedMoments = async (userId: number, now: Date) => {
  const data = []
  for (let daysAgo = 365; daysAgo >= 0; daysAgo--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo)
    if (!chance(day.getDay() === 0 || day.getDay() === 6 ? 0.35 : 0.8)) continue
    const better = 1 - daysAgo / 365
    for (let i = Math.round(between(1, 5)); i > 0; i--) {
      const hour = between(8, 23.5)
      const odds = {
        good: 0.35 + 0.25 * better,
        annoying: 0.3 - 0.12 * better,
        user_annoying: (hour > 20 ? 0.3 : 0.12) + (day.getDay() === 1 ? 0.1 : 0),
        other: 0.1
      }
      const sum = Object.values(odds).reduce((a, b) => a + b, 0)
      let roll = random() * sum
      const kind = (Object.keys(odds) as (keyof typeof odds)[]).find(
        (key) => (roll -= odds[key]) < 0
      )!
      const date = new Date(day)
      date.setHours(0, 0, 0, Math.round(hour * 3_600_000))
      if (date < now) {
        data.push({
          userId,
          kind,
          note: pick(NOTES[kind]),
          project: chance(0.9) ? pick(PROJECTS) : null,
          agent: pick(AGENTS),
          date
        })
      }
    }
  }
  await prisma.moment.createMany({ data })
  console.log(`🤖 Agent moments: ${data.length}`)
}

const main = async () => {
  const now = new Date()
  const existing = await prisma.user.findUnique({ where: { username: DEMO.username } })
  if (existing) {
    if (!(await prisma.moment.count({ where: { userId: existing.id } }))) {
      await seedMoments(existing.id, now)
    }
    console.log('The demo account already exists; not seeding it. npm run db:reset starts over.')
    return
  }
  const user = await prisma.user.create({
    data: { username: DEMO.username, passwordHash: await hashPassword(DEMO.password) }
  })

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
        userId: user.id
      }
    })
    await prisma.track.createMany({ data: dates.map((date) => ({ habitId: id, date })) })
    console.log(`${demo.emoji} ${demo.title}: ${dates.length} entries`)
  }
  await seedMoments(user.id, now)
  console.log(`Log in as ${DEMO.username} / ${DEMO.password}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
