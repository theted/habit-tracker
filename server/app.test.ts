import { createHash } from 'node:crypto'
import path from 'node:path'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp, type AppOptions } from './app.js'
import { prisma } from './db.js'
import { verifyPassword } from './passwords.js'
import { COOKIE } from './sessions.js'

// Rate limits are raised for everything but the test that checks them
const relaxed: AppOptions = {
  log: false,
  limits: { loginPerAccount: 1000, loginPerIp: 1000, signupsPerIp: 1000 }
}
const defaultApp = createApp(relaxed)

// Requests carry the Origin a browser would, or the CSRF check refuses them
const HOST = 'habits.test'
type App = ReturnType<typeof createApp>

// A browser: keeps its cookies between requests
const browser = (app: App = defaultApp) => {
  const agent = request.agent(app)
  const unsafe = (req: request.Test, body: object = {}) =>
    req.set('Host', HOST).set('Origin', `http://${HOST}`).send(body)
  return {
    get: (path: string) => agent.get(path).set('Host', HOST),
    post: (path: string, body?: object) => unsafe(agent.post(path), body),
    patch: (path: string, body: object) => unsafe(agent.patch(path), body),
    delete: (path: string, body?: object) => unsafe(agent.delete(path), body)
  }
}

let counter = 0
const PASSWORD = 'correct horse battery'

// A new browser with a new account, logged in
const signUp = async (app?: App) => {
  const username = `user${++counter}`
  const client = browser(app)
  const res = await client.post('/api/auth/register', { username, password: PASSWORD })
  expect(res.status).toBe(201)
  return Object.assign(client, { user: res.body.user as { id: number; username: string } })
}

const sessionCookie = (res: request.Response) =>
  ([] as string[])
    .concat(res.headers['set-cookie'] ?? [])
    .find((cookie) => cookie.startsWith(`${COOKIE}=`))

const tokenOf = (res: request.Response) => sessionCookie(res)!.split(';')[0]!.split('=')[1]!

beforeEach(async () => {
  // Everything but the pre-accounts owner, who is put back without a password
  await prisma.user.deleteMany({ where: { id: { not: 1 } } })
  await prisma.track.deleteMany()
  await prisma.habit.deleteMany()
  await prisma.session.deleteMany()
  await prisma.moment.deleteMany()
  await prisma.apiToken.deleteMany()
  await prisma.user.update({ where: { id: 1 }, data: { username: 'owner', passwordHash: null } })
})

