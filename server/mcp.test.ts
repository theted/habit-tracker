import type { AddressInfo } from 'node:net'
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { prisma } from './db.js'
import { createApiToken, revokeApiToken } from './tokens.js'

// Agents talk to /mcp over HTTP, so these run the app on a real port and connect the official
// MCP client to it, the way Claude Code would
const app = createApp({ log: false, limits: { reportsPerHour: 5 } })
const server = app.listen(0)
let url: URL

beforeAll(() => {
  url = new URL(`http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`)
})
afterAll(() => {
  server.close()
})

let counter = 0
const makeUser = () => prisma.user.create({ data: { username: `agent-owner${++counter}` } })

const keyFor = async (userId: number) => (await createApiToken(userId, 'Test agent')).token

const connect = async (token: string, era: 'legacy' | 'modern' = 'legacy') => {
  const client = new Client(
    { name: 'test-agent', version: '1.0.0' },
    era === 'modern' ? { versionNegotiation: { mode: 'auto' } } : {}
  )
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: { headers: { Authorization: `Bearer ${token}` } }
  })
  await client.connect(transport)
  return client
}

const call = async (client: Client, name: string, args: Record<string, unknown> = {}) => {
  const result = await client.callTool({ name, arguments: args })
  const [content] = result.content as { type: string; text: string }[]
  return { text: content!.text, isError: !!result.isError }
}

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { id: { not: 1 } } })
  await prisma.moment.deleteMany()
  await prisma.apiToken.deleteMany()
})

