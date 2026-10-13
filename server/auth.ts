import { createHash, timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

// A single shared password, sent by the client as X-Password. A stopgap until the app has real
// accounts; replacing it means replacing this file and src/auth.ts.
const password = process.env.HABITS_PASSWORD
if (!password) throw new Error('HABITS_PASSWORD is not set')

const digest = (value: string) => createHash('sha256').update(value).digest()
const expected = digest(password)

export const requirePassword = (req: Request, res: Response, next: NextFunction) => {
  const given = req.header('x-password') ?? ''
  if (!timingSafeEqual(digest(given), expected)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}
