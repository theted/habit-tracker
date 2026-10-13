import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'

// A fresh database for every run, built by the same migrations production applies
export default function setup() {
  mkdirSync('node_modules/.tmp', { recursive: true })
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    rmSync(`node_modules/.tmp/api-test.db${suffix}`, { force: true })
  }
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: 'file:./node_modules/.tmp/api-test.db' },
    stdio: 'pipe'
  })
}
