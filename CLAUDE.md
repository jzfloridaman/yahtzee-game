# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Rainbow Yahtzee — a Vue 3 + TypeScript dice game with classic Yahtzee rules plus color-based scoring (Color Full House, Color Yahtzee for Reds/Greens/Blues). Supports single player, local multiplayer, and online multiplayer (host/client over WebRTC via PeerJS). Wrapped with Capacitor for Android/iOS native builds. Also a PWA (`public/manifest.json` + `public/service-worker.js`).

The actual project lives in `yahtzee-game/` (the repo root contains only that one subdirectory). Run all commands from there.

## Commands

```bash
npm run dev        # Vite dev server (vite.config.ts: port 3000, open: true)
npm run build      # Production build → dist/
npm run preview    # Preview built bundle
npm run android    # build + cap sync + open Android Studio
npm run ios        # build + cap sync + open Xcode
npm test           # Jest test suite (ts-jest, node env)
npx jest path/to/file.test.ts                # Run a single test file
npx jest -t "should calculate score"         # Run tests matching a name
```

### Docker dev environment

This project plugs into the shared infra at `~/projects/infra/` (Caddy reverse proxy + `dev-network`).

```bash
docker compose up -d        # Starts yahtzee-game-web (node:20-alpine, npm install + vite)
docker compose logs -f web  # Tail Vite logs
docker compose down
```

- Direct: http://localhost:5173
- Via shared Caddy: http://yahtzee.localhost:8080 (route in `~/projects/infra/docker/proxy/Caddyfile`)
- Compose overrides `vite.config.ts` `port: 3000` via CLI args (`--host 0.0.0.0 --port 5173`). The `open: true` in vite.config produces a harmless `xdg-open ENOENT` log in the container — ignore.

First-time Capacitor setup (per README): `npm i @capacitor/android @capacitor/ios`, `brew install cocoapods`, then `npx cap add android` / `npx cap add ios`.

Legacy scripts: `build:ts` / `build:css` / `old-build` / `old-dev` predate the Vite migration — don't use.

## Architecture

### Layers

```
Vue components (src/components/, src/App.vue)
     ↓ calls actions on
Pinia stores
    ├── gameStore (src/stores/gameStore.ts) ── owns ──> YahtzeeGame (src/game.ts)
    │                                                          ↓
    │                                              DiceManager + Player[] (each has a ScoreManager)
    │                                                          ↓
    │                                              Strategy pattern (src/strategies/*)
    └── peerStore (src/stores/peerStore.ts) ── WebRTC P2P via peerjs
```

- **`YahtzeeGame`** (`src/game.ts`) is the engine. It holds `rollsLeft`, `currentPlayer` (index), `state` (a `GameState` enum with subscriber callbacks via `onStateChange`), and a `Player[]` array — one entry per seat. `nextPlayer()` rotates the index after each category selection.
- **`Player`** (`src/models/Player.ts`) is the per-seat model. Holds the player's `name`, `isAI: boolean` (scaffolded for a not-yet-implemented computer player), and its own `ScoreManager`. The `Player` class also exposes proxy methods (`calculateScore`, `getTotalScore`, `selectCategory`, etc.) that forward to its `ScoreManager`.
- **`DiceManager`** (`src/managers/DiceManager.ts`) owns the 5 shared dice. Each `Die` has a numeric `value` and a `color` ('red' | 'green' | 'blue' | 'blank'). Held dice survive `rollDice()`; `resetDice()` returns dice to `'blank'` between turns.
- **`ScoreManager`** (`src/managers/ScoreManager.ts`) owns one player's scorecard: a map keyed by `Categories` enum, each entry `{ value, selected, group }`. The upper-section bonus (+35 when Ones–Sixes ≥ 63) is auto-applied inside `updateScorecard` / `isUpperSectionBonusAchieved`.
- **Scoring strategies** (`src/strategies/`) implement `ScoringStrategy.calculateScore(dice)`. The dispatcher is `useCalculateScore` in `src/utils/CalculateScore.ts` — a switch over `Categories` that instantiates the right strategy. **To add a new scoring category**: add the enum value in `src/enums/Categories.ts`, create a strategy class, wire it into the switch in `CalculateScore.ts`, and add an entry in `ScoreManager.initializeScorecard()`.
- **`gameStore`** (`src/stores/gameStore.ts`) is the Pinia bridge. It also persists `gameHistory` (last 10 games) and audio prefs to `localStorage`. Sound playback is injected from `App.vue` into `gameStore.playSoundEffect` because `Audio` construction needs the DOM.
- **`peerStore`** (`src/stores/peerStore.ts`) wraps PeerJS: room code creation, connection lifecycle, send/receive of JSON messages.

