import { STATUS_CODES } from 'node:http'
import path from 'node:path'
import express, { type NextFunction, type Request, type Response } from 'express'
import { ZodError } from 'zod'
import * as db from './db.js'
import { dummyHash, hashPassword, needsRehash, verifyPassword } from './passwords.js'
import { RateLimiter, tooManyRequests } from './rate-limit.js'
import { sameOrigin, securityHeaders } from './security.js'
import {
  clearSessionCookie,
  createSession,
  invalidateSession,
  invalidateUserSessions,
  readSessionCookie,
  setSessionCookie,
  validateSession
} from './sessions.js'
import {
  accountDelete,
  accountUpdate,
  credentials,
  habitCreate,
  habitUpdate,
  id,
  registration,
  trackCreate
} from './validation.js'

type PublicUser = { id: number; username: string; createdAt: Date }

declare module 'express-serve-static-core' {
  interface Request {
    user?: PublicUser
    sessionId?: string
  }
}

export interface AppOptions {
  // The built SPA; without it (in tests) only the API is served
  distDir?: string
  log?: boolean
  signupEnabled?: boolean
  // Attempts allowed per window; tests turn them up
  limits?: { loginPerAccount?: number; loginPerIp?: number; signupsPerIp?: number }
}

const MINUTE = 60_000

const MESSAGES = {
  wrongLogin: 'Wrong username or password',
  wrongPassword: "That's not your current password",
  taken: 'That username is taken'
}

const issue = (path: string, message: string) => ({ error: message, issues: [{ path, message }] })

const api = ({ signupEnabled = true, limits = {} }: AppOptions) => {
  const router = express.Router()

  // Guessing passwords: ten tries per account per address, and a hundred per address across
  // accounts, every fifteen minutes. Signing up: ten accounts per address an hour.
  const loginPerAccount = new RateLimiter(limits.loginPerAccount ?? 10, 15 * MINUTE)
  const loginPerIp = new RateLimiter(limits.loginPerIp ?? 100, 15 * MINUTE)
  const signupsPerIp = new RateLimiter(limits.signupsPerIp ?? 10, 60 * MINUTE)
  // Checking the current password in Settings is another way to guess it
  const passwordChecks = new RateLimiter(limits.loginPerAccount ?? 10, 15 * MINUTE)

  const startSession = async (req: Request, res: Response, userId: number) => {
    const { token, expiresAt } = await createSession(userId)
    setSessionCookie(req, res, token, expiresAt)
  }

  const checkPassword = async (userId: number, password: string) => {
    const user = await db.findUserById(userId)
    return !!user?.passwordHash && verifyPassword(user.passwordHash, password)
  }

  // Who's asking: the session cookie, checked on every request
  router.use(async (req, res, next) => {
    const token = readSessionCookie(req)
    if (!token) return next()
    const session = await validateSession(token)
    if (session) {
      req.user = session.user
      req.sessionId = session.id
      if (session.renewed) setSessionCookie(req, res, token, session.expiresAt)
    } else {
      clearSessionCookie(req, res)
    }
    next()
  })

  // Public: what the login screen needs to know
  router.get('/auth/status', (req, res) => {
    res.json({ user: req.user ?? null, signupEnabled })
  })

  router.post('/auth/register', async (req, res) => {
    if (!signupEnabled) {
      res.status(403).json({ error: 'Sign-up is closed' })
      return
    }
    const wait = signupsPerIp.hit(req.ip ?? '')
    if (wait) return tooManyRequests(res, wait)

    const { username, password } = registration.parse(req.body)
    let user: PublicUser
    try {
      user = await db.createUser(username, await hashPassword(password))
    } catch (err) {
      if (!db.isTaken(err)) throw err
      res.status(409).json(issue('username', MESSAGES.taken))
      return
    }
    await startSession(req, res, user.id)
    res.status(201).json({ user })
  })

  router.post('/auth/login', async (req, res) => {
    const { username, password } = credentials.parse(req.body)
    const accountKey = `${req.ip}|${username}`
    const wait = loginPerAccount.hit(accountKey) || loginPerIp.hit(req.ip ?? '')
    if (wait) return tooManyRequests(res, wait)

    const user = await db.findUserByUsername(username)
    // An unknown username is checked against a dummy hash, so it takes as long as a wrong password
    const valid = await verifyPassword(user?.passwordHash ?? (await dummyHash()), password)
    if (!user?.passwordHash || !valid) {
      res.status(401).json({ error: MESSAGES.wrongLogin })
      return
    }

    loginPerAccount.reset(accountKey)
    if (needsRehash(user.passwordHash)) {
      await db.updateUser(user.id, { passwordHash: await hashPassword(password) })
    }
    await startSession(req, res, user.id)
    res.json({ user: { id: user.id, username: user.username, createdAt: user.createdAt } })
  })

  router.post('/auth/logout', async (req, res) => {
    if (req.sessionId) await invalidateSession(req.sessionId)
    clearSessionCookie(req, res)
    res.sendStatus(204)
  })

  // Everything below needs a logged-in user
  router.use((req, res, next) => {
    if (req.user) return next()
    res.status(401).json({ error: 'Unauthorized' })
  })

  // Changing the username or password takes the current password
  router.patch('/account', async (req, res) => {
    const user = req.user!
    const input = accountUpdate.parse(req.body)
    const wait = passwordChecks.hit(`account|${user.id}`)
    if (wait) return tooManyRequests(res, wait)
    if (!(await checkPassword(user.id, input.currentPassword))) {
      res.status(403).json(issue('currentPassword', MESSAGES.wrongPassword))
      return
    }
    if (input.newPassword?.toLowerCase() === (input.username ?? user.username)) {
      res.status(400).json(issue('newPassword', "Don't use your username as your password"))
      return
    }

    let updated: PublicUser
    try {
      updated = await db.updateUser(user.id, {
        username: input.username,
        passwordHash: input.newPassword && (await hashPassword(input.newPassword))
      })
    } catch (err) {
      if (!db.isTaken(err)) throw err
      res.status(409).json(issue('username', MESSAGES.taken))
      return
    }
    // A new password logs out every other device, in case the old one leaked
    if (input.newPassword) await invalidateUserSessions(user.id, req.sessionId)
    res.json({ user: updated })
  })

  router.delete('/account', async (req, res) => {
    const user = req.user!
    const { password } = accountDelete.parse(req.body)
    const wait = passwordChecks.hit(`account|${user.id}`)
    if (wait) return tooManyRequests(res, wait)
    if (!(await checkPassword(user.id, password))) {
      res.status(403).json(issue('password', MESSAGES.wrongPassword))
      return
    }
    await db.deleteUser(user.id)
    clearSessionCookie(req, res)
    res.sendStatus(204)
  })

  router.get('/habits', async (req, res) => {
    res.json(await db.listHabits(req.user!.id))
  })

  router.get('/habits/:id', async (req, res) => {
    const habit = await db.getHabit(req.user!.id, id.parse(req.params.id))
    if (!habit) throw new db.NotFoundError()
    res.json(habit)
  })

  router.post('/habits', async (req, res) => {
    res.status(201).json(await db.createHabit(req.user!.id, habitCreate.parse(req.body)))
  })

  router.patch('/habits/:id', async (req, res) => {
    const habit = await db.updateHabit(
      req.user!.id,
      id.parse(req.params.id),
      habitUpdate.parse(req.body)
    )
    res.json(habit)
  })

  router.delete('/habits/:id', async (req, res) => {
    await db.deleteHabit(req.user!.id, id.parse(req.params.id))
    res.sendStatus(204)
  })

  // Logs one entry: now, or at a given date for a check-in that was forgotten
  router.post('/habits/:id/tracks', async (req, res) => {
    const { date } = trackCreate.parse(req.body ?? {})
    res.status(201).json(await db.addTrack(req.user!.id, id.parse(req.params.id), date))
  })

  router.delete('/tracks/:id', async (req, res) => {
    await db.deleteTrack(req.user!.id, id.parse(req.params.id))
    res.sendStatus(204)
  })

  // Unknown API paths are 404s, not the SPA's index.html
  router.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' })
  })

  return router
}

