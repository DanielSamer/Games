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

## Adding The Chaser / Never Have I Ever for real

Both currently render `<GameStub title="..." />` behind `RequireAuth` in `src/App.tsx`. To build one out: add its own Convex tables/functions (mirroring the `games` table pattern in `convex/games.ts` if it needs saved content), and swap its route's `element` from `GameStub` to a real page component.

