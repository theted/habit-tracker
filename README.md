# habit-tracker

Simple Habit-tracking app. Keep statistics of your good (and bad!) habits!

Live at https://habits.sundbergsolutions.se.

## Features
- Typescript
- Vue 3
- Prisma (SQLite)
- Tailwind
- Vite
- Express

## Project Setup

Needs Node 24 or later.

```sh
npm install
cp .env.example .env          # then set HABITS_PASSWORD to anything
npx prisma migrate dev        # creates prisma/dev.db and generates the Prisma client
```

### Develop

Run the API and the Vite dev server side by side. Vite proxies `/api` to the API on port 3100.

```sh
npm run dev:server
npm run dev
```

Log in with the `HABITS_PASSWORD` from `.env`. It is a single shared password, kept until the app
has real accounts (`server/auth.ts`, `src/auth.ts`).

### Change the database schema

Edit `prisma/schema.prisma`, then:

```sh
npx prisma migrate dev --name <what-changed>
```

Commit the new folder under `prisma/migrations/`. The container applies pending migrations with
`prisma migrate deploy` every time it starts.

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

Builds the client into `dist/` and the server into `dist-server/`. `npm start` then serves both on
one port.

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Docker

```sh
HABITS_PASSWORD=… docker compose up --build
```

Serves the app on http://127.0.0.1:8087. The SQLite database lives in the `habits_data` volume at
`/data/habits.db`.

## Deploy

Every push to `master` deploys to the shared EC2 box through
`.github/workflows/deploy.yml`. The box keeps `HABITS_PASSWORD` in `/opt/habit-tracker/.env`.