### Game modes (`src/enums/GameMode.ts`)

- `SinglePlayer` = 1 (one local player)
- `MultiPlayer` = 2 (N local players, pass-the-device)
- `OnlineMultiPlayer` = 3 (host + 1 client, WebRTC)

### Online multiplayer flow (host-authoritative)

Transport: PeerJS `DataConnection` (WebRTC datachannel, reliable in-order). Both sides exchange JSON messages — handled in `gameStore.handleIncomingData()`.

Message types currently in use:
- `versionCheck` — protocol/version match
- `gameStarted` / `gameOver` — lifecycle signals
- `gameState` — full snapshot push (host → client) containing dice, scorecards, currentPlayer, rollsLeft, newRoll
- `rollDice`, `holdDice`, `selectCategory` — actions (client requests; host applies and re-broadcasts `gameState`)
- `resyncRequest` — client asks host for a fresh `gameState` (also fired manually from the menu)
- `emoji`, `chatMessage` — chat/emote channel

**Important caveats** (these are real bugs to be aware of):
- `gameStore.ts:400` sends `score: 1000` as a hardcoded placeholder for the client's floating-score animation — the *real* score arrives in the subsequent `gameState`, but the animation number is wrong.
- `gameStore.ts:393–411` (`selectCategory`) and `gameStore.ts:165–197` (the `'selectCategory'` message case) are two divergent code paths that both write the same state — easy place for desync.
- `gameStore.ts:144` has `//this.sendGameState();` commented out after host-side hold processing — hold state syncs only at the next gameState broadcast.
- Resync is manual (button in App.vue). No automatic resync on reconnect, no ACK protocol.

### Color scoring twist

Beyond standard Yahtzee, each die has a color and three categories key off it:
- `Blues` / `Reds` / `Greens` — score when all 5 dice share that color (`ColorsStrategy`).
- `ColorFullHouse` — 3 of one color + 2 of another, numbers ignored (`ColorsFullHouseStrategy`).

### Capacitor / native / PWA

`capacitor.config.ts` sets `webDir: 'dist'` and `appId: com.yahtzeegame.app`. `main.ts` waits for `deviceready` before mounting Vue when running on a native platform (otherwise mounts immediately). `vite.config.ts` uses `base: './'` (relative paths) so the built bundle works inside the Capacitor WebView and as a PWA. The service worker is in `public/service-worker.js`.

## Known rough edges

- `Categories.TopBonus` is modeled as a scorecard entry rather than derived; `YahtzeeGame.isGameOver()` has a special case for "only TopBonus remains".
- `YahtzeeGame.isGameOver()` is a side-effecting "check" — it mutates the game-over flag as part of the check. Splitting into `checkGameOver()` (mutates) and an `isGameOver` getter would clean this up.
- The action-dispatch code (`rollDice`, `holdDice`, `selectCategory` in `gameStore.ts`) has three-way branches (`OnlineMultiPlayer && host`, `OnlineMultiPlayer && client`, local) that duplicate logic and drift independently. The cleaner pattern is a `PlayerController` per `Player` that produces actions, so the store has a single dispatch path — this refactor is planned.
- `todo.md` is partially obsolete (predates the online-multiplayer merge); items like "add socket.io for online multiplayer" are superseded by the PeerJS implementation.
