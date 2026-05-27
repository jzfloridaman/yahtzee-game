# TODO

Active engineering roadmaps:
- [`docs/refactor-plan.md`](./docs/refactor-plan.md) — Player controller refactor → sync hardening → computer-player mode. **Shipped** (P1–P4).
- [`docs/puzzle-mode-next.md`](./docs/puzzle-mode-next.md) — Menu of candidate next phases for Puzzle Mode. **Option B (animations + sound) shipped** in phase 7. Remaining: A (smarter AI), C (looping categories + daily), D (online puzzle).

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

- [ ] Stats tracking: high score, games played, total time played, wins / losses (per device, persist to `localStorage`). (Puzzle Adventure already tracks best score + stars per level under `puzzleAdventureProgress`.)
- [ ] Multi-player Puzzle Mode (4 humans on the same modifier board, pass-the-device) — currently Puzzle is single-player or vs-AI (1 local + 1 ai). The per-player-engine machinery exists; just need the menu surface.
- [ ] Rebrand: pick a non-"Yahtzee" name and update artwork / icons / splash. (`capacitor.config.ts` `appName` is currently `Color Yahtzee`.)
- [ ] PWA polish: refresh icons / splash screens / logos once the rebrand lands.

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

## Obsolete (removed from old list)

- ~~"add socket.io for online multiplayer"~~ — superseded by PeerJS / WebRTC.
- ~~"abstract audio / music / sfx functionality"~~ — done in `App.vue` + `gameStore.playSoundEffect` injection.
- ~~"abstract animations"~~ — done in `src/utils/animations.ts`.
- ~~"create score card templates (rainbow, regular, etc)"~~ — done as part of the Puzzle Mode work: `RAINBOW_TEMPLATE` + `PUZZLE_TEMPLATE` in `src/config/scorecardTemplates.ts`, consumed by `ScoreManager.initializeScorecard(template)`.
