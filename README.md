# Church Game Night

A local-network / projector-friendly game night app. Right now it ships with a fully working, bilingual (English/Arabic, RTL-aware) **Family Feud** game; **The Chaser** and **Never Have I Ever** are placeholder screens behind the same sign-in, ready to be built out later.

Stack: Vite + React + TypeScript + React Router, [Convex](https://www.convex.dev/) for the database + auth (accounts, sign in/up, saved games), deployed on Vercel.

## How it works

- The **main menu** (`/`) shows three game cards. Family Feud is fully playable; The Chaser and Never Have I Ever are stub pages ("coming soon").
- All three games require an account. Signing up/in is email + password, powered by Convex Auth.
- Once signed in, **Family Feud** takes you to a lobby of *your* saved games. Each saved game is its own independent set of rounds (questions + answers) — you can have as many as you want (e.g. "Youth Retreat 2026", "Christmas Party").
- The first time you sign in with no saved games yet, we auto-create one for you — **"Sample Church Feud"** — seeded from the 10 example rounds that were originally hardcoded (`src/data/rounds.json`). From there you can create more games from scratch via **+ Create / Manage Rounds** inside a game.
- Everything (accounts, saved games, rounds) is stored in Convex, so it's available from any browser/device once you're signed in — not just the machine you created it on.

## One-time setup

```bash
npm install
npx convex dev
```

`npx convex dev` will:

1. Open your browser to log in / create a free Convex account and link this project to a new Convex deployment.
2. Generate `convex/_generated/` (typed client code — required for the app to compile; it's gitignored).
3. Push the schema and functions in `convex/` to your dev deployment.
4. Write `VITE_CONVEX_URL` (and `CONVEX_DEPLOYMENT`) into a local `.env.local` file for you.

Leave that command running in a terminal (it watches `convex/` for changes and keeps syncing). In a second terminal:

```bash
npm run dev
```

Open the printed local URL, go fullscreen, and project the tab.

## Deploying to Vercel

1. Push this repo to GitHub (or your Git host of choice) and import it into Vercel.
2. In the Convex dashboard, go to **Settings → Deploy Keys** on your project and generate a **Production** deploy key.
3. In Vercel's project settings → Environment Variables, add:
   - `CONVEX_DEPLOY_KEY` — the key from step 2.
4. In Vercel's project settings → Build & Development Settings, set the **Build Command** to:
   ```bash
   npx convex deploy --cmd 'npm run build'
   ```
   This pushes your `convex/` schema/functions to your **production** Convex deployment and injects the resulting `VITE_CONVEX_URL` into the frontend build automatically — you don't need to set `VITE_CONVEX_URL` manually in Vercel.
5. Deploy. Every push will redeploy both your Convex backend and the frontend together.

## Playing the game

- The board shows the current round's answers, hidden and ranked 1..N by popularity (rank 1 = most people gave that answer).
- Click a hidden slot to **reveal** it — it flips open, plays a "ding", and its point value is added to the round's **pot**.
- Click **Wrong / Strike** for an incorrect guess — flashes a big red X and adds a strike (max 3).
- Click **Give to Team A** / **Give to Team B** to move the pot to that team's score and reset the pot/strikes.
- **Next / Prev** or the round dropdown move between rounds. **Reset Round** re-hides the board without touching scores; **Reset Game** zeroes both team scores. (Team scores are per-session/local to your browser tab — they aren't saved to Convex, only the rounds/questions are.)
- Click a team's name to rename it inline.
- **Language** swaps which language is the primary (larger) line on the board; the other language shows underneath as a subtitle. Arabic renders right-to-left.
- 🔊/🔇 mutes all sound. All sound effects are synthesized with the Web Audio API — no audio files needed.

### Keyboard shortcuts (while playing)

| Key | Action |
| --- | --- |
| `1`–`8` | Reveal the answer at that rank on the board |
| `X` | Strike |
| `A` / `B` | Award the current pot to Team A / Team B |
| `←` / `→` | Previous / next round |
| `R` | Reset current round |
| `M` | Toggle mute |

Shortcuts are disabled while typing in a text field/dropdown or while the round manager modal is open.

## Creating and managing rounds

Open a saved game, then click **"+ Create / Manage Rounds"** in the host controls. From there you can:

- Fill in a question (English and/or Arabic), add as many answers as you need, and set each answer's count — then **Save Round**. It's added to the current game immediately and synced to Convex.
- See and **delete** any round in the current game from the same panel.

`src/data/rounds.json` is only used once, as the seed content for the automatically-created "Sample Church Feud" game the first time a new account signs in — it is **not** read again after that. If you want to change what a brand-new account starts with, edit that file before your church's first sign-up.

## Project structure

- `convex/schema.ts` — database schema: `games` table (owner, name, rounds), plus Convex Auth's built-in user/session tables.
- `convex/auth.ts`, `convex/auth.config.ts`, `convex/http.ts` — Convex Auth wiring (email/password provider).
- `convex/games.ts` — server functions: list/get/create/rename/delete a game, add/remove a round, and `ensureSeeded` (creates the first sample game for a new account).
- `src/pages/` — `MainMenu`, `AuthPage` (sign in/up), `FamilyFeudLobby` (saved games list), `FamilyFeudPlay` (the actual board/host-controls game), `GameStub` (placeholder for The Chaser / Never Have I Ever).
- `src/components/RequireAuth.tsx` — route guard; redirects to `/sign-in` if you're not authenticated, then bounces back after signing in.
- `src/hooks/useGameState.ts` — single source of truth for *live play* state (current round, revealed answers, strikes, pot, team scores, language, mute) for one game session. Rounds themselves come from Convex as a prop, so this hook doesn't own round data — a natural seam for adding a Fast Money round or buzz-in screen later.
- `src/components/` — `Board`, `AnswerSlot`, `Scoreboard`, `Strikes`, `Pot`, `HostControls`, `RoundManager`, `LocalizedText`.
- `src/audio/sounds.ts` — Web Audio–generated "ding", buzzer, and award jingle (no audio assets).
- `src/index.css` — all styling (Tailwind v4 + custom Family Feud–style theme, plus menu/auth/lobby pages).

## Analytics (Phase A)

Lightweight, privacy-conscious event logging for game-night data. Originally
scoped to the single-host flow only; Double or Nothing (below) added the
first live multiplayer room/QR-join/player layer, and its events reuse the
same `logEvent`/`logClientEvent` helper — see "Analytics" under Double or
Nothing for what's added.

**What's collected**
- Host account events: `host_signed_up`, `host_signed_in`.
- Game/question CRUD: `game_created`, `game_renamed`, `game_deleted`,
  `round_added/updated/removed`, `chaser_created/renamed/deleted`,
  `question_added/updated/removed`, `questions_imported`.
- `game_play_started` — fired once when a saved game's play screen loads,
  tagged with `gameId` and `gameType`.

Every event is one row in the `events` table (`convex/schema.ts`):
`eventType`, `userId` (the host, if signed in), `occurredAt`, and a small
JSON `payload`. All events are written through the single helper
`logEvent` in `convex/analytics.ts` — nothing inserts into `events`
directly anywhere else in the codebase. Writes are scheduled
(`ctx.scheduler.runAfter(0, ...)`) and wrapped in try/catch, so a failed
analytics write can never fail or slow down the mutation that triggered
it.

**What's deliberately NOT collected**
- No player data of any kind — there are no players, rooms, or sessions
  in this app yet, so no device tokens, nicknames, disconnect events, or
  answer data exist to collect.
- No host email in any event payload — only the Convex `userId`.
- No IP addresses, user agents, or device fingerprints.
- No third-party analytics SDKs.

**Device tokens**: not applicable yet — there's no anonymous-player join
flow in this codebase. When the multiplayer/QR-join layer is built, add a
random UUID stored in player-side `localStorage`, never derived from IP/
UA/fingerprint, per the identity model in the original project brief.

**Named queries**: `analytics/queries.sql` documents one question per
block with the real Convex implementation in
`convex/analyticsQueries.ts` (Convex has no SQL engine — the `.sql` file
is illustrative reference, not executable).

**Purge / retention**: `convex/analytics.ts` exports `purgeOldEvents`
(an `internalMutation`), deleting `events` rows older than
`olderThanDays` (default 90) in batches of 200, rescheduling itself until
the backlog clears. `convex/crons.ts` runs it automatically every 24
hours. To purge with a different window manually:

```bash
npx convex run analytics:purgeOldEvents '{"olderThanDays": 30}'
```

Nothing else depends on raw event rows staying around — the reporting
queries in `convex/analyticsQueries.ts` re-derive their numbers from
whatever's left, so purging is always safe.

## Double or Nothing (ضاعف أو اخسر)

The first live multiplayer game: a host projects one screen, players join
on their own phones by scanning a QR code (no account, no app install).
Everyone starts with the same chip stack; each round they secretly wager
part of it on a multiple-choice question after seeing only its category
and difficulty, then answer to double or lose the wager.

### Rules

- **Round loop**: Preview (category + difficulty only) → Wager (secret,
  capped at current stack, timer-bound) → Lock → Question (multiple
  choice) → Resolve (server-computed) → Reveal ("the wall": a ranked,
  animated bar chart of every stack).
- A player who doesn't wager in time bets 0. A player who doesn't answer
  in time is scored wrong on whatever they wagered.
- **Bust rule** (host picks one at game start): **Mercy** (default —
  a 0-or-below stack is topped up to a configurable stipend each round
  so no one just sits out) or **Eliminated** (a 0-or-below player is out
  for the rest of the game).
- **SURE** (off by default): a player may flag their wager for a 1.5x
  multiplier on both the win and the loss.
- **Late joiners**: start at the current average stack across active
  players (configurable), not the original starting amount.
- **Disconnects**: identity is a device token in the player's
  `localStorage`, not a live connection — a dropped phone keeps its
  stack and simply resumes on reload/reconnect. Camp wifi dropping never
  costs anyone their chips.
- **Ties** at the end share a rank rather than being broken arbitrarily.
- All chip math (wager validation, correct/wrong resolution, bust
  handling) happens server-side in `convex/dblOrNothingSession.ts` —
  the client only ever sends a wager amount or an answer choice, never a
  resulting balance.

### Host configuration (set when starting a room)

| Setting | Default |
| --- | --- |
| Starting chips | 1000 |
| Rounds | 6 |
| Wager timer | 20s |
| Answer timer | 20s |
| Bust rule | Mercy (stipend: 100/round) |
| SURE | Off |
| Late joiners start at average stack | On |
| Final round announced as uncapped | Off |

### Adding questions to a pack

Open **Double or Nothing** from the main menu → pick or create a pack →
**Edit** → fill in category, difficulty (easy/medium/hard — required,
since players bet on it before seeing the question), question text,
2–6 options, and mark the correct one. Everything supports English and/or
Arabic independently, same as Family Feud/Chaser content.

`src/data/dblOrNothingQuestions.json` seeds a brand-new account with a
**placeholder** 30-question pack (mixed categories, some Egypt-local —
prices, geography, music) — replace it before a real event; it's only
used once, the first time an account has no packs yet.

### How the live room works

- `convex/rooms.ts` / `convex/players.ts` — a room has a short join code
  (QR-encoded); a player's identity is `{ deviceToken, secret }` kept in
  `localStorage` (`src/utils/deviceToken.ts`, `src/utils/playerSession.ts`).
  `secret` (not the player's `_id`, which the whole room can see via the
  roster) is what proves ownership when submitting a wager/answer or
  reading your own hidden round state — see `verifyPlayerSecret`.
- Host and player screens are both just Convex `useQuery` subscriptions
  against the same session/room documents — Convex's reactivity is the
  "sync," no custom websocket layer was built.
- Phase timers (wager lock, answer lock) are driven by
  `ctx.scheduler`, not the host's browser, so they're correct even if the
  host's tab closes mid-round.

### Analytics

Reuses the existing `logEvent`/`logClientEvent` helper and event list in
`convex/analytics.ts` — no new tracking path was added. New event types:
`dbl_or_nothing_pack_created`, `game_started`, `round_preview_shown`,
`wager_locked`, `answer_submitted`, `round_resolved`, `game_ended`.
`wager_locked` and `round_resolved` record the wager as a **percentage of
the player's stack at the time**, not just the raw chip amount, plus
whether SURE was used — that's what tells you whether a difficulty tag is
calibrated (are players betting big on Easy, small on Hard?).

## Admin dashboard (Phase B)

A private dashboard at `/admin` for game-night data analysis. Not linked
from anywhere in the UI — you have to know the URL, and even then it's
useless without admin access.

**Access model**
- Admin status is a row in a dedicated `admins` table (`{ userId }`), not
  a flag on the `users` table itself — there's no field a client could
  ever request/patch to escalate their own account, since the auth
  library owns the `users` schema.
- The **only** way in is the CLI: `npx convex run admin:grantAdmin
  '{"email":"you@example.com"}'` (the account must already exist — sign
  up normally first, or see "Creating an account without the sign-up
  form" below). There is no signup flow, button, or API path that grants
  it.
- Every dashboard query (`convex/adminDashboard.ts`) independently
  re-derives admin status server-side via `requireAdmin` in every single
  call — the client-side `RequireAdmin` route guard is UX only. A
  non-admin hitting `/admin` directly, or calling one of these functions
  directly, gets the same "Not authorized" error and zero data either
  way, signed in or not.
- Every time the dashboard is opened by an admin, `admin:logAccess`
  records `{ userId, occurredAt }` in `adminAuditLog` (`convex/admin.ts`
  → `listAuditLog` to read it back). IP isn't recorded — Convex
  queries/mutations don't have access to the caller's network request
  (only an HTTP action would), and admin sign-in goes through the same
  in-app session as every other host. Login attempts are already
  rate-limited for all accounts via `convex/rateLimit.ts`, admin
  included — there's no separate admin login to protect.

**Creating an account without the sign-up form**: `npx convex run
adminAccounts:createHostAdminAccount
'{"email":"you@example.com","password":"..."}'` creates the account
directly (bypassing the UI) and grants it admin in one step. Useful for
scripting/setup; the person should still change the password afterward
via the normal "Forgot password?" flow.

**Privacy boundary**: every screen below shows aggregates only — no
screen lists or searches individual players, no screen displays a
device token or player nickname tied to identity beyond what's already
public in a room's own roster while that room is live. Player-level data
never leaves a single session's own results.

**Screens** (`src/pages/AdminDashboard.tsx`, all driven by
`convex/adminDashboard.ts` — nothing is inlined/computed in the
component):
1. **Overview** — unique devices, total joins, sessions run, plays by
   game type, for today/7d/30d/all-time, plus a sessions-per-week trend.
2. **Popularity** — which games, which Double or Nothing packs, and
   which categories actually get chosen and played, ranked.
3. **Time Patterns** — activity by hour-of-day and day-of-week, so you
   can see when game nights actually happen.
4. **Question Health** — every Double or Nothing question, sortable by
   "most broken first": times asked, correct %, skip %, average wager %,
   and a flag when the actual correct-rate disagrees with its difficulty
   tag (e.g. an "easy" question under ~65% correct, or a "hard" one
   over ~40%).
5. **Sessions** — the 50 most recent Double or Nothing rooms: host,
   pack, player count, current round/phase, start/end time.
6. **Hosts** — sessions run per host, first/last session, and whether
   they ran a second one within 30 days of their first.

**A design note on data durability**: the `events` table (used for
Overview/Popularity's `game_play_started` counts) is purged after 90
days by design (see Analytics section above). Everywhere the same fact
is already captured permanently — `dblOrNothingSessions`,
`dblOrNothingPlayerState`, `dblOrNothingPlayerRounds`, `players`,
`rooms` — these dashboard queries read from *that* instead, so Sessions,
Question Health, and Hosts don't silently lose history past the purge
window the way a pure event-log query would.

## Adding The Chaser / Never Have I Ever for real

Both currently render `<GameStub title="..." />` behind `RequireAuth` in `src/App.tsx`. To build one out: add its own Convex tables/functions (mirroring the `games` table pattern in `convex/games.ts` if it needs saved content), and swap its route's `element` from `GameStub` to a real page component.


