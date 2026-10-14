// Account chores for whoever runs the box, since there is no email to reset a password with:
//
//   node dist-server/cli.js list-users
//   node dist-server/cli.js set-password <username>     (asks for the password)
//
// In the container: docker compose exec app node dist-server/cli.js …
import { createInterface } from 'node:readline/promises'
import { prisma } from './db.js'
import { hashPassword } from './passwords.js'
import { invalidateUserSessions } from './sessions.js'
import { newPassword } from './validation.js'

// Reads a line without echoing it
const askSecret = async (question: string) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  const output = rl as unknown as { _writeToOutput: (text: string) => void }
  output._writeToOutput = (text) => {
    if (text.includes(question)) process.stdout.write(text)
  }
  const answer = await rl.question(question)
  rl.close()
  process.stdout.write('\n')
  return answer
}

const [command, username] = process.argv.slice(2)

try {
  if (command === 'list-users') {
    const users = await prisma.user.findMany({ include: { _count: { select: { habits: true } } } })
    for (const user of users) {
      const state = user.passwordHash ? '' : '  (no password yet)'
      console.log(`${user.username}  ${user._count.habits} habits${state}`)
    }
  } else if (command === 'set-password' && username) {
    const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } })
    if (!user) throw new Error(`No user called ${username}`)
    const password = newPassword.parse(await askSecret('New password: '))
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) }
    })
    const { count } = await invalidateUserSessions(user.id)
    console.log(`Password set for ${user.username}; ${count} sessions logged out.`)
  } else {
    console.log('Usage: cli.js list-users | set-password <username>')
    process.exitCode = 1
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
