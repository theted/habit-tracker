# habit-tracker

Keep count of your habits, good and bad. Tap + every time you do something; the app works out your
streaks, a year at a glance, and when and on which days you tend to do it. Everyone gets their own
account.

Live at https://habits.sundbergsolutions.se.

## Stack

- **Client:** Vue 3.5 (`<script setup>`, `defineModel`, `useTemplateRef`), Pinia, Vue Router,
  VueUse, Tailwind CSS 4, Lucide icons, Vite
- **Server:** Express 5, zod, Prisma 7 on SQLite (better-sqlite3 adapter); accounts with
  Argon2id passwords and cookie sessions, no auth library (see [Accounts](#accounts))
- **Tests:** Vitest, with Vue Test Utils for the UI and supertest for the API

The charts and the heatmap are plain HTML and CSS, so they follow the theme, animate with CSS
transitions and can be tested in jsdom.

## Project setup

Needs Node 24 or later.

```sh
npm install
cp .env.example .env
npx prisma migrate deploy     # creates prisma/dev.db
npx prisma generate
npm run db:seed               # optional: a "demo" account (password habits-demo) with a year of history
```

### Develop

Run the API and the Vite dev server side by side. Vite proxies `/api` to the API on port 3100.

```sh
npm run dev:server
npm run dev
```

Create an account on the login page, or log in as `demo` after seeding.

`npm run db:reset` wipes `prisma/dev.db`, re-applies every migration and seeds it again.

### Test

```sh
npm test              # everything, once
npm run test:watch    # while working
```

- `server/*.test.ts` drive the real Express app against a throwaway SQLite database, built by the
  same migrations production runs: accounts, sessions, CSRF, rate limits, privacy between users,
  habits and entries.
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

## Accounts

Username and password, with the choices that current guidance (OWASP, NIST SP 800-63B) points to:

- **Passwords** are hashed with **Argon2id** (19 MiB, 2 passes), using Node's built-in
  `crypto.argon2`, and stored as PHC strings. Hashes made with weaker settings are upgraded at the
  next login. A password needs at least 8 characters and mustn't be on a short list of the most
  common ones; there are no rules about digits or symbols.
- **Sessions** are a random 256-bit token in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` over
  HTTPS). The database stores only the token's SHA-256, so a copy of it holds no usable sessions.
  A session lasts 30 days and renews itself while in use. Changing the password logs out every
  other device.
- **CSRF**: besides `SameSite`, every request that changes something must carry an `Origin`
  header from this site.
- **Guessing** is slowed by in-memory rate limits on logins (per account and per address),
  sign-ups and password checks. An unknown username takes as long to reject as a wrong password.
- **Headers**: a strict Content-Security-Policy (no inline scripts), `X-Frame-Options`,
  `nosniff`, and HSTS over HTTPS.

`SIGNUP=closed` turns off sign-up, leaving logins only.

There is no email, so a forgotten password is reset on the box:

```sh
docker compose exec app node dist-server/cli.js list-users
docker compose exec app node dist-server/cli.js set-password <username>
```

The user from before accounts existed (all habits created back then belong to it) becomes `owner`.
On the first start after the upgrade it gets the old shared `HABITS_PASSWORD` as its password
(`server/legacy.ts`); log in as `owner` with that, then rename the account and change the password
in Settings. After that, `HABITS_PASSWORD` can go from the environment.

## API

Bodies are JSON; dates are ISO 8601. Everything except `/api/auth/*` needs a session, and every
request other than `GET` needs a same-site `Origin`.

| | | |
|---|---|---|
| `GET` | `/api/auth/status` | `{ user, signupEnabled }`; `user` is null when logged out |
| `POST` | `/api/auth/register` | `{ username, password }` → 201, logged in |
| `POST` | `/api/auth/login` | `{ username, password }` → 200, logged in |
| `POST` | `/api/auth/logout` | → 204 |
| `PATCH` | `/api/account` | `{ currentPassword, username?, newPassword? }` |
| `DELETE` | `/api/account` | `{ password }`: the account and everything in it → 204 |
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

## Visit counter

Page views are counted by the visit counter the other sundbergsolutions.se sites use: a 1×1 image
from `visits.sundbergsolutions.se`, as site `habit-tracker`. It keeps daily totals and referring
hosts only, with no cookies and no IP addresses. `src/lib/visits.ts` requests the image on every
page the router lands on, since the Content-Security-Policy rules out the usual inline snippet; the
policy's `img-src` allows that one host. Only requests from the live site count, so local runs
don't.

## Deploy

`.github/workflows/ci.yml` lints, type-checks, builds and tests every pull request and every push.
A push to `master` that passes deploys to the shared EC2 box, where `/opt/habit-tracker/.env` can
set `SIGNUP` (and, until the owner has logged in once, `HABITS_PASSWORD`).