describe('signing up', () => {
  it('reports nobody logged in, and whether sign-up is open', async () => {
    const res = await browser().get('/api/auth/status')
    expect(res.body).toEqual({ user: null, signupEnabled: true })
  })

  it('creates an account and logs it in with a locked-down cookie', async () => {
    const client = browser()

    const res = await client.post('/api/auth/register', { username: ' Ted ', password: PASSWORD })

    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({ username: 'ted' })
    expect(res.body.user).not.toHaveProperty('passwordHash')
    const cookie = sessionCookie(res)!
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
    expect(cookie).toMatch(/Path=\//)
    expect((await client.get('/api/auth/status')).body.user).toMatchObject({ username: 'ted' })
  })

  it('marks the cookie Secure, and sends HSTS, behind an HTTPS proxy', async () => {
    // As on the box: nginx terminates TLS and says so in X-Forwarded-Proto
    const res = await request(defaultApp)
      .post('/api/auth/register')
      .set('Host', HOST)
      .set('Origin', `https://${HOST}`)
      .set('X-Forwarded-Proto', 'https')
      .send({ username: 'ted', password: PASSWORD })

    expect(res.status).toBe(201)
    expect(sessionCookie(res)).toMatch(/; Secure/)
    expect(res.headers['strict-transport-security']).toBe('max-age=15552000')
  })

  it('stores an Argon2id hash, never the password', async () => {
    const client = await signUp()

    const user = await prisma.user.findUniqueOrThrow({ where: { id: client.user.id } })

    expect(user.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/)
    expect(user.passwordHash).not.toContain(PASSWORD)
  })

  it('treats usernames as case-insensitive', async () => {
    await browser().post('/api/auth/register', { username: 'ted', password: PASSWORD })

    const res = await browser().post('/api/auth/register', { username: 'TED', password: PASSWORD })

    expect(res.status).toBe(409)
    expect(res.body.issues).toEqual([{ path: 'username', message: 'That username is taken' }])
  })

  it.each([
    ['a short username', { username: 'ab', password: PASSWORD }, 'username'],
    ['a username with spaces', { username: 'ted s', password: PASSWORD }, 'username'],
    ['a short password', { username: 'ted', password: 'short' }, 'password'],
    ['a common password', { username: 'ted', password: 'Password123' }, 'password'],
    ['the username as password', { username: 'tedtedted', password: 'TedTedTed' }, 'password']
  ])('refuses %s', async (_case, body, path) => {
    const res = await browser().post('/api/auth/register', body)

    expect(res.status).toBe(400)
    expect(res.body.issues.map((issue: { path: string }) => issue.path)).toContain(path)
  })

  it('refuses when sign-up is closed', async () => {
    const closed = browser(createApp({ ...relaxed, signupEnabled: false }))

    expect((await closed.get('/api/auth/status')).body.signupEnabled).toBe(false)
    const res = await closed.post('/api/auth/register', { username: 'ted', password: PASSWORD })
    expect(res.status).toBe(403)
  })
})

describe('logging in and out', () => {
  it('logs in with the right password, whatever the username case', async () => {
    const { user } = await signUp()
    const client = browser()

    const res = await client.post('/api/auth/login', {
      username: user.username.toUpperCase(),
      password: PASSWORD
    })

    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({ id: user.id })
    expect((await client.get('/api/habits')).status).toBe(200)
  })

  it('gives the same answer for a wrong password and an unknown user', async () => {
    const { user } = await signUp()

    const wrong = await browser().post('/api/auth/login', {
      username: user.username,
      password: 'x'
    })
    const unknown = await browser().post('/api/auth/login', { username: 'nobody', password: 'x' })

    expect([wrong.status, unknown.status]).toEqual([401, 401])
    expect(wrong.body).toEqual(unknown.body)
    expect(sessionCookie(wrong)).toBeUndefined()
  })

  it("doesn't let anyone into an account that has no password yet", async () => {
    const res = await browser().post('/api/auth/login', { username: 'owner', password: 'anything' })
    expect(res.status).toBe(401)
  })

  it('logs out: the session is gone from the database and the cookie is cleared', async () => {
    const client = await signUp()

    const res = await client.post('/api/auth/logout')

    expect(res.status).toBe(204)
    expect(sessionCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/)
    expect(await prisma.session.count()).toBe(0)
    expect((await client.get('/api/habits')).status).toBe(401)
  })

  it('keeps only a hash of the session token', async () => {
    const res = await browser().post('/api/auth/register', { username: 'ted', password: PASSWORD })
    const token = tokenOf(res)

    const [session] = await prisma.session.findMany()

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(session!.id).toBe(createHash('sha256').update(token).digest('hex'))
  })

  it('refuses an expired session and deletes it', async () => {
    const client = await signUp()
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } })

    const res = await client.get('/api/habits')

    expect(res.status).toBe(401)
    expect(await prisma.session.count()).toBe(0)
  })

  it('extends a session that is in the second half of its life', async () => {
    const client = await signUp()
    const soon = new Date(Date.now() + 3 * 86_400_000)
    await prisma.session.updateMany({ data: { expiresAt: soon } })

    const res = await client.get('/api/habits')

    expect(res.status).toBe(200)
    expect(sessionCookie(res)).toBeDefined()
    const [session] = await prisma.session.findMany()
    expect(session!.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000)
  })

  it('upgrades a hash made with weaker settings when the user logs in', async () => {
    const { user } = await signUp()
    // A real hash of the password, but with half the memory and one pass
    const { argon2Sync, randomBytes } = await import('node:crypto')
    const salt = randomBytes(16)
    const tag = argon2Sync('argon2id', {
      message: PASSWORD,
      nonce: salt,
      memory: 8192,
      passes: 1,
      parallelism: 1,
      tagLength: 32
    })
    const b64 = (buffer: Buffer) => buffer.toString('base64').replace(/=+$/, '')
    const stored = `$argon2id$v=19$m=8192,t=1,p=1$${b64(salt)}$${b64(tag)}`
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: stored } })

    const res = await browser().post('/api/auth/login', {
      username: user.username,
      password: PASSWORD
    })

    expect(res.status).toBe(200)
    const { passwordHash } = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(passwordHash).toMatch(/m=19456,t=2,p=1/)
    expect(await verifyPassword(passwordHash!, PASSWORD)).toBe(true)
  })

  it('slows down password guessing', async () => {
    const app = createApp({ ...relaxed, limits: { ...relaxed.limits, loginPerAccount: 3 } })
    const { user } = await signUp(app)
    const guess = () =>
      browser(app).post('/api/auth/login', { username: user.username, password: 'x' })

    for (let i = 0; i < 3; i++) expect((await guess()).status).toBe(401)
    const res = await guess()

    expect(res.status).toBe(429)
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0)
  })
})

