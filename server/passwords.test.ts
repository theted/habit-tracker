import { describe, expect, it } from 'vitest'
import { hashPassword, needsRehash, verifyPassword } from './passwords.js'

describe('passwords', () => {
  it('hashes with Argon2id into a PHC string, salted afresh each time', async () => {
    const first = await hashPassword('correct horse')
    const second = await hashPassword('correct horse')

    expect(first).toMatch(
      /^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/
    )
    expect(first).not.toBe(second)
  })

  it('verifies the right password and only that', async () => {
    const hash = await hashPassword('correct horse')

    expect(await verifyPassword(hash, 'correct horse')).toBe(true)
    expect(await verifyPassword(hash, 'correct horse ')).toBe(false)
    expect(await verifyPassword(hash, 'Correct horse')).toBe(false)
  })

  it('treats the same characters typed different ways as the same password', async () => {
    const composed = 'café au lait'
    const decomposed = 'café au lait'

    expect(await verifyPassword(await hashPassword(composed), decomposed)).toBe(true)
  })

  it('rejects anything that is not one of its hashes', async () => {
    expect(await verifyPassword('plain text', 'plain text')).toBe(false)
    expect(await verifyPassword('$2b$10$bcrypthashlookingthing', 'x')).toBe(false)
  })

  it('asks for a rehash only when the settings were weaker', async () => {
    const hash = await hashPassword('correct horse')

    expect(needsRehash(hash)).toBe(false)
    expect(needsRehash(hash.replace('m=19456,t=2', 'm=8192,t=2'))).toBe(true)
    expect(needsRehash(hash.replace('m=19456,t=2', 'm=19456,t=1'))).toBe(true)
    expect(needsRehash('garbage')).toBe(true)
  })
})
