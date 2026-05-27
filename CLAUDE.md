# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Rainbow Yahtzee — a Vue 3 + TypeScript dice game with classic Yahtzee rules plus color-based scoring (Color Full House, Color Yahtzee for Reds/Greens/Blues) AND a single-player Puzzle Mode with modifier-based gameplay (ice blocks, multipliers, hot potato, etc.) inspired by Dice World. Supports single player, local multiplayer, online multiplayer (host/client over WebRTC via PeerJS), and a vs-AI "Dice Master" variant for puzzle mode. Wrapped with Capacitor for Android/iOS native builds. Also a PWA (`public/manifest.json` + `public/service-worker.js`).

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
    │                                                          +
    │                                              puzzleEngines: PuzzleEngine[] (per-player; Puzzle variant only)
    │                                                          ↓
    │                                              modifiers (src/puzzle/modifiers/*)
    └── peerStore (src/stores/peerStore.ts) ── WebRTC P2P via peerjs
```

- **`YahtzeeGame`** (`src/game.ts`) is the engine. It holds `rollsLeft`, `currentPlayer` (index), `state` (a `GameState` enum with subscriber callbacks via `onStateChange`), a `Player[]` array — one entry per seat — and a `variant: GameVariant` (`Rainbow` | `Puzzle`). `nextPlayer()` rotates the index after each category selection.
- **`Player`** (`src/models/Player.ts`) is the per-seat model. Holds the player's `name`, `isAI: boolean`, a `controller: PlayerController` (`LocalHumanController` / `RemotePeerController` / `AIController`), and its own `ScoreManager`. The `Player` class also exposes proxy methods (`calculateScore`, `getTotalScore`, `selectCategory`, etc.) that forward to its `ScoreManager`.
- **`DiceManager`** (`src/managers/DiceManager.ts`) owns the 5 shared dice. Takes a `{ assignColor: boolean }` config — `true` in Rainbow (each die has a `color: 'red' | 'green' | 'blue' | 'blank'`), `false` in Puzzle (die `color` is undefined). Held dice survive `rollDice()`; `resetDice()` clears values between turns.
- **`ScoreManager`** (`src/managers/ScoreManager.ts`) owns one player's scorecard: a `Partial<Record<Categories, { value, selected, group }>>` initialized from a template. `RAINBOW_TEMPLATE` (17 categories) and `PUZZLE_TEMPLATE` (13 classic) live in `src/config/scorecardTemplates.ts`. Accessors guard missing keys so Puzzle scorecards don't crash on absent color slots. Upper-section bonus (+35 when Ones–Sixes ≥ 63) is auto-applied inside `getTotalScore` / `isUpperSectionBonusAchieved`. `addScoreToCategory(cat, delta)` exists for Double Category bonus turns (sums onto already-selected slot).
- **Scoring strategies** (`src/strategies/`) implement `ScoringStrategy.calculateScore(dice)`. The dispatcher is `useCalculateScore` in `src/utils/CalculateScore.ts` — a switch over `Categories` that instantiates the right strategy. **To add a new scoring category**: add the enum value in `src/enums/Categories.ts`, create a strategy class, wire it into the switch in `CalculateScore.ts`, and add an entry in the relevant scorecard template (`src/config/scorecardTemplates.ts`).
- **`PuzzleEngine`** (`src/puzzle/PuzzleEngine.ts`) — Puzzle variant only — owns the active modifier list, tracks engagement, and exposes lifecycle hooks the store calls into (`canScore`, `applyScore`, `afterScore`, `onTurnEnd`, `getResult`). See [Puzzle Mode](#puzzle-mode) below.
- **`gameStore`** (`src/stores/gameStore.ts`) is the Pinia bridge. Persists `gameHistory` (last 10 games), audio prefs, and `puzzleAdventureProgress` (level unlocks + best scores + best stars) to `localStorage`. Sound playback is injected from `App.vue` into `gameStore.playSoundEffect` because `Audio` construction needs the DOM.
- **`peerStore`** (`src/stores/peerStore.ts`) wraps PeerJS: room code creation, connection lifecycle, send/receive of JSON messages.

### Game modes (`src/enums/GameMode.ts`) and variants (`src/enums/GameVariant.ts`)

`GameMode` is the seating layer:
- `SinglePlayer` = 1 (one local player)
- `MultiPlayer` = 2 (N local players or a mix of human/AI — used by vs-AI puzzle)
- `OnlineMultiPlayer` = 3 (host + 1 client, WebRTC)

`GameVariant` is the rules flavour, orthogonal to seating:
- `Rainbow` = 1 — classic + color categories (Blues/Reds/Greens/ColorFullHouse). 17 scorecard slots.
- `Puzzle` = 2 — uncolored dice, 13 classic slots, modifiers on cells (see below).

Variant is forced to Rainbow for `OnlineMultiPlayer` (no per-player engine sync protocol yet — see `docs/puzzle-mode-next.md` Option D). Otherwise the player picks the variant in `GameMode.vue` (Single Player sub-menu has 4 entries: Classic Rainbow / Puzzle—Random / Puzzle—Adventure / Puzzle vs. Dice Master).

### Online multiplayer flow (host-authoritative)

Transport: PeerJS `DataConnection` (WebRTC datachannel, reliable in-order). Both sides exchange JSON messages — handled in `gameStore.handleIncomingData()`.

Message types currently in use:
- `versionCheck` — protocol/version match
- `gameStarted` / `gameOver` — lifecycle signals
- `gameState` — full snapshot push (host → client) containing dice, scorecards, currentPlayer, rollsLeft, newRoll
- `rollDice`, `holdDice`, `selectCategory` — actions (client requests; host applies and re-broadcasts `gameState`)
- `resyncRequest` — client asks host for a fresh `gameState` (also fired manually from the menu)
- `emoji`, `chatMessage` — chat/emote channel

**Sync model** (post-refactor — original "caveats" in this section are resolved per `docs/refactor-plan.md`):
- Actions dispatch through `currentPlayer.controller`, so there's a single write path per action regardless of host/client/local. `LocalHumanController` knows when it's the client and forwards to peer; `RemotePeerController` runs host-side and applies the received action locally + broadcasts.
- `gameState` broadcasts carry a monotonically-increasing `seq`. Clients track `lastReceivedSeq` and log gaps to the console.
- Auto-resync fires on `document.visibilitychange` (tab returned to foreground) — see `App.vue` `onMounted`.
- Manual "Request Resync" button still available in the menu.

### Color scoring twist

Beyond standard Yahtzee, each die has a color and three categories key off it:
- `Blues` / `Reds` / `Greens` — score when all 5 dice share that color (`ColorsStrategy`).
- `ColorFullHouse` — 3 of one color + 2 of another, numbers ignored (`ColorsFullHouseStrategy`).

## Puzzle Mode

Puzzle Mode replaces the color categories with a modifier-based gameplay layer. Modifiers sit on individual scorecard cells and change scoring rules — some block scoring (Ice Block), some boost it (Flying Multiplier, Looping Multiplier), some create cascading effects (Multiplier Bubble, Double Category), some threaten penalties (Hot Potato). Win condition is a target score plus an engagement requirement (engage N distinct modifier kinds).

### Three flavors

| Flavor | Entry point | Win condition | Notes |
|---|---|---|---|
| Random | Single Player → Puzzle—Random | Score ≥ target + engage ≥ required count | Picks 1 of 10 hand-tuned variants in `src/puzzle/configs/variants.ts` |
| Adventure | Single Player → Puzzle—Adventure → LevelSelect | Same per-level | 34 hand-authored levels in 6 themed worlds (`src/puzzle/levels/definitions.ts`). Sequential unlock + persisted best score + 1–3 stars per level |
| vs. Dice Master | Single Player → Puzzle vs. Dice Master | Highest total score wins | 2-player (`[local, ai]`). Same placements, independent modifier state. Greedy AI respects ice blocks |

### Engine architecture

**`PuzzleEngine`** (`src/puzzle/PuzzleEngine.ts`) is instantiated once per player when `variant === Puzzle`. `game.puzzleEngines[]` holds them. Each closure captures a fixed player index so reads/writes always land on the right scorecard — `getPuzzleEngine(idx = currentPlayer)` is the accessor.

The engine is seeded from a **`PuzzleConfig`** (`src/puzzle/types.ts`) — a small interface with `id`, `label`, `targetScore`, `requiredEngagementCount`, and `build(template): PuzzleModifier[]`. Two concrete configs ship today:
- `VariantPuzzleConfig` (in `src/puzzle/configs/variants.ts`) — random placement with per-spec counts
- `LevelPuzzleConfig` (in `src/puzzle/configs/LevelPuzzleConfig.ts`) — fixed placement from a `LevelDefinition`

The store sets the config on the game *before* `startNewGame()` so `restartGame()` ("Retry — Same Puzzle") replays it.

**Lifecycle hooks** the store calls into:
- `canScore(category)` — does any modifier veto scoring here? (Ice Block returns false on its cell.)
- `applyScore(category, raw) → final` — chain modifier `transformScore`s (Flying Multiplier doubles its cell).
- `afterScore(category, final)` — fan out to `onAfterScore` (Ice Block self-removes when adjacent scored; Double Category queues bonus turn; Hot Potato arms or defuses; Multiplier Bubble scatters chips).
- `onTurnEnd()` — fired by `gameStore.nextPlayer()` before advancing. Flying Multiplier relocates; Hot Potato fuse ticks down; Looping Multiplier value bounces.
- `getResult(totalScore)` — returns `{ status: 'win' | 'lose', scoreMet, engagementMet, presentKinds, engagedKinds, ... }`. GameOver renders off this shape.

**`PuzzleEngineCtx`** is passed to every modifier hook. Methods: `removeModifier`, `addModifiers` (Bubble's scatter), `relocateModifier`, `pickRandomUnscored(kind, exclude?)`, `requestBonusTurn`, `forceScore` (Hot Potato fuse expiry — bypasses the normal score flow), `markEngaged(kind)`. The ctx uses a getter for `template` so it survives the engine reassignment in `initFromConfig`.

### The six modifier kinds

Each implements `PuzzleModifier` in `src/puzzle/modifiers/`:

| Kind | Badge | Behavior | Engagement = |
|---|---|---|---|
| `iceBlock` | snowflake (blue) | `canScore` vetoes own cell | Removed via adjacent-row score > 0 |
| `flyingMultiplier` | "×2" (orange) | `transformScore` multiplies own cell | Player scores its cell with score > 0 |
| `doubleCategory` | clone (purple) | `requestBonusTurn` on first score; sum-on-second via `ScoreManager.addScoreToCategory` | Bonus second score lands |
| `hotPotato` | bomb (gray → red pulsing when armed) | Dormant until first non-zero score arms it; fuse counts down each turn end; `forceScore(cat, 0)` if it expires | Defused by scoring own cell with value > 0 |
| `multiplierBubble` | dot (teal) | `addModifiers` scatters 3 fresh `FlyingMultiplierModifier`s on random unscored cells; self-removes | At least one chip lands |
| `loopingMultiplier` | "×N" (pink) | Stays on cell; value triangle-waves between min/max each turn end | Player banks positive score while value > 1 |

**Adding a new modifier kind:**
1. Add the string to `ModifierKind` in `src/puzzle/types.ts`.
2. Implement the class in `src/puzzle/modifiers/<Name>Modifier.ts`.
3. Add a spec variant to `LevelModifierSpec` in `src/puzzle/levels/types.ts` and a `case` in `LevelPuzzleConfig.build()`.
4. Add color rules everywhere `.modifier-<kind>` is keyed: `src/styles.css` (puzzle-goals-kind, puzzle-legend-badge), `src/components/ModifierBadge.vue` (badge color + icon), `src/components/LevelSelect.vue` (.level-tile-mod), `src/components/GameOver.vue` (.puzzle-result-kind).
5. Add icon mapping in `src/components/GameBoard.vue` (legend + kindLabel + goals-panel icon switch).
6. Optionally add the count to `modifierCounts()` in `LevelSelect.vue`.
7. Tests: `src/puzzle/modifiers/__tests__/<Name>Modifier.test.ts` (effect-based engagement, lifecycle, edge cases).

### Adventure persistence

`gameStore.adventureProgress: { highestUnlocked, bestScores, bestStars }` is persisted to `localStorage.puzzleAdventureProgress`. The progression rule lives as a pure function in `src/puzzle/levels/progression.ts` (`applyWinToProgress`) so it's unit-testable without Pinia. Star thresholds: 1⭐ at target, 2⭐ at +25%, 3⭐ at +50% (`computeStars`).

Adventure levels are grouped by `worldId` (`src/puzzle/levels/types.ts`). Worlds live in the `WORLDS` array in `definitions.ts`. The LevelSelect screen renders one collapsible section per world with a thematic border color.

### Per-player engines in vs-AI

When `variant === Puzzle` and there are 2 players (vs-AI), `game.puzzleEngines` is a 2-element array. Both engines are built from the same `PuzzleConfig` (same placements) but have independent state — your ice doesn't help the AI and vice versa. The `GreedyStrategy` (`src/strategies/ai/GreedyStrategy.ts`) queries `game.getPuzzleEngine(game.currentPlayer)` to respect `canScore` in its decision branches.

### Engine event bus + cell-anchored UI

`PuzzleEngine` exposes a tiny pub/sub: `engine.on(listener) → unsubscribe` and (internally) `engine.emit(event)`. `PuzzleEngineCtx` forwards an `emit` to modifiers so each modifier kind emits lifecycle events from its hooks. The full `EngineEvent` union lives in `src/puzzle/types.ts`:

```
iceBlock:melt | flyingMultiplier:relocate | flyingMultiplier:applied
| hotPotato:armed | hotPotato:tick | hotPotato:defuse | hotPotato:expire
| multiplierBubble:pop | loopingMultiplier:change | loopingMultiplier:applied
| engine:bonusTurn | engine:goalMet
```

`ctx.requestBonusTurn` emits `engine:bonusTurn` (single source). The store calls `engine.checkGoalMet(totalScore)` after every score; the engine emits `engine:goalMet` at most once per goal kind (`score` / `engagement`) so the chime fires only on the crossing turn.

`GameBoard.vue` subscribes per-player on mount (`game.players.forEach` → `engine.on(handleEngineEvent)`) and unsubscribes on unmount. Re-subscribes on `currentGame` change (restart). The handler dispatches each event to:
- a cell-anchored animation in `src/utils/cellAnimations.ts` (resolves the target cell via `[data-category="<value>"]`, spawns transient DOM in a `#cell-fx-layer` fixed overlay), and
- a synthesized SFX call in `src/utils/synthSfx.ts` (`playModifierSfx(kind)`), gated by `gameStore.sfxEnabled`.

`flyingMultiplier:applied` + `loopingMultiplier:applied` carry `{ raw, final, multiplier }` so the cell shows a `raw × mult = +final` score-breakdown popup over the originating cell instead of the regular center-screen popup.

**Don't subscribe to engine events from places that survive engine reassignment** (`initFromConfig` keeps listeners, but a fresh `PuzzleEngine` constructor wipes them). `GameBoard.vue`'s `watch(currentGame, subscribe)` is the canonical pattern.

### Web Audio synth (no audio assets)

`src/utils/synthSfx.ts` lazily creates one `AudioContext` on first call (resumes if suspended) and a single master `GainNode` at 0.4. Each modifier event is a short envelope-shaped tone or filtered-noise burst. Helpers: `tone()` / `noiseBurst()` (private), `playModifierSfx(kind)` (public). Existing mp3 SFX (dice roll, hold, score, no-score, Yahtzee) still load via `App.vue`'s `preloadSoundEffects` — those are NOT synthesized.

### Mobile-first UI shell

The app is mobile-first. `#app` is locked to `max-width: 430px` and centered; outside that column an ambient gradient (per mode/world theme) fills the viewport on desktop. `body` gets one of:
- `mode-rainbow` (default Rainbow variant) — animated multi-stop gradient
- `mode-puzzle` (Puzzle variant) — deep indigo + magenta accent
- `mode-puzzle world-<id>` (Adventure level) — additionally applies one of `world-beginnings` / `frostlands` / `echo-chamber` / `storm-front` / `storm-surge` / `finale` for per-world accent + particle atmosphere (`world-fx` layer)

Body classes are managed by a `watch(activeThemeClasses, ...)` in `App.vue` keyed off `gameStore.gameVariant` + `gameStore.currentAdventureLevel`. The `<meta name="theme-color">` is updated alongside so the OS status bar matches.

CSS variables in `src/styles/themes.css`: `--accent`, `--accent-soft`, `--bg-from`, `--bg-via`, `--bg-to`, `--surface`, `--surface-strong`, `--text`, `--text-soft`. All component CSS reads these vars instead of hard-coding colors.

**Layout zones (GameBoard):**
1. `.app-top-bar` (sticky top:0, z-index 30) — in `App.vue`, owns the hamburger button. Transparent strip, full column width.
2. `.players-header` (sticky top:2.7rem) — player chips with avatar + name + score, magenta-accent glow on the active player. Auto-shrinks avatar + font when 3+ chips share the row (`.players-header:has(.player-chip:nth-child(3))`).
3. `.game-main` (flex:1, justify-content:center) — vertically centers the puzzle goals + bonus banner + scorecard block in the remaining space.
4. `.bottom-stack` (fixed bottom:0, max-width matches column, centered) — AI/online-waiting banner + dice tray + action row (held-count chip + Roll button + rolls-left dots). All grouped in one panel that pushes upward when the waiting banner is visible.

**Puzzle context box** (`.puzzle-goals`) stretches to full column width and CONTAINS the collapsible modifier-help legend. The old standalone legend wrap below the scorecard is gone.

**Dice are 3D pip cubes.** Each `<div class="die">` contains a `<div class="die-cube">` (preserve-3d) with six `<div class="face">` children translated to ±X/Y/Z normals. `.die[data-pips="N"] .die-cube` rotates the cube to bring face N forward. Roll animation replaces the static cube transform with a multi-axis tumble (rotateX + rotateY + rotateZ, ending at identity) so the data-pips rule resumes after the keyframe and the cube settles on the rolled value. Pre-roll (value 0) shows a "?" on face 1.

**Score animation backdrop.** `src/utils/animations.ts` spawns its own `#score-fx-backdrop` (fixed, 72% black, 2px blur) for the popup's duration. The old `.overlay` element was retired when the dropdown menu cluster was rebuilt as a bottom sheet, so don't reference it.

**Bottom-sheet menu.** Single hamburger in `.app-top-bar` opens a sheet with tabbed segments (audio / history / chat / options). State: `showSheet` + `activeTab` refs in `App.vue`. The four old top-right dropdowns are gone.

`prefers-reduced-motion: reduce` is honored on every new animation (cube tumble, cell-fx, world particles, sheet slide, popup theatrics). Synth SFX always play; only visuals are suppressed.

### File inventory (puzzle + UI shell)

```
src/
├── enums/GameVariant.ts                    # Rainbow | Puzzle enum
├── config/scorecardTemplates.ts            # RAINBOW_TEMPLATE, PUZZLE_TEMPLATE
├── puzzle/
│   ├── types.ts                            # PuzzleModifier, PuzzleConfig, PuzzleEngineCtx, EngineEvent union
│   ├── PuzzleEngine.ts                     # engine + ctx builder + on/emit event bus + checkGoalMet
│   ├── configs/
│   │   ├── variants.ts                     # 10 random variant configs
│   │   └── LevelPuzzleConfig.ts            # adapter for authored levels
│   ├── levels/
│   │   ├── types.ts                        # LevelDefinition + World
│   │   ├── definitions.ts                  # 34 levels, 6 WORLDS
│   │   └── progression.ts                  # applyWinToProgress + computeStars
│   └── modifiers/                          # Each emits its own lifecycle events via ctx.emit
│       ├── IceBlockModifier.ts
│       ├── FlyingMultiplierModifier.ts
│       ├── DoubleCategoryModifier.ts
│       ├── HotPotatoModifier.ts
│       ├── MultiplierBubbleModifier.ts
│       └── LoopingMultiplierModifier.ts
├── styles/
│   └── themes.css                          # Mode + world CSS variables, particle atmospheres, cell-fx keyframes
├── utils/
│   ├── animations.ts                       # Yahtzee + score popup + emoji popup (with #score-fx-backdrop)
│   ├── cellAnimations.ts                   # Cell-anchored modifier animations (ice melt, flying chip, bomb fx, etc.)
│   └── synthSfx.ts                         # Web Audio synthesis (lazy AudioContext, master gain, tone/noise helpers)
└── components/
    ├── App.vue                             # Top bar w/ hamburger, bottom-sheet menu, body theme-class controller
    ├── LevelSelect.vue                     # Adventure level-select screen w/ per-world chapter cards
    ├── ModifierBadge.vue                   # Per-cell modifier badge (top-left, gradient backgrounds)
    ├── GameBoard.vue                       # Sticky player header, .game-main (centered), fixed .bottom-stack, engine event subscription
    ├── GameMode.vue                        # Mode-card menu (vertically centered)
    └── GameOver.vue                        # Solo / Adventure / vs-AI result banners + star reveal animation
```

### Capacitor / native / PWA

`capacitor.config.ts` sets `webDir: 'dist'` and `appId: com.yahtzeegame.app`. `main.ts` waits for `deviceready` before mounting Vue when running on a native platform (otherwise mounts immediately). `vite.config.ts` uses `base: './'` (relative paths) so the built bundle works inside the Capacitor WebView and as a PWA. The service worker is in `public/service-worker.js`.

## Known rough edges

- `Categories.TopBonus` is modeled as a scorecard entry rather than derived; the upper-section bonus is auto-computed in `getTotalScore()` / `isUpperSectionBonusAchieved()` but the UI still renders a dedicated cell for it.
- **Puzzle engine reactivity gotcha.** `PuzzleEngine` lives inside Pinia state, so each modifier comes back as a Vue Proxy when iterated. `ctx.removeModifier` therefore matches by `(kind, category)` rather than reference equality — a `===` check on a proxied modifier vs. the raw underlying object would always fail. Same shape in `ctx.relocateModifier`. **Don't introduce reference-based comparisons in modifier code.**
- **Engine state changes don't trigger Vue re-renders directly.** Mutations like `engine.modifiers = filter(...)` go to the raw underlying object and bypass Pinia's proxy `trigger`. The UI relies on the scorecard mutation (which IS reactive) that happens alongside every engine change. As a result, things like `pendingBonusCategory` MUST be read as a plain function call from the template, not a `computed()`, or the computed caches the initial `null` forever. See `GameBoard.vue` where `pendingBonusCategory()`, `puzzleGoals()`, etc. are explicitly functions.
- **Puzzle Mode is single-player only in OnlineMultiPlayer-land.** `gameStore.initializeGame` coerces the variant back to Rainbow whenever `mode === OnlineMultiPlayer`. Local multiplayer + Puzzle is allowed (that's how vs-AI works). Online Puzzle would require a per-player engine sync protocol — see `docs/puzzle-mode-next.md` Option D.
- **AI is greedy + only ice-aware.** The `GreedyStrategy` respects `canScore` (skips ice-blocked cells), but doesn't strategically value multiplier cells, defuse armed Hot Potatoes, or time Looping Multipliers. The AI plays decently but won't impress. See `docs/puzzle-mode-next.md` Option A.
- **`vite.config.ts` `server.allowedHosts`** lists `web` (the docker-network hostname) so the playwright sidecar can reach `http://web:5173`. If you rename the compose service, update this list too or Vite will return a host-check 403.
- **Playwright runs via docker** (`mcr.microsoft.com/playwright:v1.60.0-noble`) — the host system likely lacks `libnspr4` and the dev container doesn't have sudo. `docker compose run --rm playwright npm run e2e` for tests; `docker compose run --rm playwright npm run e2e:screenshots` for screenshots. The named `playwright-modules` volume keeps debian-ABI `node_modules` separate from the alpine web-container ones.
