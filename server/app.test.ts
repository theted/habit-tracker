import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { prisma } from './db.js'

const app = createApp({ log: false })
const PASSWORD = process.env.HABITS_PASSWORD!

// Requests that carry the password
const api = {
  get: (path: string) => request(app).get(path).set('X-Password', PASSWORD),
  post: (path: string, body?: object) =>
    request(app)
      .post(path)
      .set('X-Password', PASSWORD)
      .send(body ?? {}),
  patch: (path: string, body: object) =>
    request(app).patch(path).set('X-Password', PASSWORD).send(body),
  delete: (path: string) => request(app).delete(path).set('X-Password', PASSWORD)
}

const createHabit = async (body: object = { title: 'Read' }) => {
  const res = await api.post('/api/habits', body)
  expect(res.status).toBe(201)
  return res.body as { id: number; title: string }
}

beforeEach(async () => {
  await prisma.track.deleteMany()
  await prisma.habit.deleteMany()
})

describe('auth', () => {
  it('rejects requests without the password', async () => {
    const res = await request(app).get('/api/habits')
    expect(res.status).toBe(401)
  })

  it('rejects a wrong password', async () => {
    const res = await request(app).get('/api/habits').set('X-Password', 'nope')
    expect(res.status).toBe(401)
  })

  it('confirms the right password', async () => {
    const res = await api.get('/api/auth')
    expect(res.status).toBe(204)
  })
})

describe('habits', () => {
  it('creates a habit with defaults, owned by the single user', async () => {
    const res = await api.post('/api/habits', { title: '  Read  ', userId: 99 })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      title: 'Read',
      description: null,
      emoji: '✨',
      color: 'violet',
      tracks: []
    })
    expect(Date.parse(res.body.createdAt)).not.toBeNaN()
    expect(res.body).not.toHaveProperty('userId')
    const row = await prisma.habit.findUniqueOrThrow({ where: { id: res.body.id } })
    expect(row.userId).toBe(1)
  })

  it('creates a habit with every field set', async () => {
    const res = await api.post('/api/habits', {
      title: 'Run',
      description: 'Three times a week',
      emoji: '🏃',
      color: 'emerald'
    })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      title: 'Run',
      description: 'Three times a week',
      emoji: '🏃',
      color: 'emerald'
    })
  })

  it.each([
    ['no title', {}, 'title'],
    ['a blank title', { title: '   ' }, 'title'],
    ['a title that is too long', { title: 'x'.repeat(61) }, 'title'],
    ['an unknown colour', { title: 'Read', color: 'beige' }, 'color'],
    ['an empty emoji', { title: 'Read', emoji: '' }, 'emoji']
  ])('rejects %s', async (_case, body, path) => {
    const res = await api.post('/api/habits', body)

    expect(res.status).toBe(400)
    expect(res.body.issues.map((issue: { path: string }) => issue.path)).toContain(path)
  })

  it('lists habits in creation order, each with its entries oldest first', async () => {
    const read = await createHabit({ title: 'Read' })
    await createHabit({ title: 'Run' })
    await api.post(`/api/habits/${read.id}/tracks`, { date: '2026-03-02T09:00:00Z' })
    await api.post(`/api/habits/${read.id}/tracks`, { date: '2026-03-01T09:00:00Z' })

    const res = await api.get('/api/habits')

    expect(res.status).toBe(200)
    expect(res.body.map((habit: { title: string }) => habit.title)).toEqual(['Read', 'Run'])
    expect(res.body[0].tracks.map((track: { date: string }) => track.date)).toEqual([
      '2026-03-01T09:00:00.000Z',
      '2026-03-02T09:00:00.000Z'
    ])
  })

  it('gets one habit', async () => {
    const habit = await createHabit()

    const res = await api.get(`/api/habits/${habit.id}`)

    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Read')
  })

  it('answers 404 for a habit that does not exist, and 400 for an id that is not one', async () => {
    expect((await api.get('/api/habits/12345')).status).toBe(404)
    expect((await api.get('/api/habits/abc')).status).toBe(400)
  })

  it('updates only the fields it is given', async () => {
    const habit = await createHabit({ title: 'Read', description: 'Before bed' })

    const res = await api.patch(`/api/habits/${habit.id}`, { color: 'sky', emoji: '📚' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      title: 'Read',
      description: 'Before bed',
      color: 'sky',
      emoji: '📚'
    })
  })

  it('clears the description when it is set to an empty string', async () => {
    const habit = await createHabit({ title: 'Read', description: 'Before bed' })

    const res = await api.patch(`/api/habits/${habit.id}`, { description: '' })

    expect(res.body.description).toBeNull()
  })

  it('rejects an update with nothing in it, and 404s an unknown habit', async () => {
    const habit = await createHabit()

    expect((await api.patch(`/api/habits/${habit.id}`, {})).status).toBe(400)
    expect((await api.patch('/api/habits/12345', { title: 'x' })).status).toBe(404)
  })

  it('deletes a habit together with its entries', async () => {
    const habit = await createHabit()
    await api.post(`/api/habits/${habit.id}/tracks`)
    await api.post(`/api/habits/${habit.id}/tracks`)

    const res = await api.delete(`/api/habits/${habit.id}`)

    expect(res.status).toBe(204)
    expect((await api.get(`/api/habits/${habit.id}`)).status).toBe(404)
    expect(await prisma.track.count({ where: { habitId: habit.id } })).toBe(0)
    expect((await api.delete(`/api/habits/${habit.id}`)).status).toBe(404)
  })
})

