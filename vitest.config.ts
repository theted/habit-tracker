import { fileURLToPath } from 'node:url'
import { mergeConfig } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Stats are calendar maths; pin the zone so "today" means the same thing on every machine.
// Set here, before the test workers start, so they inherit it.
process.env.TZ = 'UTC'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      root: fileURLToPath(new URL('./', import.meta.url)),
      projects: [
        {
          extends: true,
          test: {
            name: 'ui',
            environment: 'jsdom',
            include: ['src/**/*.test.ts'],
            exclude: [...configDefaults.exclude],
            setupFiles: ['src/test/setup.ts']
          }
        },
        {
          test: {
            name: 'api',
            environment: 'node',
            include: ['server/**/*.test.ts'],
            globalSetup: ['server/test/global-setup.ts'],
            // One SQLite file, so one test file at a time
            fileParallelism: false,
            env: {
              DATABASE_URL: 'file:./node_modules/.tmp/api-test.db',
              HABITS_PASSWORD: 'test-password'
            }
          }
        }
      ]
    }
  })
)
