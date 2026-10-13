import { STATUS_CODES } from 'node:http'
import path from 'node:path'
import express, { type NextFunction, type Request, type Response } from 'express'
import { requirePassword } from './auth.js'
import { getHabits, getHabit, createHabit, deleteHabit, addTrack } from './db.js'

// 3100 rather than 3000, which other projects' dev servers tend to hold
const port = Number(process.env.PORT ?? 3100)
const distDir = path.resolve('dist')

const app = express()

app.use(express.json())

const logger = (req: Request, _: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString()
  const { method, url, ip } = req

  console.info(`${timestamp} ${ip} ${method} ${url}`)
  next()
}
app.use(logger)

const api = express.Router()
api.use(requirePassword)

// Lets the login screen check a password without fetching anything
api.get('/auth', (_req, res) => {
  res.sendStatus(204)
})

api.get('/habits', async (_req, res) => {
  const habits = await getHabits()
  res.json(habits)
})

api.get('/habits/:id', async (req, res) => {
  const habit = await getHabit(Number(req.params.id))
  if (!habit) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(habit)
})

api.delete('/habits/:id', async (req, res) => {
  const deletedHabit = await deleteHabit(Number(req.params.id))
  res.json(deletedHabit)
})

api.post('/habits', async (req, res) => {
  const { title } = req.body
  const habit = await createHabit(title)
  res.json(habit)
})

api.post('/track', async (req, res) => {
  const { habitId } = req.body
  const trackEntry = await addTrack(Number(habitId))
  res.json(trackEntry)
})

// Unknown API paths are 404s, not the SPA's index.html
api.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' })
})

app.use('/api', api)

// The built SPA. Fingerprinted assets can be cached for good; index.html must not be.
app.use(
  '/assets',
  express.static(path.join(distDir, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false })
)
app.use(express.static(distDir, { index: false }))
app.get('/{*splat}', (_req, res) => {
  res.set('Cache-Control', 'no-cache')
  res.sendFile(path.join(distDir, 'index.html'))
})

// Express 5 routes rejected promises here, so a bad id is a 500 rather than a crashed process.
// Errors that carry a status (a missing asset, a malformed JSON body) keep it.
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status ?? 500
  if (status >= 500) console.error(err)
  res.status(status).json({ error: STATUS_CODES[status] ?? 'Error' })
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