describe('cross-site requests', () => {
  it('refuses a change without an Origin header', async () => {
    await signUp()
    const res = await request(defaultApp)
      .post('/api/auth/register')
      .set('Host', HOST)
      .send({ username: 'ted', password: PASSWORD })
    expect(res.status).toBe(403)
  })

  it('refuses a change from another site', async () => {
    const res = await request(defaultApp)
      .post('/api/auth/login')
      .set('Host', HOST)
      .set('Origin', 'https://evil.example')
      .send({ username: 'ted', password: PASSWORD })
    expect(res.status).toBe(403)
  })

  it('sends security headers', async () => {
    const res = await browser().get('/api/auth/status')

    expect(res.headers['content-security-policy']).toContain("default-src 'self'")
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(res.headers['content-security-policy']).toContain(
      "img-src 'self' data: https://visits.sundbergsolutions.se"
    )
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('DENY')
  })
})

describe('the account', () => {
  it('renames, given the current password', async () => {
    const client = await signUp()

    const wrong = await client.patch('/api/account', { currentPassword: 'x', username: 'ted' })
    const right = await client.patch('/api/account', { currentPassword: PASSWORD, username: 'Ted' })

    expect(wrong.status).toBe(403)
    expect(wrong.body.issues[0].path).toBe('currentPassword')
    expect(right.status).toBe(200)
    expect(right.body.user.username).toBe('ted')
  })

  it("can't take a username someone else has", async () => {
    const other = await signUp()
    const client = await signUp()

    const res = await client.patch('/api/account', {
      currentPassword: PASSWORD,
      username: other.user.username
    })

    expect(res.status).toBe(409)
  })

  it('changes the password and logs out every other device', async () => {
    const client = await signUp()
    const otherDevice = browser()
    await otherDevice.post('/api/auth/login', {
      username: client.user.username,
      password: PASSWORD
    })

    const res = await client.patch('/api/account', {
      currentPassword: PASSWORD,
      newPassword: 'a whole new password'
    })

    expect(res.status).toBe(200)
    expect((await client.get('/api/habits')).status).toBe(200)
    expect((await otherDevice.get('/api/habits')).status).toBe(401)
    const login = (password: string) =>
      browser().post('/api/auth/login', { username: client.user.username, password })
    expect((await login(PASSWORD)).status).toBe(401)
    expect((await login('a whole new password')).status).toBe(200)
  })

  it('holds a new password to the same rules as at sign-up', async () => {
    const client = await signUp()

    const res = await client.patch('/api/account', {
      currentPassword: PASSWORD,
      newPassword: '123'
    })

    expect(res.status).toBe(400)
    expect(res.body.issues[0].path).toBe('newPassword')
  })

  it('deletes the account with everything in it', async () => {
    const client = await signUp()
    const habit = (await client.post('/api/habits', { title: 'Read' })).body
    await client.post(`/api/habits/${habit.id}/tracks`)

    expect((await client.delete('/api/account', { password: 'x' })).status).toBe(403)
    const res = await client.delete('/api/account', { password: PASSWORD })

    expect(res.status).toBe(204)
    expect(await prisma.habit.count()).toBe(0)
    expect(await prisma.track.count()).toBe(0)
    expect(await prisma.session.count()).toBe(0)
    expect((await client.get('/api/auth/status')).body.user).toBeNull()
  })
})

describe('privacy between users', () => {
  it("never shows, changes or deletes another user's habits and entries", async () => {
    const alice = await signUp()
    const bob = await signUp()
    const habit = (await alice.post('/api/habits', { title: 'Secret' })).body
    const track = (await alice.post(`/api/habits/${habit.id}/tracks`)).body

    expect((await bob.get('/api/habits')).body).toEqual([])
    expect((await bob.get(`/api/habits/${habit.id}`)).status).toBe(404)
    expect((await bob.patch(`/api/habits/${habit.id}`, { title: 'Mine' })).status).toBe(404)
    expect((await bob.delete(`/api/habits/${habit.id}`)).status).toBe(404)
    expect((await bob.post(`/api/habits/${habit.id}/tracks`)).status).toBe(404)
    expect((await bob.delete(`/api/tracks/${track.id}`)).status).toBe(404)

    const mine = await alice.get(`/api/habits/${habit.id}`)
    expect(mine.body).toMatchObject({ title: 'Secret', tracks: [{ id: track.id }] })
  })

  it('needs a login for everything but the status and the login itself', async () => {
    const anonymous = browser()
    expect((await anonymous.get('/api/habits')).status).toBe(401)
    expect((await anonymous.post('/api/habits', { title: 'Read' })).status).toBe(401)
    expect((await anonymous.patch('/api/account', { currentPassword: 'x' })).status).toBe(401)
  })
})

