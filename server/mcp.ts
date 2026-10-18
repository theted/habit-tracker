import { toNodeHandler } from '@modelcontextprotocol/node'
import { createMcpHandler, McpServer, type AuthInfo } from '@modelcontextprotocol/server'
import express from 'express'
import { z } from 'zod'
import * as db from './db.js'
import { RateLimiter, tooManyRequests } from './rate-limit.js'
import { notCrossOrigin } from './security.js'
import { validateApiToken } from './tokens.js'
import { MOMENT_KINDS, type MomentKind } from './validation.js'

// An MCP server for AI agents, at /mcp: they report how their work is going ("moments"), and can
// read back what has been reported. Agents authenticate with a key the user creates in Settings,
// sent as Authorization: Bearer hab_…. Every request gets a fresh server bound to the key's owner
// (the SDK's stateless serving), so nothing is kept between requests.

declare module 'express-serve-static-core' {
  interface Request {
    // From the bearer token; @modelcontextprotocol/node hands it to the server factory
    auth?: AuthInfo
  }
}

export interface McpOptions {
  // Reports allowed per key per hour, so an agent stuck in a loop can't flood the diary
  reportsPerHour?: number
}

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

// Keep in step with src/lib/moments.ts
const KINDS: Record<MomentKind, { label: string; emoji: string }> = {
  good: { label: 'Good time', emoji: '😊' },
  annoying: { label: 'Annoying time', emoji: '😤' },
  user_annoying: { label: 'User being annoying', emoji: '🙄' },
  other: { label: 'Something else', emoji: '💬' }
}
const kindName = (kind: string) => {
  const meta = KINDS[kind as MomentKind]
  return meta ? `${meta.emoji} ${meta.label}` : kind
}

// Sent to the agent when it connects; clients such as Claude Code put it in the system prompt
const INSTRUCTIONS = `Habits keeps a diary of how AI agents' work is going, for the user who connected you. \
When something notable happens, call report_moment:
- good: something clicked, a satisfying fix, a pleasant stretch of working together
- annoying: the work itself fought back (flaky tools, baffling errors, dead ends)
- user_annoying: the user made it harder than it needed to be (shifting or vague requests, ignored advice, impatience)
- other: anything else worth remembering
Report as it happens, a few times per session at most, never for routine steps. Be honest and specific, in a sentence or two, \
with no secrets, credentials, code or personal data. Pass project (the repository or directory name) and agent (your product and model). \
moment_stats and recent_moments answer questions about how it has been going.`

const kind = z.enum(MOMENT_KINDS)
const label = z.string().trim().max(60)

const text = (value: string) => ({ content: [{ type: 'text' as const, text: value }] })
const toolError = (value: string) => ({ ...text(value), isError: true })

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

const tally = (groups: { key: string | null; count: number }[]) =>
  new Map(groups.map((group) => [group.key, group.count]))

