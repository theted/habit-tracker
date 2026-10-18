import type { NextFunction, Request, Response } from 'express'
import { RateLimiter, tooManyRequests } from './rate-limit.js'
import { validateApiToken } from './tokens.js'

// Agents and scripts send a key from Settings → Agents as Authorization: Bearer hab_…, for /mcp
// and POST /api/track. No cookie is involved, so there's no CSRF to guard against.

declare module 'express-serve-static-core' {
  interface Request {
    key?: { id: number; userId: number; token: string }
  }
}

const MINUTE = 60_000

const bearer = (header: string | undefined) => /^Bearer\s+(\S+)\s*$/i.exec(header ?? '')?.[1]

export const requireKey = () => {
  // Keys are far too long to guess, but there's no reason to let anyone keep trying
  const failures = new RateLimiter(30, 15 * MINUTE)

  return async (req: Request, res: Response, next: NextFunction) => {
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
    req.key = { ...key, token: token! }
    next()
  }
}