describe('habits', () => {
  it('creates a habit with defaults', async () => {
    const client = await signUp()

    const res = await client.post('/api/habits', { title: '  Read  ', userId: 1 })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      title: 'Read',
      description: null,
      emoji: '✨',
      color: 'violet',
      tracks: []
    })
    expect(Date.parse(res.body.createdAt)).not.toBeNaN()
    const row = await prisma.habit.findUniqueOrThrow({ where: { id: res.body.id } })
    expect(row.userId).toBe(client.user.id)
  })

  it('creates a habit with every field set', async () => {
    const client = await signUp()

    const res = await client.post('/api/habits', {
      title: 'Run',
      description: 'Three times a week',
      emoji: '🏃',
      color: 'emerald'
    })

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
    const client = await signUp()

    const res = await client.post('/api/habits', body)

    expect(res.status).toBe(400)
    expect(res.body.issues.map((issue: { path: string }) => issue.path)).toContain(path)
  })

  it('lists habits in creation order, each with its entries oldest first', async () => {
    const client = await signUp()
    const read = (await client.post('/api/habits', { title: 'Read' })).body
    await client.post('/api/habits', { title: 'Run' })
    await client.post(`/api/habits/${read.id}/tracks`, { date: '2026-03-02T09:00:00Z' })
    await client.post(`/api/habits/${read.id}/tracks`, { date: '2026-03-01T09:00:00Z' })

    const res = await client.get('/api/habits')

    expect(res.body.map((habit: { title: string }) => habit.title)).toEqual(['Read', 'Run'])
    expect(res.body[0].tracks.map((track: { date: string }) => track.date)).toEqual([
      '2026-03-01T09:00:00.000Z',
      '2026-03-02T09:00:00.000Z'
    ])
  })

  it('answers 404 for a habit that does not exist, and 400 for an id that is not one', async () => {
    const client = await signUp()
    expect((await client.get('/api/habits/12345')).status).toBe(404)
    expect((await client.get('/api/habits/abc')).status).toBe(400)
  })

  it('updates only the fields it is given, and clears a description set to ""', async () => {
    const client = await signUp()
    const habit = (await client.post('/api/habits', { title: 'Read', description: 'Bed' })).body

    const res = await client.patch(`/api/habits/${habit.id}`, { color: 'sky', emoji: '📚' })
    expect(res.body).toMatchObject({ title: 'Read', description: 'Bed', color: 'sky', emoji: '📚' })

    const cleared = await client.patch(`/api/habits/${habit.id}`, { description: '' })
    expect(cleared.body.description).toBeNull()
    expect((await client.patch(`/api/habits/${habit.id}`, {})).status).toBe(400)
  })

  it('deletes a habit together with its entries', async () => {
    const client = await signUp()
    const habit = (await client.post('/api/habits', { title: 'Read' })).body
    await client.post(`/api/habits/${habit.id}/tracks`)

    expect((await client.delete(`/api/habits/${habit.id}`)).status).toBe(204)
    expect((await client.get(`/api/habits/${habit.id}`)).status).toBe(404)
    expect(await prisma.track.count({ where: { habitId: habit.id } })).toBe(0)
  })
})

describe('entries', () => {
  it('logs an entry now, or backdated', async () => {
    const client = await signUp()
    const habit = (await client.post('/api/habits', { title: 'Read' })).body
    const before = Date.now()

    const now = await client.post(`/api/habits/${habit.id}/tracks`)
    const then = await client.post(`/api/habits/${habit.id}/tracks`, {
      date: '2026-01-15T20:30:00+01:00'
    })

    expect(now.status).toBe(201)
    expect(Date.parse(now.body.date)).toBeGreaterThanOrEqual(before - 1000)
    expect(then.body.date).toBe('2026-01-15T19:30:00.000Z')
  })

  it.each([
    ['a date in the future', new Date(Date.now() + 3_600_000).toISOString()],
    ['something that is not a date', 'yesterday'],
    ['a date without a zone', '2026-01-15T20:30:00']
  ])('rejects %s', async (_case, date) => {
    const client = await signUp()
    const habit = (await client.post('/api/habits', { title: 'Read' })).body

    const res = await client.post(`/api/habits/${habit.id}/tracks`, { date })

    expect(res.status).toBe(400)
    expect(res.body.issues[0].path).toBe('date')
  })

  it('deletes an entry', async () => {
    const client = await signUp()
    const habit = (await client.post('/api/habits', { title: 'Read' })).body
    const track = (await client.post(`/api/habits/${habit.id}/tracks`)).body

    expect((await client.delete(`/api/tracks/${track.id}`)).status).toBe(204)
    expect((await client.get(`/api/habits/${habit.id}`)).body.tracks).toEqual([])
    expect((await client.delete(`/api/tracks/${track.id}`)).status).toBe(404)
  })
})

