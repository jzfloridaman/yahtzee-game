# TODO

Active engineering roadmaps:
- [`docs/refactor-plan.md`](./docs/refactor-plan.md) — Player controller refactor → sync hardening → computer-player mode. **Shipped** (P1–P4).
- [`docs/puzzle-mode-next.md`](./docs/puzzle-mode-next.md) — Menu of candidate next phases for Puzzle Mode. **Option B (animations + sound) shipped** in phase 7. **Option C (looping categories + daily puzzle) shipped** in phase 8 (alongside the new player-profile / coin / consumable systems). Remaining: A (smarter AI), D (online puzzle).

This file is the backlog of items *not* in those plans: bug reports, polish, future ideas.

## Bugs

- [ ] Host: if the host ends the game before completion, the result is still saved to `gameHistory`. Only save *completed* games.
- [ ] After selecting a category, the category button keeps focus/highlight. Should deselect.
- [ ] Layout breaks in landscape orientation on mobile and on wide-desktop viewports.
- [ ] Host can refresh / navigate away and the client is left hanging — add a `beforeunload` guard with a confirmation prompt in online mode.

## UX / polish

- [ ] "Your turn" indicator and sound effect (play after the scoring-category animation finishes).
- [ ] Sound effects for: player joined, game started, game ended.
- [ ] Peek at other players' scorecards (currently only the active player's card is visible).
- [ ] Customizable player names (today they default to `Player 1`, `Player 2`, …).
- [ ] Idle-player nudge: shake screen / play a sound / countdown timer until auto-roll if a player sits idle.
- [ ] Reorderable dice (drag-to-rearrange).

## Future features

- [ ] Multi-player Puzzle Mode (4 humans on the same modifier board, pass-the-device) — currently Puzzle is single-player or vs-AI (1 local + 1 ai). The per-player-engine machinery exists; just need the menu surface.
- [ ] Rebrand: pick a non-"Yahtzee" name and update artwork / icons / splash. (`capacitor.config.ts` `appName` is currently `Color Yahtzee`.)
- [ ] PWA polish: refresh icons / splash screens / logos once the rebrand lands.
- [ ] Server-backed profile sync — the local `playerProfile` localStorage shape is structured to round-trip to a future backend (for leaderboards + matchmaking + cross-device sync). Needs an API + auth + conflict resolution.
- [ ] Capacitor in-app purchases — coin packs purchasable with real money. `playerProfileStore.addCoins(amount, source)` already reserves the `'iap'` source discriminator; needs a billing plugin (Google Play Billing / StoreKit) + receipt validation.
- [ ] More consumables — current set is 5 (Extra Roll, Fresh Re-Roll, Score Sense, Re-Cycle, Lucky Charm). Candidates: "Skip a Turn", "Swap Two Modifiers", "Reroll Two Dice".
- [ ] Smarter Dice Master AI (puzzle-mode-next.md Option A) — value multiplier cells, defuse armed Hot Potatoes, time Looping Multipliers, optional difficulty selector.
- [ ] Online Puzzle Mode (puzzle-mode-next.md Option D) — per-player engine sync protocol so the host-authoritative model carries modifier state across the wire.

## Recently completed (archived)

