# habit-tracker

Keep count of your habits, good and bad. Tap + every time you do something; the app works out your
streaks, a year at a glance, and when and on which days you tend to do it. Everyone gets their own
account.

AI agents get a diary too: connected over [MCP](#agents), Claude Code and friends report good
times, annoying times, the times you were annoying, and anything else, and the Agents page charts
it all over time.

Live at https://habits.sundbergsolutions.se.

## Stack

- **Client:** Vue 3.5 (`<script setup>`, `defineModel`, `useTemplateRef`), Pinia, Vue Router,
  VueUse, Tailwind CSS 4, Lucide icons, Vite
- **Server:** Express 5, zod, Prisma 7 on SQLite (better-sqlite3 adapter); accounts with
  Argon2id passwords and cookie sessions, no auth library (see [Accounts](#accounts)); an MCP
  server for agents on the MCP TypeScript SDK v2 (see [Agents](#agents))
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
npm run db:seed               # optional: a "demo" account (password habits-demo) with a year of history,
                              # for its habits and its agents' moments
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
  habits and entries, agent keys and moments. `server/mcp.test.ts` connects the official MCP
  client to `/mcp` over HTTP, in both protocol eras.
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

## Agents

`/mcp` is an [MCP](https://modelcontextprotocol.io) server (Streamable HTTP, stateless) where AI
agents report **moments**: how their work with you is going. A moment has a kind, a note of up to
280 characters, and optionally the project and the agent it came from. The kinds:

| Kind | |
|---|---|
| `good` | 😊 something went well |
| `annoying` | 😤 the work itself fought back |
| `user_annoying` | 🙄 you made it harder than it needed to be |
| `other` | 💬 anything else worth remembering |

The tools are `report_moment`, `moment_stats` (counts per kind over N days against the N days
before) and `recent_moments`. The server's instructions tell a connecting agent when to report;
the [report-moments skill](skills/report-moments/SKILL.md) goes into more detail (how often, what
makes a good note, what never goes in one).

The Agents page shows the moments of the last 7 days, 30 days, 12 weeks or year: totals against the
period before, the share of good times, columns per day, week or month, the time of day and weekday
it gets rough, the busiest projects and agents, and every note.

### Connecting Claude Code

Agents authenticate with a key, made in **Settings → Agents** and sent as
`Authorization: Bearer hab_…`. A key is 256 random bits; like sessions, only its SHA-256 is stored.
Each key may report 60 moments an hour. Settings shows both commands with the address and key
filled in:

```sh
claude mcp add --transport http --scope user habits https://habits.sundbergsolutions.se/mcp \
  --header "Authorization: Bearer hab_…"

mkdir -p ~/.claude/skills/report-moments
curl -fsSL https://habits.sundbergsolutions.se/skills/report-moments/SKILL.md \
  -o ~/.claude/skills/report-moments/SKILL.md
```

Requests to `/mcp` that carry an `Origin` (that is, come from a web page) must come from this site,
as the MCP spec advises against DNS rebinding. `/.well-known/*` answers 404, so clients don't go
looking for an OAuth login.

### Logging habits from scripts and hooks

The same key logs habit entries, for anything that can make an HTTP request: a hook, a cron job, a
phone shortcut. The habit is found by name, ignoring case, and created with its first entry; `emoji`
and `color` are only used then. `date` backdates the entry. Each key may log 60 entries an hour.

```sh
curl https://habits.sundbergsolutions.se/api/track \
  -H "Authorization: Bearer $HABITS_KEY" -H "Content-Type: application/json" \
  -d '{ "habit": "Run", "emoji": "🏃" }'
```

This repo tracks the work on itself that way. Its Claude Code hook
([`.claude/hooks/track-work.mjs`](.claude/hooks/track-work.mjs), set up in
[`.claude/settings.json`](.claude/settings.json)) logs an entry for "Work on habit-tracker" each
time a session starts or resumes here. It does nothing until `HABITS_KEY` is set, for example in
`.claude/settings.local.json` (git-ignored), or in `~/.claude/settings.json` to have it everywhere:

```json
{ "env": { "HABITS_KEY": "hab_…" } }
```

`HABITS_URL` points it at another server, such as `http://localhost:3100` in development, and
`HABITS_HABIT` logs a different habit. Copied into `~/.claude/settings.json`, with the script
somewhere stable, the hook tracks every project as its own habit.

## API

Bodies are JSON; dates are ISO 8601. Everything except `/api/auth/*` and `/api/track` needs a
session, and every request other than `GET` needs a same-site `Origin`.

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
| `POST` | `/api/track` | with a key, not a session: `{ habit, date?, emoji?, color? }` → 201 `{ habit, track, created }` |
| `GET` | `/api/moments` | every moment agents reported, oldest first |
| `DELETE` | `/api/moments/:id` | remove one → 204 |
| `GET` | `/api/tokens` | the agent keys, without the secrets |
| `POST` | `/api/tokens` | `{ name }` → 201, with the `token`, which is never shown again |
| `DELETE` | `/api/tokens/:id` | revoke a key → 204 |

Invalid input gets a 400 with `issues: [{ path, message }]`.

## Docker

```sh
HABITS_PASSWORD=… docker compose up --build
```

Serves the app on http://127.0.0.1:8087. The SQLite database lives in the `habits_data` volume at
`/data/habits.db`.

## Deploy

`.github/workflows/ci.yml` lints, type-checks, builds and tests every pull request and every push.
A push to `master` that passes deploys to the shared EC2 box, where `/opt/habit-tracker/.env` can
set `SIGNUP` (and, until the owner has logged in once, `HABITS_PASSWORD`).
