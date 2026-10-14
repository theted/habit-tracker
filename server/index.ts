import path from 'node:path'
import { createApp } from './app.js'
import { claimLegacyOwner } from './legacy.js'
import { deleteExpiredSessions } from './sessions.js'

// 3100 rather than 3000, which other projects' dev servers tend to hold
const port = Number(process.env.PORT ?? 3100)
// Anyone can sign up unless SIGNUP=closed
const signupEnabled = process.env.SIGNUP !== 'closed'

if (await claimLegacyOwner(process.env.HABITS_PASSWORD)) {
  console.log('The owner account now has the HABITS_PASSWORD password; log in as "owner".')
}
await deleteExpiredSessions()

createApp({ distDir: path.resolve('dist'), signupEnabled }).listen(port, () => {
  console.log(`Server running on port ${port} (sign-up ${signupEnabled ? 'open' : 'closed'})`)
})
