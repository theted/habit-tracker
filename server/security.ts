import type { NextFunction, Request, Response } from 'express'

// Sessions live in a cookie, and a cookie gets sent with requests that other sites trigger. The
// SameSite=Lax cookie already stays off cross-site POSTs; refusing every request that changes
// something unless it says it comes from this site is the second lock (the Origin check that
// OWASP recommends). Browsers send Origin on every POST, PATCH and DELETE.
export const sameOrigin = (req: Request, res: Response, next: NextFunction) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const origin = req.get('origin')
  let host: string | undefined
  try {
    host = origin ? new URL(origin).host : undefined
  } catch {
    host = undefined
  }
  if (!host || host !== req.get('host')) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}

// Everything the app loads comes from its own origin: the scripts, the stylesheet and the fonts
// are Vite's build output. Inline style attributes are allowed because Vue binds them (:style).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join('; ')

export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.set({
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Opener-Policy': 'same-origin'
  })
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=15552000')
  next()
}
