import { createHash, randomBytes } from 'node:crypto'
import { NotFoundError, prisma } from './db.js'

// The keys AI agents use for /mcp. Like session tokens they carry 256 random bits and only their
// SHA-256 is stored, so the database holds nothing that would let anyone in. The prefix makes a
// leaked one recognisable, to people and to secret scanners.
const PREFIX = 'hab_'

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

// Writing lastUsedAt on every call would be a write per tool call; once a minute is plenty for
// "last used 3 hours ago"
const TOUCH_EVERY = 60_000

const tokenSelect = { id: true, name: true, createdAt: true, lastUsedAt: true } as const

export const createApiToken = async (userId: number, name: string) => {
  const token = PREFIX + randomBytes(32).toString('base64url')
  const apiToken = await prisma.apiToken.create({
    data: { hash: hashToken(token), name, userId },
    select: tokenSelect
  })
  return { token, apiToken }
}

export const listApiTokens = (userId: number) =>
  prisma.apiToken.findMany({ where: { userId }, select: tokenSelect, orderBy: { id: 'asc' } })

export const revokeApiToken = async (userId: number, id: number) => {
  const { count } = await prisma.apiToken.deleteMany({ where: { id, userId } })
  if (!count) throw new NotFoundError()
}

// The token's owner, or undefined for a token that is malformed, unknown or revoked
export const validateApiToken = async (token: string) => {
  if (!token.startsWith(PREFIX)) return undefined
  const found = await prisma.apiToken.findUnique({
    where: { hash: hashToken(token) },
    select: { id: true, userId: true, lastUsedAt: true }
  })
  if (!found) return undefined
  if (!found.lastUsedAt || Date.now() - found.lastUsedAt.getTime() > TOUCH_EVERY) {
    await prisma.apiToken.update({ where: { id: found.id }, data: { lastUsedAt: new Date() } })
  }
  return { id: found.id, userId: found.userId }
}
