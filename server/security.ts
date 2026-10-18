import type { NextFunction, Request, Response } from 'express'

const hostOf = (origin: string) => {
  try {
    return new URL(origin).host
  } catch {
    return undefined
  }
}

// Sessions live in a cookie, and a cookie gets sent with requests that other sites trigger. The
// SameSite=Lax cookie already stays off cross-site POSTs; refusing every request that changes
// something unless it says it comes from this site is the second lock (the Origin check that
// OWASP recommends). Browsers send Origin on every POST, PATCH and DELETE.
export const sameOrigin = (req: Request, res: Response, next: NextFunction) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const origin = req.get('origin')
  if (!origin || hostOf(origin) !== req.get('host')) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}

// For /mcp, where agents send no Origin at all: a request that does carry one comes from a web
// page, and only this site's own pages may call. That's the DNS rebinding guard the MCP spec asks
// servers for.
export const notCrossOrigin = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('origin')
  if (origin !== undefined && hostOf(origin) !== req.get('host')) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}

// Everything the app loads comes from its own origin: the scripts, the stylesheet and the fonts
// are Vite's build output. Inline style attributes are allowed because Vue binds them (:style).
// The one outside request is the visit counter's image (src/lib/visits.ts).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' data: https://visits.sundbergsolutions.se",
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