describe('agent keys', () => {
  it('creates a key and shows it once, storing only its hash', async () => {
    const client = await signUp()

    const res = await client.post('/api/tokens', { name: '  Laptop  ' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: 'Laptop', lastUsedAt: null })
    expect(res.body.token).toMatch(/^hab_[\w-]{43}$/)
    const list = (await client.get('/api/tokens')).body
    expect(list).toEqual([
      { id: res.body.id, name: 'Laptop', createdAt: res.body.createdAt, lastUsedAt: null }
    ])
    const row = await prisma.apiToken.findUniqueOrThrow({ where: { id: res.body.id } })
    expect(row.hash).toBe(createHash('sha256').update(res.body.token).digest('hex'))
  })

  it('needs a name', async () => {
    const client = await signUp()

    const res = await client.post('/api/tokens', { name: '  ' })

    expect(res.status).toBe(400)
    expect(res.body.issues[0].path).toBe('name')
  })

  it("revokes a key, but not someone else's", async () => {
    const alice = await signUp()
    const bob = await signUp()
    const key = (await alice.post('/api/tokens', { name: 'Laptop' })).body

    expect((await bob.delete(`/api/tokens/${key.id}`)).status).toBe(404)
    expect((await alice.delete(`/api/tokens/${key.id}`)).status).toBe(204)
    expect((await alice.get('/api/tokens')).body).toEqual([])
  })
})

describe('moments', () => {
  it("lists the user's own moments, oldest first", async () => {
    const alice = await signUp()
    const bob = await signUp()
    await prisma.moment.createMany({
      data: [
        { userId: alice.user.id, kind: 'good', note: 'Later', date: new Date('2026-10-02T10:00Z') },
        {
          userId: alice.user.id,
          kind: 'user_annoying',
          note: 'Earlier',
          project: 'kolla',
          agent: 'Claude Code',
          date: new Date('2026-10-01T10:00Z')
        },
        { userId: bob.user.id, kind: 'good', note: "Bob's", date: new Date('2026-10-01T12:00Z') }
      ]
    })

    const res = await alice.get('/api/moments')

    expect(res.body).toEqual([
      {
        id: expect.any(Number),
        kind: 'user_annoying',
        note: 'Earlier',
        project: 'kolla',
        agent: 'Claude Code',
        date: '2026-10-01T10:00:00.000Z'
      },
      expect.objectContaining({ note: 'Later', project: null, agent: null })
    ])
  })

  it("deletes a moment, but not someone else's", async () => {
    const alice = await signUp()
    const bob = await signUp()
    const moment = await prisma.moment.create({
      data: { userId: alice.user.id, kind: 'annoying', note: 'Flaky test' }
    })

    expect((await bob.delete(`/api/moments/${moment.id}`)).status).toBe(404)
    expect((await alice.delete(`/api/moments/${moment.id}`)).status).toBe(204)
    expect(await prisma.moment.count()).toBe(0)
  })

  it('serves the skill that goes with /mcp, as Markdown', async () => {
    const app = createApp({ ...relaxed, skillsDir: path.resolve('skills') })

    const res = await request(app).get('/skills/report-moments/SKILL.md')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('text/markdown; charset=utf-8')
    expect(res.text).toMatch(/^---\nname: report-moments\n/)
    expect((await request(app).get('/skills/nope.md')).status).toBe(404)
  })
})

describe('errors', () => {
  it('answers 404 with JSON for an unknown API path', async () => {
    const client = await signUp()
    const res = await client.get('/api/nope')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not Found' })
  })

  it('answers 400 for a body that is not JSON', async () => {
    const res = await request(defaultApp)
      .post('/api/auth/login')
      .set('Host', HOST)
      .set('Origin', `http://${HOST}`)
      .set('Content-Type', 'application/json')
      .send('{nope')

    expect(res.status).toBe(400)
  })
})