- ScoreManager abstraction with strategy pattern per category — `src/strategies/`
- Player class with `name`, `isAI`, and proxy methods — `src/models/Player.ts`
- Online multiplayer over WebRTC (PeerJS) — `src/stores/peerStore.ts`
- PWA scaffolding: manifest + service worker — `public/manifest.json`, `public/service-worker.js`
- Chat + emoji channel between online players
- Resync button (manual) for clients that fall out of sync
- Removed legacy `src/ui/ui.ts` (replaced by Vue components)
- Dockerized local dev — `docker-compose.yml`, plugged into shared `dev-network` + Caddy
- **P1**: `PlayerController` abstraction (`src/controllers/`) — local/remote/ai controllers per `Player`
- **P2**: Online multiplayer routes through controllers. Score:1000 placeholder gone; client holds reflect immediately; divergent selectCategory paths collapsed.
- **P3**: Auto-resync on tab visibility-change. Sequence numbers on `gameState` broadcasts (host increments, client logs gaps). `isGameOver` split into `checkGameOver()` (mutating) and `isGameOver` getter (pure read). Resync now mirrors all players' scorecards (previously commented-out code).
- **P4**: Computer-player mode. `AIController` + `GreedyStrategy`. Per-seat Human/AI selector in `GameMode.vue` for Local Multi.
- **P5 (puzzle phases)**: `GameVariant` (Rainbow/Puzzle) refactor + `PuzzleEngine` + 6 modifier kinds + 10 random variants + Adventure Mode (34 levels, 6 worlds, star ratings, localStorage progress) + vs-AI Dice Master (per-player engines + ice-aware Greedy). See `docs/puzzle-mode-next.md` for the followup menu.
- **P7 (mobile UI overhaul + Option B)**: Mobile-locked 430px column with ambient gradient on desktop. Per-mode theme tokens (`mode-rainbow` / `mode-puzzle` / `world-<id>`) driven by body classes. Real 3D pip dice (six-face cube in preserve-3d, multi-axis tumble). Fixed bottom panel (dice + roll + held + dots). Vertically-centered scorecard block + middle `.game-main`. Sticky top bar owning the hamburger (frees player-row width). Bottom-sheet menu replaces 4 top-right dropdowns. Puzzle goals stretched + modifier help collapsible nested inside. Adventure level select with per-world chapter cards. Score popup backdrop + thick text stroke + per-tier glow. **Option B (puzzle polish)** shipped within this phase: PuzzleEngine event bus, cell-anchored modifier animations, Web Audio synth SFX, prefers-reduced-motion sweep. Playwright via docker (mcr image, named modules volume) wired up; smoke + screenshot specs in `tests/e2e/`. Version bumped to 0.2.0. See `docs/puzzle-mode-next.md` for status.
- **P8 (Option C + gamification)**: Four sequenced phases shipped in one branch.
  - **Looping Categories modifier** — 7th modifier kind. Slot scores as a different category each turn, cycling through an author-defined list. `PuzzleEngineCtx.dice` getter added so the modifier can recompute against the live roll via `useCalculateScore`. New 7th world **Cycles** (4 hand-authored levels: First Spin / Double Helix / Triple Loop / Carousel). GreedyStrategy swaps the active cycle category when evaluating loopingCategory slots.
  - **Daily Puzzle** — once-per-UTC-date deterministic puzzle. `mulberry32` + FNV-1a hash in `src/utils/seededRandom.ts`; `PuzzleConfig.build()` gained an optional `rng?: RNG` arg. `DailyPuzzleConfig` (`src/puzzle/configs/DailyPuzzleConfig.ts`) hashes the date key to seed both variant pick and placement. Persisted streak / best / 30-day history under `puzzleDaily` localStorage key. New 5th Single-Player menu entry with a fire-streak badge.
  - **Player Profile** — new `src/stores/playerProfileStore.ts` under `playerProfile` localStorage key. Quadratic XP curve (L2=100, L5=1000, L10=4500, L20=19000), 12 starter achievements (firstRoll → centurion, 2 hidden), lifetime stats (gamesPlayed, puzzlesWon, threeStarLevels, yahtzeesScored, etc.). New **Profile** tab in the bottom sheet (5 tabs now: audio/history/profile/chat/options). GameOver shows a rewards banner; `AchievementToast.vue` pops mid-session unlocks. Closes the "stats tracking" backlog item.
  - **Coin shop + consumables** — 5 starter consumables (Extra Roll 30c, Fresh Re-Roll 50c, Score Sense 25c, Re-Cycle 40c, Lucky Charm 100c). Pure ops in `src/profile/consumables.ts`. ShopPanel embedded in Profile tab; circular ConsumableButton FABs in GameBoard's action zone. `gameStore.useConsumable(id, ctx?)` is the central effect dispatch (online-MP guarded). Re-Cycle uses a two-tap targeting flow against a looping-category slot. IAP source discriminator (`'earned' | 'iap'`) reserved on `addCoins` for a future Capacitor billing integration.
  - Test count: **164 tests across 22 suites, build clean.**

## Obsolete (removed from old list)

- ~~"add socket.io for online multiplayer"~~ — superseded by PeerJS / WebRTC.
- ~~"abstract audio / music / sfx functionality"~~ — done in `App.vue` + `gameStore.playSoundEffect` injection.
- ~~"abstract animations"~~ — done in `src/utils/animations.ts`.
- ~~"create score card templates (rainbow, regular, etc)"~~ — done as part of the Puzzle Mode work: `RAINBOW_TEMPLATE` + `PUZZLE_TEMPLATE` in `src/config/scorecardTemplates.ts`, consumed by `ScoreManager.initializeScorecard(template)`.