describe('entries', () => {
  it('logs an entry now', async () => {
    const habit = await createHabit()
    const before = Date.now()

    const res = await api.post(`/api/habits/${habit.id}/tracks`)

    expect(res.status).toBe(201)
    expect(res.body.habitId).toBe(habit.id)
    const date = Date.parse(res.body.date)
    expect(date).toBeGreaterThanOrEqual(before - 1000)
    expect(date).toBeLessThanOrEqual(Date.now() + 1000)
  })

  it('logs a backdated entry', async () => {
    const habit = await createHabit()

    const res = await api.post(`/api/habits/${habit.id}/tracks`, {
      date: '2026-01-15T20:30:00+01:00'
    })

    expect(res.status).toBe(201)
    expect(res.body.date).toBe('2026-01-15T19:30:00.000Z')
  })

  it.each([
    ['a date in the future', new Date(Date.now() + 3_600_000).toISOString()],
    ['something that is not a date', 'yesterday'],
    ['a date without a zone', '2026-01-15T20:30:00']
  ])('rejects %s', async (_case, date) => {
    const habit = await createHabit()

    const res = await api.post(`/api/habits/${habit.id}/tracks`, { date })

    expect(res.status).toBe(400)
    expect(res.body.issues[0].path).toBe('date')
  })

  it('answers 404 when the habit does not exist', async () => {
    const res = await api.post('/api/habits/12345/tracks')
    expect(res.status).toBe(404)
  })

  it('deletes an entry', async () => {
    const habit = await createHabit()
    const track = (await api.post(`/api/habits/${habit.id}/tracks`)).body

    expect((await api.delete(`/api/tracks/${track.id}`)).status).toBe(204)
    expect((await api.get(`/api/habits/${habit.id}`)).body.tracks).toEqual([])
    expect((await api.delete(`/api/tracks/${track.id}`)).status).toBe(404)
  })
})

describe('errors', () => {
  it('answers 404 with JSON for an unknown API path', async () => {
    const res = await api.get('/api/nope')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not Found' })
  })

  it('answers 400 for a body that is not JSON', async () => {
    const res = await request(app)
      .post('/api/habits')
      .set('X-Password', PASSWORD)
      .set('Content-Type', 'application/json')
      .send('{nope')

    expect(res.status).toBe(400)
  })
})