const logger = (req: Request, _res: Response, next: NextFunction) => {
  console.info(`${new Date().toISOString()} ${req.ip} ${req.method} ${req.url}`)
  next()
}

// Express 5 routes rejected promises here, so a bad request is a 4xx rather than a crashed
// process. Errors that carry a status (a missing asset, a malformed JSON body) keep it.
const errorHandler = (
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: err.issues[0]?.message ?? 'Bad Request',
      issues: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
    })
    return
  }
  const status = db.isNotFound(err) ? 404 : (err.status ?? 500)
  if (status >= 500) console.error(err)
  res.status(status).json({ error: STATUS_CODES[status] ?? 'Error' })
}

export const createApp = (options: AppOptions = {}) => {
  const { distDir, log = true } = options
  const app = express()
  app.disable('x-powered-by')
  // On the box, requests arrive from the host nginx through Docker's network; believe its
  // X-Forwarded-For (the real address, for rate limits) and X-Forwarded-Proto (for Secure cookies)
  app.set('trust proxy', 'loopback, linklocal, uniquelocal')
  app.use(securityHeaders)
  app.use(express.json({ limit: '16kb' }))
  if (log) app.use(logger)

  app.use('/api', sameOrigin, api(options))

  if (distDir) {
    // Fingerprinted assets can be cached for good; index.html must not be
    app.use(
      '/assets',
      express.static(path.join(distDir, 'assets'), {
        immutable: true,
        maxAge: '1y',
        fallthrough: false
      })
    )
    app.use(express.static(distDir, { index: false }))
    app.get('/{*splat}', (_req, res) => {
      res.set('Cache-Control', 'no-cache')
      res.sendFile(path.join(distDir, 'index.html'))
    })
  }

  app.use(errorHandler)
  return app
}
