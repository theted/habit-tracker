import { argon2, randomBytes, timingSafeEqual, type Argon2Parameters } from 'node:crypto'
import { promisify } from 'node:util'

const derive = promisify(argon2)

// Argon2id with OWASP's recommended minimum: 19 MiB of memory, two passes, one lane. Raising these
// later is safe: older hashes keep verifying, and are upgraded at the next login (needsRehash).
const PARAMS = { memory: 19_456, passes: 2, parallelism: 1 }
const SALT_BYTES = 16
const HASH_BYTES = 32

// Stored in the PHC string format that libargon2 and other Argon2 libraries share:
// $argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>, both in unpadded base64
const PHC = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/

const b64 = (buffer: Buffer) => buffer.toString('base64').replace(/=+$/, '')

// The same password typed on different keyboards can arrive as different code points (é as one
// character or as e plus an accent); NFKC makes them one
const normalize = (password: string) => password.normalize('NFKC')

const run = async (password: string, salt: Buffer, params: typeof PARAMS, length: number) =>
  derive('argon2id', {
    message: normalize(password),
    nonce: salt,
    memory: params.memory,
    passes: params.passes,
    parallelism: params.parallelism,
    tagLength: length
  } satisfies Argon2Parameters)

export const hashPassword = async (password: string) => {
  const salt = randomBytes(SALT_BYTES)
  const hash = await run(password, salt, PARAMS, HASH_BYTES)
  const { memory, passes, parallelism } = PARAMS
  return `$argon2id$v=19$m=${memory},t=${passes},p=${parallelism}$${b64(salt)}$${b64(hash)}`
}

const parse = (stored: string) => {
  const match = PHC.exec(stored)
  if (!match) return undefined
  const [, memory, passes, parallelism, salt, hash] = match
  return {
    params: { memory: Number(memory), passes: Number(passes), parallelism: Number(parallelism) },
    salt: Buffer.from(salt!, 'base64'),
    hash: Buffer.from(hash!, 'base64')
  }
}

export const verifyPassword = async (stored: string, password: string) => {
  const parsed = parse(stored)
  if (!parsed) return false
  const candidate = await run(password, parsed.salt, parsed.params, parsed.hash.length)
  return timingSafeEqual(candidate, parsed.hash)
}

// True when a hash was made with weaker settings than today's
export const needsRehash = (stored: string) => {
  const parsed = parse(stored)
  return (
    !parsed ||
    parsed.params.memory < PARAMS.memory ||
    parsed.params.passes < PARAMS.passes ||
    parsed.params.parallelism !== PARAMS.parallelism
  )
}

// Verified against when a username doesn't exist, so that a miss takes as long as a wrong password
// and response times don't reveal which usernames are taken
let dummy: Promise<string> | undefined
export const dummyHash = () => (dummy ??= hashPassword(randomBytes(16).toString('hex')))
