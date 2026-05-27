# Refactor Plan — Player Controller + Sync + AI Mode

## Context

After merging `feature/online-multiplayer`, the action-dispatch code in `gameStore.ts` has the same three-way conditional smeared across every player action (`rollDice`, `holdDice`, `selectCategory`):

```ts
if (gameMode === OnlineMultiPlayer && peerStore.isHost) { … }
else if (gameMode === OnlineMultiPlayer)                { … }   // client
else                                                    { … }   // local
```

Each branch evolves independently. The result is divergent code paths, real desync bugs in online mode, and no clean place to plug in a computer player. The fix is to introduce a `PlayerController` abstraction so every player action flows through a single dispatch boundary, and each *kind* of player (local human, remote peer, AI) plugs in as a controller. After that, sync hardening and AI mode become well-scoped additions instead of more branches.

This plan is split into four phases. Phase 1 is a no-op refactor that ships independently (you can run the game on it and nothing should change). Phases 2–4 build on it.

## Problems we're fixing (concrete references)

| # | File:line | Issue |
|---|---|---|
| 1 | `src/stores/gameStore.ts:400` | Host sends `score: 1000` placeholder for client's floating-score animation. Real scorecard arrives in next `gameState` but the animated number is wrong. |
| 2 | `src/stores/gameStore.ts:393–411` vs `:165–197` | Two divergent code paths both write category-selection state (host UI action vs. host receiving client message). Easy place for drift. |
| 3 | `src/stores/gameStore.ts:144` | `//this.sendGameState();` commented out after host processes a `holdDice` from the client. Hold flag syncs only at the *next* roll. |
| 4 | `src/stores/peerStore.ts` (no auto-reconnect resync) | Manual resync button only. Tab suspends, reconnects, dropped messages → silent divergence. |
| 5 | `src/game.ts` `isGameOver()` | Side-effecting "check" — mutates the game-over flag while answering a question. Called from multiple paths. |

## Target architecture

Each `Player` owns a `controller: PlayerController`. The game asks `currentPlayer.controller` to produce actions; the controller doesn't matter to `gameStore`.

```
Player
 ├── name, isAI, scoreManager (existing)
 └── controller: PlayerController
        ├── LocalHumanController   → UI clicks fire actions
        ├── RemotePeerController   → host-side proxy for a remote client; peer messages fire actions
        └── AIController           → strategy decides; fires actions after a small "thinking" delay
```

`gameStore.rollDice()`, `holdDice()`, `selectCategory()` become one-liners that forward to `game.currentPlayer.controller`. The controller is responsible for whatever bookkeeping its kind needs (broadcasting state, awaiting an AI delay, etc.).

---

## Phase 1 — Controller scaffolding (no behavior change)

**Ship boundary**: this phase is a pure refactor. Existing single-player, local multi-player, and online multi-player all behave identically afterward. Tests pass. We commit and verify before moving to Phase 2.

### Files

| Path | Action |
|---|---|
| `src/controllers/PlayerController.ts` | new — interface |
| `src/controllers/LocalHumanController.ts` | new |
| `src/controllers/RemotePeerController.ts` | new |
| `src/controllers/AIController.ts` | new (stub — throws "not implemented") |
| `src/models/Player.ts` | add `controller: PlayerController` field; default to `LocalHumanController` |
| `src/game.ts` | `startNewGame(seats: SeatSpec[])` where `SeatSpec = { name, kind: 'local' | 'remote' | 'ai' }`; instantiate appropriate controller |
| `src/stores/gameStore.ts` | unchanged in P1 — controllers exist but actions still go through the old branched code |

### Verification

