// A Claude Code hook (see .claude/settings.json): every session that starts or resumes here logs an
// entry in Habits, so the habit tracker tracks the work on itself. The habit is "Work on <folder>",
// created on the first entry.
//
// It does nothing until HABITS_KEY holds a key from Settings → Agents, so it stays out of the way
// for anyone else who clones the repo. HABITS_URL points it at another server (a dev one, say), and
// HABITS_HABIT names a different habit.
//
// Plain Node with no dependencies, so it also works copied into other repos or ~/.claude.
import path from 'node:path'

const key = process.env.HABITS_KEY
if (!key) process.exit(0)

const server = process.env.HABITS_URL || 'https://habits.sundbergsolutions.se'
const project = path.basename(process.env.CLAUDE_PROJECT_DIR || process.cwd())
const habit = process.env.HABITS_HABIT || `Work on ${project}`

// Errors go to stderr, which Claude Code shows in its debug log but not in the conversation
try {
  const res = await fetch(new URL('/api/track', server), {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ habit, emoji: '🛠️' }),
    signal: AbortSignal.timeout(5000)
  })
  if (!res.ok) console.error(`Habits: ${res.status} ${await res.text()}`)
} catch (err) {
  console.error(`Habits: ${err.message}`)
}