describe('/mcp access', () => {
  it('turns away requests without a valid key', async () => {
    const missing = await request(app).post('/mcp').send({})
    const wrong = await request(app)
      .post('/mcp')
      .set('Authorization', 'Bearer hab_not-a-real-key')
      .send({})

    for (const res of [missing, wrong]) {
      expect(res.status).toBe(401)
      expect(res.headers['www-authenticate']).toMatch(/^Bearer/)
    }
  })

  it("refuses calls from other sites' pages", async () => {
    const token = await keyFor((await makeUser()).id)

    const res = await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${token}`)
      .set('Origin', 'https://evil.example')
      .send({})

    expect(res.status).toBe(403)
  })

  it("answers OAuth discovery with a 404, so clients don't look for a login", async () => {
    const res = await request(app).get('/.well-known/oauth-protected-resource/mcp')
    expect(res.status).toBe(404)
  })

  it('stops working once the key is revoked, and notes when a key was last used', async () => {
    const user = await makeUser()
    const { token, apiToken } = await createApiToken(user.id, 'Laptop')
    await connect(token)

    const used = await prisma.apiToken.findUniqueOrThrow({ where: { id: apiToken.id } })
    expect(used.lastUsedAt).toBeInstanceOf(Date)

    await revokeApiToken(user.id, apiToken.id)
    await expect(connect(token)).rejects.toThrow()
  })
})

describe('/mcp tools', () => {
  it('introduces itself and its tools', async () => {
    const client = await connect(await keyFor((await makeUser()).id))

    expect(client.getProtocolEra()).toBe('legacy')
    expect(client.getInstructions()).toContain('report_moment')
    const { tools } = await client.listTools()
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'moment_stats',
      'recent_moments',
      'report_moment'
    ])
    const report = tools.find((tool) => tool.name === 'report_moment')!
    expect(report.inputSchema.required).toEqual(['kind', 'note'])
  })

  it("reports a moment for the key's owner", async () => {
    const user = await makeUser()
    const client = await connect(await keyFor(user.id))

    const { text, isError } = await call(client, 'report_moment', {
      kind: 'user_annoying',
      note: '  Asked for the same refactor three times, differently each time.  ',
      project: 'habit-tracker',
      agent: ''
    })

    expect(isError).toBe(false)
    expect(text).toBe(
      'Noted: 🙄 User being annoying. In the last 24 hours: 🙄 User being annoying 1.'
    )
    const moments = await prisma.moment.findMany()
    expect(moments).toEqual([
      expect.objectContaining({
        userId: user.id,
        kind: 'user_annoying',
        note: 'Asked for the same refactor three times, differently each time.',
        project: 'habit-tracker',
        agent: null
      })
    ])
  })

  it('refuses an unknown kind or an empty note', async () => {
    const client = await connect(await keyFor((await makeUser()).id))

    const badKind = await call(client, 'report_moment', { kind: 'meh', note: 'Hmm' })
    const noNote = await call(client, 'report_moment', { kind: 'good', note: '   ' })

    expect(badKind.isError).toBe(true)
    expect(noNote.isError).toBe(true)
    expect(await prisma.moment.count()).toBe(0)
  })

  it('slows down an agent that reports too much', async () => {
    const client = await connect(await keyFor((await makeUser()).id))
    for (let i = 0; i < 5; i++) {
      expect((await call(client, 'report_moment', { kind: 'good', note: `#${i}` })).isError).toBe(
        false
      )
    }

    const sixth = await call(client, 'report_moment', { kind: 'good', note: 'One more' })

    expect(sixth.isError).toBe(true)
    expect(sixth.text).toMatch(/try again in \d+ minutes?/)
  })

  it('sums up the last days against the days before', async () => {
    const user = await makeUser()
    const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000)
    await prisma.moment.createMany({
      data: [
        { userId: user.id, kind: 'good', note: 'a', project: 'kolla', date: daysAgo(1) },
        { userId: user.id, kind: 'good', note: 'b', project: 'kolla', date: daysAgo(2) },
        { userId: user.id, kind: 'annoying', note: 'c', project: 'glass', date: daysAgo(3) },
        { userId: user.id, kind: 'other', note: 'd', date: daysAgo(4) },
        { userId: user.id, kind: 'annoying', note: 'e', date: daysAgo(10) },
        // Outside both windows
        { userId: user.id, kind: 'good', note: 'f', date: daysAgo(20) }
      ]
    })
    const client = await connect(await keyFor(user.id))

    const { text } = await call(client, 'moment_stats', { days: 7 })

    expect(text).toBe(
      [
        '4 moments in the last 7 days (the 7 days before in brackets):',
        '- 😊 Good time: 2 (0)',
        '- 😤 Annoying time: 1 (1)',
        '- 🙄 User being annoying: 0 (0)',
        '- 💬 Something else: 1 (0)',
        'Good share: 67% (0%)',
        'Projects: kolla 2, glass 1',
        'Agents: none named'
      ].join('\n')
    )
  })

  it("lists recent moments, newest first, and never another user's", async () => {
    const user = await makeUser()
    const other = await makeUser()
    await prisma.moment.createMany({
      data: [
        { userId: user.id, kind: 'good', note: 'Old win', date: new Date('2026-10-01T10:00Z') },
        {
          userId: user.id,
          kind: 'annoying',
          note: 'Flaky test',
          project: 'kolla',
          agent: 'Claude Code',
          date: new Date('2026-10-02T11:30Z')
        },
        { userId: user.id, kind: 'good', note: 'New win', date: new Date('2026-10-03T09:15Z') },
        { userId: other.id, kind: 'good', note: 'Not yours', date: new Date('2026-10-04T09:00Z') }
      ]
    })
    const client = await connect(await keyFor(user.id))

    expect((await call(client, 'recent_moments', { limit: 2 })).text).toBe(
      [
        '2026-10-03 09:15 UTC · 😊 Good time: New win',
        '2026-10-02 11:30 UTC · 😤 Annoying time · kolla, Claude Code: Flaky test'
      ].join('\n')
    )
    expect((await call(client, 'recent_moments', { kind: 'good' })).text).not.toContain('Flaky')
  })

  it('speaks the 2026-07-28 protocol too', async () => {
    const client = await connect(await keyFor((await makeUser()).id), 'modern')
    expect(client.getProtocolEra()).toBe('modern')
    expect(client.getNegotiatedProtocolVersion()).toBe('2026-07-28')

    const { isError } = await call(client, 'report_moment', { kind: 'good', note: 'Modern times' })

    expect(isError).toBe(false)
    expect(await prisma.moment.count()).toBe(1)
  })
})