- `npm test` green.
- Manual: start single-player game, roll, hold, select category, complete game. Identical behavior.
- Manual: start local multi-player (2 players), play one full round. Identical behavior.
- Manual: start online multi-player (two browser tabs, share link). Identical behavior, including the existing `score: 1000` quirk and held-dice race (we don't fix those yet).
- `git diff` shows new controller files and a minimal addition to `Player`/`game.ts`. `gameStore.ts` is unchanged.

---

## Phase 2 — Migrate online multiplayer through controllers

**Ship boundary**: all three-way `if (OnlineMultiPlayer && host)` branches in `gameStore.ts` are deleted. Online mode uses controllers.

### What changes

- `gameStore.rollDice()` → `game.currentPlayer.controller.requestRoll()`. Same for `holdDice` and `selectCategory`.
- For each remote seat, host owns a `RemotePeerController`. Incoming peer messages (`rollDice`, `holdDice`, `selectCategory`) route to that seat's controller, which validates turn ownership and applies the action through the *same* code path a local player would use.
- Host's `RemotePeerController.requestX()` applies the action locally, then broadcasts the resulting `gameState`. **Single chokepoint** for state updates.
- Client uses `LocalHumanController` for its own input (controller wraps a "send to host" sendData call internally — client never mutates state directly; it sends a request and waits for `gameState`).

### Bugs that disappear by construction

- `score: 1000` placeholder is gone — when the host's controller applies a category selection, it computes the real score and broadcasts it. The client receives both the animation number and the authoritative scorecard from the same broadcast.
- The two divergent `selectCategory` paths collapse into one.
- The commented-out `sendGameState()` after `holdDice` is no longer needed — every controller action ends with a broadcast as part of its contract.

### Files

| Path | Action |
|---|---|
| `src/stores/gameStore.ts` | major simplification — all three-way branches removed; actions are one-liners |
| `src/stores/peerStore.ts` | `handleIncomingData` routes action messages to the relevant `RemotePeerController` |
| `src/controllers/RemotePeerController.ts` | filled in (was stub in P1) |
| `src/controllers/LocalHumanController.ts` | gains an optional "send-to-host" mode for online clients |

### Verification

- All P1 verifications still pass.
- Open two browser tabs (host + client via shared link). Play a full game.
  - Score animations show the correct number on both sides.
  - Held dice survive a hold-then-immediate-roll sequence on the client without desync.
  - Category selections from the client appear correctly on the host.
- Diff `gameStore.ts` — most `if (gameMode === OnlineMultiPlayer)` branches deleted.

---

## Phase 3 — Sync hardening

**Goal**: address the sync issues that survive the refactor.

### Changes

- **ACK protocol**: every `gameState` carries a sequence number. Client tracks the last received seq. If a request times out (~3s) without a `gameState` whose seq ≥ the expected one, client fires an automatic `resyncRequest`.
- **Auto-resync on reconnect**: `peerStore` listens for connection `close` and reopen. On reopen, client immediately sends `resyncRequest`.
- **Split `isGameOver`**: in `src/game.ts`, refactor into `checkGameOver()` (mutates) and `get isGameOver()` (pure read). Callers updated.
- **Resync sends all scorecards** (today it sends the full `gameState`, so this is already mostly covered — verify and remove the comment from `todo.md`).

### Verification

- Kill the client tab mid-game, reopen via the shared link → resync happens automatically, no manual button needed.
- Throttle network in browser devtools — recovery is visible in console logs, scorecards converge.
- `checkGameOver()` is called explicitly at the right boundaries (after each category selection); the `isGameOver` getter is read-only everywhere else.

---

## Phase 4 — Computer player mode

**Goal**: ship "Play vs Computer". Composition: flexible mix, up to 4 players. Difficulty: single greedy AI (v1).

### Changes

- `AIController` fills in the strategy. Decision logic per turn:
  1. Roll once.
  2. Score every available (not-yet-selected) category against the current dice. Pick the maximum.
  3. Decide what to hold for the next roll: keep dice that contribute to the highest-scoring achievable category given remaining rolls. Heuristic-based, no Monte Carlo.
  4. Repeat up to 2 more rolls (3 total) unless the current dice already exceed a satisfaction threshold (~80% of theoretical max for the chosen category).
  5. Call `requestCategory(bestCategory)`.
  6. Tiebreak: prefer the upper-section slot if it advances toward the +35 bonus; otherwise dump a zero into the lowest-value upper slot still open (e.g., `Ones`) rather than wasting `Chance`.
- "Thinking..." delay: 700ms between roll-decisions, 1200ms before category selection. Adjustable constant.
- `GameMode.vue` setup: when "Local Multi-Player" is chosen, show per-slot selectors (Human / AI), 1–4 slots. Default AI name: `Computer 1`, `Computer 2`, …
- Online + AI is out of scope for v1.

### Files

| Path | Action |
|---|---|
| `src/controllers/AIController.ts` | filled in |
| `src/strategies/ai/GreedyStrategy.ts` | new — decision logic |
| `src/components/GameMode.vue` | per-slot Human/AI selector |
| `src/stores/gameStore.ts` | `initializeGame` accepts seat specs |

### Verification

- 1 human + 1 AI: AI takes its turn, picks reasonable categories, game completes.
- 2 humans + 2 AI: AI turns interleave correctly.
- 4 AI watch-mode: game runs to completion with no human input; final scores are plausible (~150–250 each).
- Smoke: AI never throws when scorecard is mostly filled; gracefully picks the last category even if it scores zero.

---

## Open questions for later

- **Score animation deduplication**: today the animation is driven by a special-purpose `score` field on the peer message. After P2 this can be derived from the diff between consecutive `gameState` payloads — worth doing but not urgent.
- **AI difficulty levels**: greedy is the v1. Adding Easy (random) and Hard (look-ahead w/ upper-bonus and yahtzee-bonus probability) is a clean drop-in once the strategy interface exists.
- **AI in online games**: would require deciding where the AI "runs" — almost certainly host-side. Doable but UX questions about cheating perception. Defer.
- **`Categories.TopBonus` modeled as a scorecard entry**: long-standing rough edge; affects `isGameOver` logic. Worth folding into P3 if it comes up naturally.

## Reference: file inventory after Phase 4

```
src/
├── controllers/
│   ├── PlayerController.ts          # interface
│   ├── LocalHumanController.ts
│   ├── RemotePeerController.ts
│   └── AIController.ts
├── strategies/
│   ├── ai/
│   │   └── GreedyStrategy.ts        # AI decision logic
│   └── …scoring strategies (unchanged)
├── game.ts                          # startNewGame(seats: SeatSpec[])
├── models/Player.ts                 # gains `controller` field
└── stores/
    ├── gameStore.ts                 # action dispatch is one-liners
    └── peerStore.ts                 # routes incoming messages to controllers
```
