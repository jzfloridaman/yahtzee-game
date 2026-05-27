# TODO

The active engineering roadmap lives in [`docs/refactor-plan.md`](./docs/refactor-plan.md) — Player controller refactor → sync hardening → computer-player mode.

This file is the backlog of items *not* in that plan: bug reports, polish, future ideas.

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
- [ ] Debug heartbeat log for hosts (helpful while we work on sync).

## Future features

- [ ] Stats tracking: high score, games played, total time played, wins / losses (per device, persist to `localStorage`).
- [ ] Game-mode variants:
  - Single-player: Classic / Rainbow / Puzzle
  - Multi-player: Battle / Classic / Rainbow / Puzzle
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

## Obsolete (removed from old list)

- ~~"add socket.io for online multiplayer"~~ — superseded by PeerJS / WebRTC.
- ~~"abstract audio / music / sfx functionality"~~ — done in `App.vue` + `gameStore.playSoundEffect` injection.
- ~~"abstract animations"~~ — done in `src/utils/animations.ts`.
- ~~"create score card templates (rainbow, regular, etc)"~~ — covered by the strategy pattern; new variants are a future feature, not architecture work.
