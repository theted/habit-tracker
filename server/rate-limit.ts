import type { Response } from 'express'

// Fixed-window counters in memory: enough for one process on one box. A restart forgets them,
// which only ever errs towards letting someone try again.
export class RateLimiter {
  private windows = new Map<string, { count: number; resetAt: number }>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  // Counts an attempt; answers how many seconds to wait, or 0 if it may go ahead
  hit(key: string) {
    const now = Date.now()
    let window = this.windows.get(key)
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + this.windowMs }
      this.windows.set(key, window)
    }
    window.count++
    if (this.windows.size > 10_000) this.sweep(now)
    return window.count > this.limit ? Math.ceil((window.resetAt - now) / 1000) : 0
  }

  reset(key: string) {
    this.windows.delete(key)
  }

  private sweep(now: number) {
    for (const [key, window] of this.windows) if (window.resetAt <= now) this.windows.delete(key)
  }
}

export const tooManyRequests = (res: Response, retryAfter: number) => {
  res.set('Retry-After', String(retryAfter))
  res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' })
}
