// Prisma 7 no longer reads .env by itself. In the container DATABASE_URL comes from the environment.
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Demo data for development: npm run db:seed (or db:reset). Never run in the container.
    seed: 'tsx prisma/seed.ts'
  },
  // Not env('DATABASE_URL'): that throws when it's unset, which breaks `prisma generate` in the
  // image build, where no database exists. Only migrate needs the URL.
  datasource: { url: process.env.DATABASE_URL ?? '' }
})
