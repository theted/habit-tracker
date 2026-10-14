import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from './db.js'
import { claimLegacyOwner } from './legacy.js'
import { verifyPassword } from './passwords.js'

beforeEach(async () => {
  await prisma.user.update({ where: { id: 1 }, data: { username: 'owner', passwordHash: null } })
})

const ownerHash = async () =>
  (await prisma.user.findUniqueOrThrow({ where: { id: 1 } })).passwordHash

describe('claimLegacyOwner', () => {
  it('gives the owner the old shared password, once', async () => {
    expect(await claimLegacyOwner('the old shared password')).toBe(true)
    expect(await verifyPassword((await ownerHash())!, 'the old shared password')).toBe(true)

    expect(await claimLegacyOwner('a different one')).toBe(false)
    expect(await verifyPassword((await ownerHash())!, 'the old shared password')).toBe(true)
  })

  it('does nothing without a password', async () => {
    expect(await claimLegacyOwner(undefined)).toBe(false)
    expect(await claimLegacyOwner('')).toBe(false)
    expect(await ownerHash()).toBeNull()
  })
})