const buildServer = (userId: number, tokenId: number, reports: RateLimiter) => {
  const server = new McpServer(
    { name: 'habits', title: 'Habits', version: '1.0.0' },
    { instructions: INSTRUCTIONS }
  )

  server.registerTool(
    'report_moment',
    {
      title: 'Report a moment',
      description:
        'Log how your work with the user is going: a good time, an annoying time, the user being annoying, or something else. The user sees these on their Agents page, with statistics over time.',
      inputSchema: z.object({
        kind: kind.describe(
          'good: something went well. annoying: the work itself was frustrating. ' +
            'user_annoying: the user made it harder than it had to be. other: anything else.'
        ),
        note: z
          .string()
          .trim()
          .min(1)
          .max(280)
          .describe(
            'What happened, in a sentence or two. No secrets, credentials, code or personal data.'
          ),
        project: label
          .optional()
          .describe('The project you are working in, e.g. the repository or directory name'),
        agent: label
          .optional()
          .describe('Who you are: product and model, e.g. "Claude Code (Opus 5.5)"')
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async ({ kind, note, project, agent }) => {
      const wait = reports.hit(String(tokenId))
      if (wait) {
        return toolError(
          `That's a lot of moments: try again in ${plural(Math.ceil(wait / 60), 'minute')}.`
        )
      }
      await db.createMoment(userId, {
        kind,
        note,
        project: project || undefined,
        agent: agent || undefined
      })
      const now = new Date()
      const today = tally(await db.countMoments(userId, 'kind', new Date(+now - DAY), now))
      const counts = MOMENT_KINDS.filter((key) => today.has(key))
        .map((key) => `${kindName(key)} ${today.get(key)}`)
        .join(', ')
      return text(`Noted: ${kindName(kind)}. In the last 24 hours: ${counts}.`)
    }
  )

  server.registerTool(
    'moment_stats',
    {
      title: 'Moment statistics',
      description:
        'How it has been going: moments of each kind over the last N days, compared with the N days before, and the busiest projects and agents.',
      inputSchema: z.object({
        days: z.number().int().min(1).max(365).default(30).describe('How many days back to look')
      }),
      annotations: { readOnlyHint: true, openWorldHint: false }
    },
    async ({ days }) => {
      const now = new Date()
      const from = new Date(+now - days * DAY)
      const before = new Date(+from - days * DAY)
      const [current, previous, projects, agents] = await Promise.all([
        db.countMoments(userId, 'kind', from, now).then(tally),
        db.countMoments(userId, 'kind', before, from).then(tally),
        db.countMoments(userId, 'project', from, now),
        db.countMoments(userId, 'agent', from, now)
      ])
      const total = [...current.values()].reduce((sum, count) => sum + count, 0)
      const period = days === 1 ? 'the last 24 hours' : `the last ${days} days`
      if (!total) return text(`No moments in ${period}.`)

      // Good times as a share of the ones with a mood: good, annoying and user_annoying
      const goodShare = (counts: Map<string | null, number>) => {
        const good = counts.get('good') ?? 0
        const rated = good + (counts.get('annoying') ?? 0) + (counts.get('user_annoying') ?? 0)
        return rated ? `${Math.round((good / rated) * 100)}%` : 'n/a'
      }
      const top = (groups: { key: string | null; count: number }[]) =>
        groups
          .filter((group) => group.key)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((group) => `${group.key} ${group.count}`)
          .join(', ') || 'none named'

      return text(
        [
          `${plural(total, 'moment')} in ${period} (the ${days} days before in brackets):`,
          ...MOMENT_KINDS.map(
            (key) => `- ${kindName(key)}: ${current.get(key) ?? 0} (${previous.get(key) ?? 0})`
          ),
          `Good share: ${goodShare(current)} (${goodShare(previous)})`,
          `Projects: ${top(projects)}`,
          `Agents: ${top(agents)}`
        ].join('\n')
      )
    }
  )

  server.registerTool(
    'recent_moments',
    {
      title: 'Recent moments',
      description: 'The latest moments reported, newest first, optionally of one kind or project.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(10),
        kind: kind.optional(),
        project: label.optional()
      }),
      annotations: { readOnlyHint: true, openWorldHint: false }
    },
    async ({ limit, kind, project }) => {
      const moments = await db.recentMoments(userId, { limit, kind, project: project || undefined })
      if (!moments.length) return text('No moments yet.')
      return text(
        moments
          .map((moment) => {
            const where = [moment.project, moment.agent].filter(Boolean).join(', ')
            const when = moment.date.toISOString().slice(0, 16).replace('T', ' ')
            return `${when} UTC · ${kindName(moment.kind)}${where ? ` · ${where}` : ''}: ${moment.note}`
          })
          .join('\n')
      )
    }
  )

  return server
}

const bearer = (header: string | undefined) => /^Bearer\s+(\S+)\s*$/i.exec(header ?? '')?.[1]

export const mcp = ({ reportsPerHour = 60 }: McpOptions = {}) => {
  const reports = new RateLimiter(reportsPerHour, 60 * MINUTE)
  // Keys are far too long to guess, but there's no reason to let anyone keep trying
  const failures = new RateLimiter(30, 15 * MINUTE)

  const handler = createMcpHandler(
    ({ authInfo }) => {
      const { userId, tokenId } = (authInfo?.extra ?? {}) as { userId?: number; tokenId?: number }
      if (!userId || !tokenId) throw new Error('MCP request without a validated key')
      return buildServer(userId, tokenId, reports)
    },
    { onerror: (err) => console.error('MCP:', err) }
  )
  const serve = toNodeHandler(handler, { onerror: (err) => console.error('MCP:', err) })

  const router = express.Router()
  router.use(notCrossOrigin)

  router.use(async (req, res, next) => {
    const token = bearer(req.get('authorization'))
    const key = token && (await validateApiToken(token))
    if (!key) {
      const wait = failures.hit(req.ip ?? '')
      if (wait) return tooManyRequests(res, wait)
      res.set('WWW-Authenticate', 'Bearer realm="habits"')
      res.status(401).json({
        error: 'Unauthorized: send a key from Settings → Agents as "Authorization: Bearer hab_…"'
      })
      return
    }
    req.auth = {
      token: token!,
      clientId: `key-${key.id}`,
      scopes: [],
      extra: { userId: key.userId, tokenId: key.id }
    }
    next()
  })

  router.all('/', (req, res) => serve(req, res, req.body))

  return router
}
