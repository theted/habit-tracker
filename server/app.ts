import { STATUS_CODES } from 'node:http'
import path from 'node:path'
import express, { type NextFunction, type Request, type Response } from 'express'
import { ZodError } from 'zod'
import { requirePassword } from './auth.js'
import * as db from './db.js'
import { habitCreate, habitUpdate, id, trackCreate } from './validation.js'

const api = () => {
  const router = express.Router()
  router.use(requirePassword)

  // Lets the login screen check a password without fetching anything
  router.get('/auth', (_req, res) => {
    res.sendStatus(204)
  })

  router.get('/habits', async (_req, res) => {
    res.json(await db.listHabits())
  })

  router.get('/habits/:id', async (req, res) => {
    const habit = await db.getHabit(id.parse(req.params.id))
    if (!habit) {
      res.status(404).json({ error: 'Not Found' })
      return
    }
    res.json(habit)
  })

  router.post('/habits', async (req, res) => {
    res.status(201).json(await db.createHabit(habitCreate.parse(req.body)))
  })

  router.patch('/habits/:id', async (req, res) => {
    res.json(await db.updateHabit(id.parse(req.params.id), habitUpdate.parse(req.body)))
  })

  router.delete('/habits/:id', async (req, res) => {
    await db.deleteHabit(id.parse(req.params.id))
    res.sendStatus(204)
  })

  // Logs one entry: now, or at a given date for a check-in that was forgotten
  router.post('/habits/:id/tracks', async (req, res) => {
    const { date } = trackCreate.parse(req.body ?? {})
    res.status(201).json(await db.addTrack(id.parse(req.params.id), date))
  })

  router.delete('/tracks/:id', async (req, res) => {
    await db.deleteTrack(id.parse(req.params.id))
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
      error: 'Bad Request',
      issues: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
    })
    return
  }
  const status = db.isNotFound(err) ? 404 : (err.status ?? 500)
  if (status >= 500) console.error(err)
  res.status(status).json({ error: STATUS_CODES[status] ?? 'Error' })
}

// distDir is the built SPA; without it (in tests) only the API is served
export const createApp = ({ distDir, log = true }: { distDir?: string; log?: boolean } = {}) => {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '16kb' }))
  if (log) app.use(logger)

  app.use('/api', api())

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
