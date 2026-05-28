# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Rainbow Yahtzee — a Vue 3 + TypeScript dice game with classic Yahtzee rules plus color-based scoring (Color Full House, Color Yahtzee for Reds/Greens/Blues) AND a single-player Puzzle Mode with modifier-based gameplay (ice blocks, multipliers, hot potato, looping categories, etc.) inspired by Dice World. Supports single player, local multiplayer, online multiplayer (host/client over WebRTC via PeerJS), a vs-AI "Dice Master" variant for puzzle mode, and a once-per-UTC-date **Daily Puzzle** seeded so every player worldwide gets the same board. Includes a persisted **player profile** (XP, level, lifetime stats, 12 achievements, coin balance) and a **coin shop** of 5 consumables (Extra Roll, Fresh Re-Roll, Score Sense, Re-Cycle, Lucky Charm) usable mid-game. Wrapped with Capacitor for Android/iOS native builds. Also a PWA (`public/manifest.json` + `public/service-worker.js`).

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
    ├── peerStore (src/stores/peerStore.ts) ── WebRTC P2P via peerjs
    └── playerProfileStore (src/stores/playerProfileStore.ts) ── persistent account state
                                                ↓
                                pure ops in src/profile/* (xp, achievements, rewards, consumables)
```

- **`YahtzeeGame`** (`src/game.ts`) is the engine. It holds `rollsLeft`, `currentPlayer` (index), `state` (a `GameState` enum with subscriber callbacks via `onStateChange`), a `Player[]` array — one entry per seat — and a `variant: GameVariant` (`Rainbow` | `Puzzle`). `nextPlayer()` rotates the index after each category selection.
- **`Player`** (`src/models/Player.ts`) is the per-seat model. Holds the player's `name`, `isAI: boolean`, a `controller: PlayerController` (`LocalHumanController` / `RemotePeerController` / `AIController`), and its own `ScoreManager`. The `Player` class also exposes proxy methods (`calculateScore`, `getTotalScore`, `selectCategory`, etc.) that forward to its `ScoreManager`.
- **`DiceManager`** (`src/managers/DiceManager.ts`) owns the 5 shared dice. Takes a `{ assignColor: boolean }` config — `true` in Rainbow (each die has a `color: 'red' | 'green' | 'blue' | 'blank'`), `false` in Puzzle (die `color` is undefined). Held dice survive `rollDice()`; `resetDice()` clears values between turns.
- **`ScoreManager`** (`src/managers/ScoreManager.ts`) owns one player's scorecard: a `Partial<Record<Categories, { value, selected, group }>>` initialized from a template. `RAINBOW_TEMPLATE` (17 categories) and `PUZZLE_TEMPLATE` (13 classic) live in `src/config/scorecardTemplates.ts`. Accessors guard missing keys so Puzzle scorecards don't crash on absent color slots. Upper-section bonus (+35 when Ones–Sixes ≥ 63) is auto-applied inside `getTotalScore` / `isUpperSectionBonusAchieved`. `addScoreToCategory(cat, delta)` exists for Double Category bonus turns (sums onto already-selected slot).
- **Scoring strategies** (`src/strategies/`) implement `ScoringStrategy.calculateScore(dice)`. The dispatcher is `useCalculateScore` in `src/utils/CalculateScore.ts` — a switch over `Categories` that instantiates the right strategy. **To add a new scoring category**: add the enum value in `src/enums/Categories.ts`, create a strategy class, wire it into the switch in `CalculateScore.ts`, and add an entry in the relevant scorecard template (`src/config/scorecardTemplates.ts`).
- **`PuzzleEngine`** (`src/puzzle/PuzzleEngine.ts`) — Puzzle variant only — owns the active modifier list, tracks engagement, and exposes lifecycle hooks the store calls into (`canScore`, `applyScore`, `afterScore`, `onTurnEnd`, `getResult`). See [Puzzle Mode](#puzzle-mode) below.
- **`gameStore`** (`src/stores/gameStore.ts`) is the Pinia bridge. Persists `gameHistory` (last 10 games), audio prefs, `puzzleAdventureProgress` (level unlocks + best scores + best stars), and `puzzleDaily` (daily streak + 30-day history) to `localStorage`. Sound playback is injected from `App.vue` into `gameStore.playSoundEffect` because `Audio` construction needs the DOM. Calls `playerProfileStore.recordGameComplete(summary)` from `endGame` to bank XP/coins/achievements.
- **`peerStore`** (`src/stores/peerStore.ts`) wraps PeerJS: room code creation, connection lifecycle, send/receive of JSON messages.
- **`playerProfileStore`** (`src/stores/playerProfileStore.ts`) owns the persistent account state under the `playerProfile` localStorage key. Single source of truth for XP, level, coin balance, unlocked achievements, lifetime stats, and consumable inventory. Independent of game state (survives across all games). See [Player Profile + Coin Shop](#player-profile--coin-shop).

### Game modes (`src/enums/GameMode.ts`) and variants (`src/enums/GameVariant.ts`)

`GameMode` is the seating layer:
- `SinglePlayer` = 1 (one local player)
- `MultiPlayer` = 2 (N local players or a mix of human/AI — used by vs-AI puzzle)
- `OnlineMultiPlayer` = 3 (host + 1 client, WebRTC)

`GameVariant` is the rules flavour, orthogonal to seating:
- `Rainbow` = 1 — classic + color categories (Blues/Reds/Greens/ColorFullHouse). 17 scorecard slots.
- `Puzzle` = 2 — uncolored dice, 13 classic slots, modifiers on cells (see below).

Variant is forced to Rainbow for `OnlineMultiPlayer` (no per-player engine sync protocol yet — see `docs/puzzle-mode-next.md` Option D). Otherwise the player picks the variant in `GameMode.vue` (Single Player sub-menu has 5 entries: Classic Rainbow / Puzzle—Random / Puzzle—Adventure / Puzzle vs. Dice Master / Daily Puzzle).

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

### Four flavors

| Flavor | Entry point | Win condition | Notes |
|---|---|---|---|
| Random | Single Player → Puzzle—Random | Score ≥ target + engage ≥ required count | Picks 1 of 10 hand-tuned variants in `src/puzzle/configs/variants.ts` |
| Adventure | Single Player → Puzzle—Adventure → LevelSelect | Same per-level | **38 hand-authored levels in 7 themed worlds** (`src/puzzle/levels/definitions.ts`). Sequential unlock + persisted best score + 1–3 stars per level. World 7 ("Cycles") showcases Looping Categories |
| vs. Dice Master | Single Player → Puzzle vs. Dice Master | Highest total score wins | 2-player (`[local, ai]`). Same placements, independent modifier state. Greedy AI respects ice blocks AND swaps in the active cycle category when evaluating loopingCategory slots |
| Daily | Single Player → Daily Puzzle | Score ≥ target + engagement | Once-per-UTC-date deterministic placement. All players worldwide get the same puzzle. Persisted streak / best / 30-day history. See [Daily Puzzle](#daily-puzzle) |

### Engine architecture

**`PuzzleEngine`** (`src/puzzle/PuzzleEngine.ts`) is instantiated once per player when `variant === Puzzle`. `game.puzzleEngines[]` holds them. Each closure captures a fixed player index so reads/writes always land on the right scorecard — `getPuzzleEngine(idx = currentPlayer)` is the accessor.

The engine is seeded from a **`PuzzleConfig`** (`src/puzzle/types.ts`) — a small interface with `id`, `label`, `targetScore`, `requiredEngagementCount`, and `build(template, rng?: RNG): PuzzleModifier[]`. Three concrete configs ship today:
- `VariantPuzzleConfig` (in `src/puzzle/configs/variants.ts`) — random placement with per-spec counts. Helpers (`takeRandom`, `pickIceBlockPositions`) accept an optional `RNG` arg, defaulting to `Math.random`.
- `LevelPuzzleConfig` (in `src/puzzle/configs/LevelPuzzleConfig.ts`) — fixed placement from a `LevelDefinition` (deterministic, ignores `rng`).
- `DailyPuzzleConfig` (in `src/puzzle/configs/DailyPuzzleConfig.ts`) — wraps `VariantPuzzleConfig` with a `mulberry32` RNG seeded from the UTC dateKey. The variant pick uses a separate stream (offset seed) so future difficulty tilts won't shift placement.

The store sets the config on the game *before* `startNewGame()` so `restartGame()` ("Retry — Same Puzzle") replays it.

**Lifecycle hooks** the store calls into:
- `canScore(category)` — does any modifier veto scoring here? (Ice Block returns false on its cell.)
- `applyScore(category, raw, dice) → final` — chain modifier `transformScore`s (Flying Multiplier doubles; Looping Category recomputes against the active cycle category). `dice` is stashed on `ctx.dice` for the duration of the call.
- `afterScore(category, final, dice)` — fan out to `onAfterScore` (Ice Block self-removes when adjacent scored; Double Category queues bonus turn; Hot Potato arms or defuses; Multiplier Bubble scatters chips).
- `onTurnEnd()` — fired by `gameStore.nextPlayer()` before advancing. Flying Multiplier relocates; Hot Potato fuse ticks down; Looping Multiplier value bounces; Looping Category rotates its active cycle category.
- `getResult(totalScore)` — returns `{ status: 'win' | 'lose', scoreMet, engagementMet, presentKinds, engagedKinds, ... }`. GameOver renders off this shape.

**`PuzzleEngineCtx`** is passed to every modifier hook. Methods: `removeModifier`, `addModifiers` (Bubble's scatter), `relocateModifier`, `pickRandomUnscored(kind, exclude?)`, `requestBonusTurn`, `forceScore` (Hot Potato fuse expiry — bypasses the normal score flow), `markEngaged(kind)`. Getters: `template`, `dice` — both lazily resolved on each access so they survive the engine reassignment in `initFromConfig`. `ctx.dice` is empty between scoring calls; it's only populated for the `transformScore` / `onAfterScore` window, set by `applyScore` and `afterScore` from the snapshot the gameStore passes in.

### The seven modifier kinds

Each implements `PuzzleModifier` in `src/puzzle/modifiers/`:

| Kind | Badge | Behavior | Engagement = |
|---|---|---|---|
| `iceBlock` | snowflake (blue) | `canScore` vetoes own cell | Removed via adjacent-row score > 0 |
| `flyingMultiplier` | "×2" (orange) | `transformScore` multiplies own cell | Player scores its cell with score > 0 |
| `doubleCategory` | clone (purple) | `requestBonusTurn` on first score; sum-on-second via `ScoreManager.addScoreToCategory` | Bonus second score lands |
| `hotPotato` | bomb (gray → red pulsing when armed) | Dormant until first non-zero score arms it; fuse counts down each turn end; `forceScore(cat, 0)` if it expires | Defused by scoring own cell with value > 0 |
| `multiplierBubble` | dot (teal) | `addModifiers` scatters 3 fresh `FlyingMultiplierModifier`s on random unscored cells; self-removes | At least one chip lands |
| `loopingMultiplier` | "×N" (pink) | Stays on cell; value triangle-waves between min/max each turn end | Player banks positive score while value > 1 |
| `loopingCategory` | rotate-right + short label (emerald) | Slot's *active scoring category* rotates through an author-defined cycle each turn end. `transformScore` calls `useCalculateScore(activeCategory, ctx.dice)` to **recompute** the score against the live roll. `skipToNext(ctx)` is exposed for the Re-Cycle consumable | Player banks positive score while active cycle category ≠ slot category |

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
| loopingCategory:cycle | loopingCategory:applied
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
- `mode-puzzle world-<id>` (Adventure level) — additionally applies one of `world-beginnings` / `frostlands` / `echo-chamber` / `storm-front` / `storm-surge` / `finale` / `cycles` for per-world accent + particle atmosphere (`world-fx` layer). Cycles uses a teal/emerald gradient with a slow orbital ring sweep + emerald mote field

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

**Bottom-sheet menu.** Single hamburger in `.app-top-bar` opens a sheet with five tabbed segments (audio / history / profile / chat / options). State: `showSheet` + `activeTab` refs in `App.vue`. `chat` is only visible while online; `options` only while a game is active; `audio` / `history` / `profile` are always visible. The `profile` tab renders `<ProfilePanel />` which embeds `<ShopPanel />` below the achievement grid.

`prefers-reduced-motion: reduce` is honored on every new animation (cube tumble, cell-fx, world particles, sheet slide, popup theatrics). Synth SFX always play; only visuals are suppressed.

### File inventory (puzzle + UI shell + profile)

```
src/
├── enums/GameVariant.ts                    # Rainbow | Puzzle enum
├── config/scorecardTemplates.ts            # RAINBOW_TEMPLATE, PUZZLE_TEMPLATE
├── puzzle/
│   ├── types.ts                            # PuzzleModifier, PuzzleConfig, PuzzleEngineCtx (with .dice getter), EngineEvent union, RNG type
│   ├── PuzzleEngine.ts                     # engine + ctx builder + on/emit event bus + checkGoalMet + currentDice stash
│   ├── configs/
│   │   ├── variants.ts                     # 10 random variant configs; takeRandom + pickIceBlockPositions accept optional RNG
│   │   ├── LevelPuzzleConfig.ts            # adapter for authored levels
│   │   └── DailyPuzzleConfig.ts            # date-seeded variant pick + placement (mulberry32)
│   ├── levels/
│   │   ├── types.ts                        # LevelDefinition + World + LevelModifierSpec
│   │   ├── definitions.ts                  # 38 levels, 7 WORLDS (world 7 = Cycles)
│   │   └── progression.ts                  # applyWinToProgress + computeStars
│   ├── daily/
│   │   ├── types.ts                        # DailyResult, DailyPuzzleProgress (versioned)
│   │   └── dailyProgress.ts                # pure load/apply/streak helpers
│   └── modifiers/                          # Each emits its own lifecycle events via ctx.emit
│       ├── IceBlockModifier.ts
│       ├── FlyingMultiplierModifier.ts
│       ├── DoubleCategoryModifier.ts
│       ├── HotPotatoModifier.ts
│       ├── MultiplierBubbleModifier.ts
│       ├── LoopingMultiplierModifier.ts
│       └── LoopingCategoryModifier.ts      # cycle of categories + recompute via ctx.dice + skipToNext for Re-Cycle consumable
├── profile/                                # Pure account-state logic (no Pinia / Vue)
│   ├── types.ts                            # PlayerProfile, LifetimeStats, GameSummary, AchievementDef, RewardBundle
│   ├── xp.ts                               # quadratic curve + applyXpGain
│   ├── achievements.ts                     # 12 starter ACHIEVEMENTS + evaluateAchievements + applyAchievementUnlock
│   ├── rewards.ts                          # computeGameRewards + applyRewards + emptyProfile/emptyStats
│   └── consumables.ts                      # 5 CONSUMABLES + buy/consume/shopListing pure ops
├── stores/
│   ├── gameStore.ts                        # Game lifecycle, audio prefs, adventure + daily persistence, useConsumable dispatch
│   ├── peerStore.ts                        # PeerJS / WebRTC wrapper
│   └── playerProfileStore.ts               # XP / coins / achievements / inventory under `playerProfile` localStorage key
├── styles/
│   └── themes.css                          # Mode + world CSS variables (incl. Cycles), particle atmospheres, cell-fx keyframes, score-sense-highlight
├── utils/
│   ├── animations.ts                       # Yahtzee + score popup + emoji popup (with #score-fx-backdrop)
│   ├── cellAnimations.ts                   # Cell-anchored modifier animations (ice melt, flying chip, bomb fx, looping-category flip + breakdown popup, etc.)
│   ├── synthSfx.ts                         # Web Audio synthesis (lazy AudioContext, master gain, tone/noise helpers, loopingCategory shimmer)
│   ├── seededRandom.ts                     # mulberry32 RNG + FNV-1a hashString
│   └── dailyDate.ts                        # UTC YYYY-MM-DD key + daysBetween
└── components/
    ├── App.vue                             # Top bar + 5-tab bottom-sheet menu + AchievementToast mount + body theme-class controller
    ├── LevelSelect.vue                     # Adventure level-select screen w/ per-world chapter cards (incl. Cycles)
    ├── ModifierBadge.vue                   # Per-cell modifier badge (top-left, gradient backgrounds, short active-cat label for loopingCategory)
    ├── GameBoard.vue                       # Sticky player header, .game-main, fixed .bottom-stack, engine event subscription, ConsumableButton strip
    ├── GameMode.vue                        # Mode-card menu w/ 5-entry Single Player submenu (incl. Daily Puzzle)
    ├── GameOver.vue                        # Solo / Adventure / vs-AI result banners + star reveal + daily streak chip + Rewards banner
    ├── ProfilePanel.vue                    # Bottom-sheet "Profile" tab body: level + XP bar + stats + achievements + ShopPanel
    ├── ShopPanel.vue                       # 5 consumables w/ buy buttons + coin balance + error feedback
    ├── ConsumableButton.vue                # Circular FAB rendered in GameBoard's action zone (one per owned + available consumable)
    └── AchievementToast.vue                # Top-anchored animated popup for mid-session achievement unlocks
```

## Daily Puzzle

The Daily Puzzle is a once-per-UTC-date deterministic puzzle that every player worldwide sees the same way. It's a fifth single-player entry in `GameMode.vue` (alongside Classic Rainbow / Puzzle—Random / Puzzle—Adventure / Puzzle vs. Dice Master).

### Determinism

`src/utils/seededRandom.ts` ships **mulberry32** (small PRNG, ~32-bit state) and **FNV-1a `hashString`**. `src/utils/dailyDate.ts` produces a stable `YYYY-MM-DD` key from `Date.UTC()` (`getDailyDateKey`) and a signed `daysBetween` helper.

`DailyPuzzleConfig` (`src/puzzle/configs/DailyPuzzleConfig.ts`):
- Hashes the date key to a base seed.
- Uses an **offset stream** (seed ^ 0x9e3779b9) to pick which `VariantSpec` from `PUZZLE_VARIANT_SPECS` drives the day's puzzle — that way future "harder Saturday" tweaks won't shift placement.
- Threads the **raw base seed** through `VariantPuzzleConfig.build(template, rng)` so `takeRandom` + `pickIceBlockPositions` lay modifiers down identically across devices.
- `build()` ignores any caller-supplied `rng` — the daily contract is determinism.

`PuzzleConfig.build()` gained an optional `rng?: RNG` argument (defaults to `Math.random`). `VariantPuzzleConfig` threads it through; `LevelPuzzleConfig` is already deterministic so it ignores it. Mid-game randomness (`ctx.pickRandomUnscored`, etc.) **stays on `Math.random()`** — only initial placement is locked. Two players' games diverge from move 1; that's by design.

### Persistence (`puzzleDaily` localStorage key)

`DailyPuzzleProgress` (`src/puzzle/daily/types.ts`, versioned):
```
{ version: 1, bestScore, currentStreak, longestStreak, lastPlayedDateKey, history[] }
```
Pure progression in `src/puzzle/daily/dailyProgress.ts`:
- `loadDailyProgress(raw)` — tolerant JSON loader, falls back to defaults on corruption.
- `applyDailyResult(progress, result, today)` — win streak math: adjacent day → +1, gap → reset to 1, loss → 0, **replay of same date → no-op**.
- `currentStreakFor(progress, today)` — returns 0 when the persisted streak is stale (>1 day gap since last play).
- History bounded to 30 entries (`DAILY_HISTORY_LIMIT`); UI typically displays last 7.

### gameStore integration

- State: `dailyProgress: DailyPuzzleProgress`, `currentDailyDateKey: string | null`.
- `startDailyPuzzle()` — builds `new DailyPuzzleConfig(getDailyDateKey())`, calls `initializeGame(SinglePlayer, 1, Puzzle, dailyConfig)`, then sets `currentDailyDateKey`. The clear-on-init guard in `initializeGame` only nulls `currentDailyDateKey` when the puzzleConfigOverride **isn't** a `DailyPuzzleConfig`, so this set sticks.
- `endGame()` — if `currentDailyDateKey` is set, reads the puzzle result from the engine and calls `recordDailyCompletion(dateKey, score, won)`. Locking in the date key at game start means the streak survives a UTC rollover mid-game.

### UI

- **GameMode.vue** — 5th Single-Player button "Daily Puzzle" with a fire-streak badge when `currentStreakFor(progress, today) > 0`.
- **GameOver.vue** — daily banner with the date + streak appears below the standard puzzle result block when `gameStore.currentDailyDateKey` is set.

---

## Player Profile + Coin Shop

The player profile is persistent account state, independent of any single game. It's the home of XP, level, lifetime stats, unlocked achievements, coin balance, and consumable inventory. **`PuzzleEngine` knows nothing about it** — the coupling lives at `gameStore.endGame` and `gameStore.useConsumable`.

### `playerProfileStore` (`src/stores/playerProfileStore.ts`)

LocalStorage key: `playerProfile`. Versioned shape:
```
PlayerProfile {
  version: 1, createdAt, xp, level (cached), coins,
  unlocked: { [achievementId]: ISO date },
  inventory: { [consumableId]: count },
  stats: LifetimeStats
}
```

The store wraps **pure functions** living in `src/profile/` — UI components never reach into the raw shape; they go through getters / actions.

**Public actions:**
- `recordGameComplete(summary: GameSummary): RewardBundle` — the central post-game hook. `gameStore.endGame` builds the summary; the store computes rewards, updates stats, applies XP/coins, re-evaluates achievements, banks the stacked rewards. Result stashed on `lastGameRewards` for `GameOver.vue` to render.
- `checkAchievement(triggerEvent: string)` — event-driven evaluation for triggers that aren't tied to a game-complete (e.g. `'threeStarWorld'` after `gameStore.recordAdventureWin` detects the world-wide 3-star crossing).
- `addCoins(amount, source: 'earned' | 'iap' = 'earned')` — the `'iap'` source discriminator is reserved for a future Capacitor IAP phase.
- `buyConsumable(id) → { ok, reason? }` — wraps the pure op; `reason` is `'insufficient' | 'maxStack' | 'unknown'`.
- `useConsumableFromInventory(id) → boolean` — decrements; returns false if nothing owned.
- `recordThreeStarWorld(worldId)` — called from `gameStore.recordAdventureWin` when every level in a world has earned 3 stars; updates `stats.threeStarWorlds` and triggers achievement evaluation.

### Pure logic (`src/profile/`)

- **`xp.ts`** — quadratic curve: `xpForLevel(N) = 100 * (N-1) * N / 2`. L2=100, L5=1000, L10=4500, L20=19000. `applyXpGain(profile, amount) → { profile, levelsGained }`. Closed-form inverse `levelForXp(xp)` used to repair drift on load.
- **`rewards.ts`** — `computeGameRewards(summary, profile)` returns the prospective XP/coin deltas (game-mode-specific: 25 rainbow base / 40 puzzle base / +60 puzzle win / +100 first adventure clear / +50 daily / +100 daily win / streak cap 100 XP + 30 coins). `applyRewards(profile, rewards, summary, now)` does the full pipeline: stat update → XP gain → level-up coins (50/level) → achievement re-evaluation → stacked achievement XP/coin rewards. Returns a final `RewardBundle` with `newAchievements[]` for the UI.
- **`achievements.ts`** — 12 starter achievements with predicates. `evaluateAchievements(profile, ctx)` returns the freshly-true subset (already-unlocked is filtered out). `applyAchievementUnlock` is **idempotent** — re-applying a known unlock returns the same profile reference. Two achievements are `hidden: true` and only become visible once unlocked.

| ID | Trigger | Coins | XP | Hidden? |
|---|---|---|---|---|
| `firstRoll` | First game played | 5 | 25 | – |
| `firstWin` | First Rainbow MP win OR first Puzzle win | 10 | 50 | – |
| `firstPuzzle` | Complete any puzzle game | 10 | 50 | – |
| `firstAdventure` | Clear Adventure level 1 | 15 | 75 | – |
| `worldClear` | All levels in any one world cleared | 25 | 150 | – |
| `threeStarLevel` | 3⭐ on any Adventure level | 20 | 100 | – |
| `threeStarWorld` | 3⭐ on every level of any one world | 75 | 400 | ✅ |
| `yahtzeeHunter` | 5 lifetime Yahtzees | 30 | 150 | – |
| `engageAllKinds` | Engage all 7 modifier kinds in one game | 30 | 150 | – |
| `dailyDouble` | Daily Puzzle on 2 distinct dates | 15 | 75 | – |
| `weekStreak` | 7-day Daily streak | 50 | 300 | – |
| `centurion` | 100 games played | 50 | 500 | ✅ |

### Coin shop + 5 consumables (`src/profile/consumables.ts`)

| ID | Name | Cost | Effect | Available when |
|---|---|---|---|---|
| `extraRoll` | Extra Roll | 30 | `game.rollsLeft = 1` | `rollsLeft === 0 && !newRoll && isPlayerTurn` |
| `freshReroll` | Fresh Re-Roll | 50 | Un-holds every die + `rollsLeft = 1` | `rollsLeft <= 1 && !newRoll && isPlayerTurn` |
| `revealBestCell` | Score Sense | 25 | 3s `.score-sense-highlight` on the best unscored cell (post-engine.applyScore so multipliers count) | `!newRoll && hasUnscoredCells && isPlayerTurn` |
| `reCycleLooping` | Re-Cycle | 40 | Advances one Looping Category slot by +1 immediately | `variant === Puzzle && hasLooping && isPlayerTurn` |
| `convertToYahtzee` | Lucky Charm | 100 | Sets `pendingLuckyCharm`; next Yahtzee selection scores raw=50 (passes through modifier chain) | `!newRoll && yahtzeeUnscored && isPlayerTurn` |

**All five guard `!isOnlineMultiplayer`** — there's no inventory sync protocol yet.

### gameStore.useConsumable dispatch

`gameStore.useConsumable(id, ctx?: { category?: Categories }) → boolean`:
- Refuses early on `OnlineMultiPlayer`.
- Branches per id; calls `playerProfileStore.useConsumableFromInventory(id)` **only on a valid effect path** so a no-op doesn't drain inventory.
- `reCycleLooping` uses a **two-tap UI flow**: tap the consumable → `GameBoard.vue` sets `reCycleTargeting.value = true` → next category tap routes through `handleSelectCategory`, which calls `useConsumable('reCycleLooping', { category })` instead of normal selection. Modifier's `skipToNext({ emit })` fires + emits `loopingCategory:cycle` for the UI animation.
- `convertToYahtzee` sets `gameStore.pendingLuckyCharm`; `applySelectCategory` checks the flag on a Yahtzee selection and substitutes `rawScore = 50` before the modifier chain.

### Game flow hooks summarised

- **`gameStore.applySelectCategory`** — bumps transient `yahtzeesThisGame` / `bonusTurnsThisGame` counters; substitutes raw=50 if `pendingLuckyCharm` is set on a Yahtzee pick.
- **`gameStore.endGame`** — builds `GameSummary` (mode, variant, totalScore, won, levelId+number+stars, dailyDateKey+streakAfter, presentKinds, engagedKinds, yahtzees, bonus turns), calls `playerProfileStore.recordGameComplete`. Online-MP is skipped (profile is single-device).
- **`gameStore.recordAdventureWin`** — after updating bestStars, checks if every level in the world is now 3⭐ and calls `playerProfileStore.recordThreeStarWorld(worldId)`.

### Migration sentinels

Both `playerProfile` and `puzzleDaily` carry `version: 1`. Loaders pass missing fields through an emptyProfile/defaultProgress merge so future shape changes don't wedge users on a stale entry. When the schema bumps, write a `migrateProfile(parsed, parsed.version)` step and bump the version.

### Future-server posture

The profile and daily shapes are designed to round-trip to a future backend (leaderboards, matchmaking, cross-device sync) without reshaping. Don't embed client-only derived fields. `playerProfileStore` would gain a `syncToServer()` action + conflict policy when the API lands; nothing in the current code bakes in "local only" outside the load/save layer.

---

### Capacitor / native / PWA

`capacitor.config.ts` sets `webDir: 'dist'` and `appId: com.yahtzeegame.app`. `main.ts` waits for `deviceready` before mounting Vue when running on a native platform (otherwise mounts immediately). `vite.config.ts` uses `base: './'` (relative paths) so the built bundle works inside the Capacitor WebView and as a PWA. The service worker is in `public/service-worker.js`.

## Known rough edges

- `Categories.TopBonus` is modeled as a scorecard entry rather than derived; the upper-section bonus is auto-computed in `getTotalScore()` / `isUpperSectionBonusAchieved()` but the UI still renders a dedicated cell for it.
- **Puzzle engine reactivity gotcha.** `PuzzleEngine` lives inside Pinia state, so each modifier comes back as a Vue Proxy when iterated. `ctx.removeModifier` therefore matches by `(kind, category)` rather than reference equality — a `===` check on a proxied modifier vs. the raw underlying object would always fail. Same shape in `ctx.relocateModifier`. **Don't introduce reference-based comparisons in modifier code.**
- **Engine state changes don't trigger Vue re-renders directly.** Mutations like `engine.modifiers = filter(...)` go to the raw underlying object and bypass Pinia's proxy `trigger`. The UI relies on the scorecard mutation (which IS reactive) that happens alongside every engine change. As a result, things like `pendingBonusCategory` MUST be read as a plain function call from the template, not a `computed()`, or the computed caches the initial `null` forever. See `GameBoard.vue` where `pendingBonusCategory()`, `puzzleGoals()`, etc. are explicitly functions.
- **Puzzle Mode is single-player only in OnlineMultiPlayer-land.** `gameStore.initializeGame` coerces the variant back to Rainbow whenever `mode === OnlineMultiPlayer`. Local multiplayer + Puzzle is allowed (that's how vs-AI works). Online Puzzle would require a per-player engine sync protocol — see `docs/puzzle-mode-next.md` Option D.
- **AI is greedy + ice/cycle-aware only.** The `GreedyStrategy` respects `canScore` (skips ice-blocked cells) and substitutes the active cycle category when evaluating `loopingCategory` slots, but still doesn't strategically value multiplier cells, defuse armed Hot Potatoes, or time Looping Multipliers. The AI plays decently but won't impress. See `docs/puzzle-mode-next.md` Option A.
- **`vite.config.ts` `server.allowedHosts`** lists `web` (the docker-network hostname) so the playwright sidecar can reach `http://web:5173`. If you rename the compose service, update this list too or Vite will return a host-check 403.
- **Playwright runs via docker** (`mcr.microsoft.com/playwright:v1.60.0-noble`) — the host system likely lacks `libnspr4` and the dev container doesn't have sudo. `docker compose run --rm playwright npm run e2e` for tests; `docker compose run --rm playwright npm run e2e:screenshots` for screenshots. The named `playwright-modules` volume keeps debian-ABI `node_modules` separate from the alpine web-container ones.
