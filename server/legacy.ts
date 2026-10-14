import { prisma } from './db.js'
import { hashPassword } from './passwords.js'

// Before accounts there was one shared password (HABITS_PASSWORD) and one user, id 1, who owns
// every habit from that time. The accounts migration turned that user into "owner" with no
// password. This gives it the old shared password, once, so whoever knew it can log in as owner
// and carry on (then rename the account and change the password in Settings).
//
// It only ever fills in a missing password, so it's a no-op from then on, and HABITS_PASSWORD
// can be removed from the environment after the first login.
export const claimLegacyOwner = async (password: string | undefined) => {
  if (!password) return false
  const { count } = await prisma.user.updateMany({
    where: { id: 1, passwordHash: null },
    data: { passwordHash: await hashPassword(password) }
  })
  return count > 0
}
