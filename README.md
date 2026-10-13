# habit-tracker

Keep count of your habits, good and bad. Tap + every time you do something; the app works out your
streaks, a year at a glance, and when and on which days you tend to do it.

Live at https://habits.sundbergsolutions.se.

## Stack

- **Client:** Vue 3.5 (`<script setup>`, `defineModel`, `useTemplateRef`), Pinia, Vue Router,
  VueUse, Tailwind CSS 4, Lucide icons, Vite
- **Server:** Express 5, zod, Prisma 7 on SQLite (better-sqlite3 adapter)
- **Tests:** Vitest, with Vue Test Utils for the UI and supertest for the API

The charts and the heatmap are plain HTML and CSS, so they follow the theme, animate with CSS
transitions and can be tested in jsdom.

## Project setup

Needs Node 24 or later.

```sh
npm install
cp .env.example .env          # then set HABITS_PASSWORD to anything
npx prisma migrate deploy     # creates prisma/dev.db
npx prisma generate
npm run db:seed               # optional: five demo habits with a year of history
```

### Develop

Run the API and the Vite dev server side by side. Vite proxies `/api` to the API on port 3100.

```sh
npm run dev:server
npm run dev
```

Log in with the `HABITS_PASSWORD` from `.env`. It is a single shared password, kept until the app
has real accounts (`server/auth.ts`, `src/auth.ts`).

`npm run db:reset` wipes `prisma/dev.db`, re-applies every migration and seeds it again.

### Test

```sh
npm test              # everything, once
npm run test:watch    # while working
```

- `server/app.test.ts` drives the real Express app against a throwaway SQLite database, built by
  the same migrations production runs.
- `src/**/*.test.ts` covers the stats maths, the stores, the API client and the components.

Tests run in UTC (`vitest.config.ts`), so date maths gives the same answers on every machine.

### Change the database schema

Edit `prisma/schema.prisma`, then:

```sh
npx prisma migrate dev --name <what-changed>
npx prisma generate    # Prisma 7's migrate dev no longer does this for you
```

Commit the new folder under `prisma/migrations/`. The container applies pending migrations with
`prisma migrate deploy` every time it starts.

### Build, lint

```sh
npm run build         # type-checks everything, builds dist/ (client) and dist-server/ (server)
npm run lint
```

`npm start` serves the API and the built client together on one port.

## API

Every request needs the `X-Password` header. Bodies are JSON; dates are ISO 8601.

| | | |
|---|---|---|
| `GET` | `/api/auth` | 204 when the password is right |
| `GET` | `/api/habits` | every habit with its entries, oldest first |
| `GET` | `/api/habits/:id` | one habit |
| `POST` | `/api/habits` | `{ title, description?, emoji?, color? }` → 201 |
| `PATCH` | `/api/habits/:id` | any of those fields |
| `DELETE` | `/api/habits/:id` | the habit and its entries → 204 |
| `POST` | `/api/habits/:id/tracks` | log an entry now, or `{ date }` in the past → 201 |
| `DELETE` | `/api/tracks/:id` | remove one entry → 204 |

Invalid input gets a 400 with `issues: [{ path, message }]`.

## Docker

```sh
HABITS_PASSWORD=… docker compose up --build
```

Serves the app on http://127.0.0.1:8087. The SQLite database lives in the `habits_data` volume at
`/data/habits.db`.

## Deploy

`.github/workflows/ci.yml` lints, type-checks, builds and tests every pull request and every push.
A push to `master` that passes deploys to the shared EC2 box. The box keeps `HABITS_PASSWORD` in
`/opt/habit-tracker/.env`.
