import { createHash, randomBytes } from 'node:crypto'
import type { Request, Response } from 'express'
import { prisma, publicUser } from './db.js'

const DAY = 86_400_000
const LIFETIME = 30 * DAY
// A session that is used in the second half of its life gets a full lifetime again, so someone
// who opens the app at least every couple of weeks stays logged in
const RENEW_WITHIN = 15 * DAY

export const COOKIE = 'habits_session'

// The cookie holds a random token; the database holds only its SHA-256. A leaked copy of the
// database therefore contains no usable sessions. The token has 256 bits of entropy, so a fast
// unsalted hash is the right tool here (unlike for passwords).
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export const createSession = async (userId: number) => {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + LIFETIME)
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } })
  return { token, expiresAt }
}

export const validateSession = async (token: string) => {
  const id = hashToken(token)
  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: { select: publicUser } }
  })
  if (!session) return undefined
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.deleteMany({ where: { id } })
    return undefined
  }
  let { expiresAt } = session
  const renewed = expiresAt.getTime() - Date.now() < RENEW_WITHIN
  if (renewed) {
    expiresAt = new Date(Date.now() + LIFETIME)
    await prisma.session.update({ where: { id }, data: { expiresAt } })
  }
  return { id, user: session.user, expiresAt, renewed }
}

export const invalidateSession = (id: string) => prisma.session.deleteMany({ where: { id } })

// Every session of a user's, except perhaps the one making the request
export const invalidateUserSessions = (userId: number, except?: string) =>
  prisma.session.deleteMany({ where: { userId, ...(except && { id: { not: except } }) } })

export const deleteExpiredSessions = () =>
  prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } })

// HttpOnly keeps it from scripts; SameSite=Lax keeps it off cross-site POSTs; Secure whenever the
// request came in over HTTPS (behind the box's nginx, that's X-Forwarded-Proto via trust proxy)
const cookieOptions = (req: Request) =>
  ({ httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/' }) as const

export const setSessionCookie = (req: Request, res: Response, token: string, expires: Date) =>
  res.cookie(COOKIE, token, { ...cookieOptions(req), expires })

export const clearSessionCookie = (req: Request, res: Response) =>
  res.clearCookie(COOKIE, cookieOptions(req))

export const readSessionCookie = (req: Request) => {
  for (const pair of req.headers.cookie?.split(';') ?? []) {
    const [name, ...value] = pair.trim().split('=')
    if (name === COOKIE) return decodeURIComponent(value.join('='))
  }
  return undefined
}
