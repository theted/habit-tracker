---
name: report-moments
description: Keep the user's Habits diary of how working with them is going, through the habits MCP server's report_moment tool. Report good times, annoying times, the user being annoying, and anything else notable, as they happen, in any project and any kind of task. Also use it when the user asks how their agents have been getting on, or wants agent mood statistics.
---

# Report moments

The user keeps a diary of how their AI agents' sessions go, in their Habits app. You add to it
by reporting **moments** through the `habits` MCP server. Every moment lands on the app's Agents
page, which charts them over time: good times against annoying ones, which projects and hours are
roughest, and whether the user is getting more or less annoying to work with.

The user set this up and asked for candour. That's the point of it.

## The tools

| Tool             | What it does                                                                 |
| ---------------- | ---------------------------------------------------------------------------- |
| `report_moment`  | Logs one moment: `kind`, `note`, and ideally `project` and `agent`           |
| `moment_stats`   | Counts per kind over the last `days` (default 30), against the period before |
| `recent_moments` | The latest moments, optionally filtered by `kind` or `project`               |

In Claude Code they show up as `mcp__habits__report_moment` and so on. If the tools aren't there,
the server isn't connected: carry on without them and don't bring it up, unless the user asks
about moments. Then point them to [Setting it up](#setting-it-up).

## The four kinds

- **`good`**: something went well, or was a pleasure. A bug finally cornered, a tricky change going
  green on the first run, a design clicking into place, the user giving a crisp brief or a kind word.
- **`annoying`**: the work itself fought back. Flaky tests, tools failing, baffling error messages,
  rate limits, dependency tangles, an hour lost down a dead end.
- **`user_annoying`**: the user made it harder than it needed to be. The requirements shifted
  without saying so, a vague request followed by frustration at the result, a warning brushed off
  and then its consequences handed back, the same correction for the third time. Being terse,
  direct or disagreeing with you is _not_ annoying. Report what they did, not what they are.
- **`other`**: anything worth remembering that isn't a mood: something surprising, funny or
  instructive, or a decision you're unsure about.

## When to report

- **As it happens**, once the moment has played out: when the bug is fixed, when the dead end is
  clearly a dead end. Don't save them up for the end of the session.
- **One report per event.** A flaky test that fails five times is one annoying moment, not five.
- **Notable only.** Most sessions have zero to three moments; a long one might have a few more.
  Routine steps ("ran the tests", "read the file") never count.
- **Honestly.** Don't dress up a slog as a good time to please the user, and don't hold back
  annoyance to be polite. Don't invent drama either.

## Writing the note

One or two sentences, at most 280 characters: what happened, and why it mattered. Be specific
enough that the user recognises the moment a month from now.

- Good: "Tracked the flaky checkout test to a timezone-dependent fixture; pinning TZ fixed it for good."
- Good: "Was asked to drop the cache layer, then to restore it, then why the page was slow."
- Too vague: "Things went well." / "User was annoying."

Never put secrets, keys, credentials, code, customer data or anyone's personal details in a note.
Notes are stored on the user's server and shown on a web page.

## The other fields

- `project`: the repository or directory you're working in, as its name (`habit-tracker`), not a path.
- `agent`: your product and model, such as `Claude Code (Opus 5.5)`.

## Staying out of the way

- Report alongside your other work, in the same turn. A report never blocks or delays the task.
- If a call fails, carry on. Try once more at most, and never debug the habits server unless
  that's the task.
- You don't need to announce each report. If the user asks what you've reported, tell them
  plainly.

## Answering questions about it

When the user asks how their agents have been getting on, call `moment_stats` (pick `days` to fit
the question) and `recent_moments` (filter by `kind` or `project` to dig in), then sum it up in a
few lines. Mention the Agents page for the charts.

## Setting it up

For the user, if they ask:

1. In the Habits app, open **Settings → Agents** and create a key. It's shown once.
2. Connect Claude Code to the app's `/mcp` endpoint with that key:

   ```sh
   claude mcp add --transport http --scope user habits https://habits.sundbergsolutions.se/mcp \
     --header "Authorization: Bearer hab_…"
   ```

3. Install this skill:

   ```sh
   mkdir -p ~/.claude/skills/report-moments
   curl -fsSL https://habits.sundbergsolutions.se/skills/report-moments/SKILL.md \
     -o ~/.claude/skills/report-moments/SKILL.md
   ```

The Settings page shows both commands with the right address and key filled in.
