# Puzzle Mode — Next Phase Options

This doc is a menu of candidate next phases for the puzzle-mode feature branch. Each option is scoped enough that a fresh Claude session can pick one and execute without prior context.

## Where we are

Branch `feature/puzzle-mode` is pushed to `origin/feature/puzzle-mode` (PR not yet opened).

**Shipped so far:**
- **Variant refactor.** `GameVariant` enum (`Rainbow` | `Puzzle`) plumbed through the engine. `DiceManager` takes `{ assignColor }`. `ScoreManager.initializeScorecard()` takes a template. `getScorecardTemplate(variant)` returns `RAINBOW_TEMPLATE` (17 cats) or `PUZZLE_TEMPLATE` (13 cats).
- **PuzzleEngine** (`src/puzzle/PuzzleEngine.ts`). Hooks: `canScore`, `applyScore` (score transform), `afterScore`, `onTurnEnd`, `getResult`. Tracks present + engaged modifier kinds, target score, required engagement count, pending bonus turn.
- **Per-player engines.** `game.puzzleEngines[]`, one per player; each closure captures a fixed player index so writes always land on the right scorecard. `getPuzzleEngine(idx = currentPlayer)` for the rest of the code.
- **Six modifiers** (`src/puzzle/modifiers/*`): IceBlock, FlyingMultiplier, DoubleCategory, HotPotato, MultiplierBubble, LoopingMultiplier. Each implements `PuzzleModifier`; effect-based engagement marking.
- **Random Puzzle.** 10 hand-tuned variant configs in `src/puzzle/configs/variants.ts`. Picked at random in `gameStore.initializeGame` when variant === Puzzle and no override is passed.
- **Adventure Mode.** 34 hand-authored levels in 6 themed worlds (`src/puzzle/levels/definitions.ts`). Per-level persistence in `localStorage` under `puzzleAdventureProgress`: `{ highestUnlocked, bestScores, bestStars }`. Pure progression rules in `src/puzzle/levels/progression.ts` (`applyWinToProgress`, `computeStars`).
- **Star ratings.** 1⭐ at target, 2⭐ at +25%, 3⭐ at +50%.
- **vs-AI Dice Master.** New menu entry under Single Player → Puzzle. MultiPlayer + Puzzle (`[local, ai]` seats). Same placements, independent state per player. `GreedyStrategy` now respects `canScore` so the AI never burns turns on ice-blocked cells.
- **UI.** `GameMode.vue` sub-menu (Classic Rainbow / Puzzle—Random / Puzzle—Adventure / Puzzle vs. Dice Master). `LevelSelect.vue` with world-grouped, collapsible sections + star totals. `ModifierBadge.vue` with hover animation. `GameBoard.vue` goals panel + bonus-turn banner + collapsible help legend. `GameOver.vue` adventure/vs-AI banners with retry / next level / back-to-levels / main menu.

**71 tests, build clean** (`npm test` + `npm run build`).

**Architecture diagram update (versus original CLAUDE.md):**
```
YahtzeeGame
├── DiceManager (variant-aware: assignColor)
├── Player[]
│   └── ScoreManager (template-driven scorecard)
└── puzzleEngines: PuzzleEngine[]   ← one per player when variant === Puzzle
        ├── modifiers: PuzzleModifier[]
        ├── presentKinds / engagedKinds
        ├── pendingBonusCategory
        └── ctx → { removeModifier, addModifiers, relocateModifier,
                    pickRandomUnscored, requestBonusTurn, forceScore,
                    markEngaged, scoredCategories, template }
```

---

## Option A — Smarter Dice Master AI

**Why now.** The AI plays the puzzle but doesn't understand it strategically. It will happily roll a Yahtzee on a non-multiplier cell when there's a ×3 Looping Multiplier sitting on FullHouse. Hot Potato fuses run out under its nose. Making Dice Master a real opponent unlocks the head-to-head experience.

**Scope.**
1. Modifier-aware scoring inside `GreedyStrategy`:
   - When evaluating a category's score, multiply by Flying / Looping multiplier value if its modifier is on that cell.
   - Treat Double Category as roughly worth 2× its expected score (you'll get a bonus turn).
   - Treat Multiplier Bubble as worth (raw score + expected scatter value).
2. Priority overlays:
   - **Hot Potato armed with fuse ≤ 1:** highest priority — defuse this turn even if a better cell exists.
   - **Looping Multiplier at peak:** slight bonus to favor scoring on it now.
   - **Ice Block cleared by adjacent score:** small bonus for engagement progress when the target requires it.
3. Optional: difficulty levels (`Easy` = random valid pick, `Normal` = current greedy, `Hard` = modifier-aware). Add a difficulty selector in the vs-AI menu.

**Files.**
- `src/strategies/ai/GreedyStrategy.ts` — extend `scorePotentials` to apply modifier bonuses; add `findUrgent` for armed Hot Potato.
- New `src/strategies/ai/PuzzleAwareStrategy.ts` (optional split) or just extend Greedy in place.
- `src/components/GameMode.vue` — difficulty selector if doing difficulty levels.
- `src/stores/gameStore.ts` — pass selected difficulty into the AI controller.
- Tests: `src/strategies/ai/__tests__/GreedyStrategy.puzzle.test.ts` — add cases for "prefers multiplier cell over equal non-multiplier" and "defuses fuse-1 Hot Potato".

**Lift.** Medium. ~2-4 hours. Most work is heuristic tuning + test cases. No engine changes needed (engine already exposes everything via `getPuzzleEngine(idx)`).

**Verification.**
- Manual: play vs-AI on a Lightning or Bouncing variant. AI should chase multiplier cells.
- Manual: drop a Hot Potato level (Storm Front world). AI should defuse before fuse expires.
- Tests: 4-6 new cases asserting AI picks the right cell under specific modifier states.

---

## Option B — Polish: animations + sound  ✅ **SHIPPED (phase 7)**

Implemented as part of the broader mobile-first UI overhaul. Highlights:
- `PuzzleEngine` event bus (`on` / `emit` / typed `EngineEvent` union); each modifier emits lifecycle events from its hooks. Engine itself emits `engine:bonusTurn` (via `ctx.requestBonusTurn`) and `engine:goalMet` once per goal-kind crossing.
- Cell-anchored animations in `src/utils/cellAnimations.ts` resolved via `[data-category]` lookup: ice melt + fragments, flying-chip flight, bomb arm vignette + tick / defuse / expire (with screen shake), bubble pop ring + scatter chips, looping flip, score-breakdown popup (raw × mult = final) above the cell.
- Web Audio synth in `src/utils/synthSfx.ts` — zero asset cost. `playModifierSfx(kind)` covers `iceMelt`, `flyingWhoosh`, `bubblePop`, `bombTick`/`Arm`/`Defuse`/`Expire`, `loopChange`/`loopPeak`, `bonusTurn`, `goalChime`, `starWin`.
- `prefers-reduced-motion` honored across every new animation + the legacy Yahtzee / score-popup / confetti / emoji animations.
- Score-popup backdrop reinstated: `animations.ts` now spawns its own `#score-fx-backdrop` dimming layer (the old `.overlay` element was removed when the dropdown menus were rebuilt into the bottom sheet).
- 13 new PuzzleEngine event-bus tests (84 total).

The original scope notes are kept below for reference.

---

**Why now.** Mechanics are visible (badges + colors) but transitions are instant. A Flying Multiplier teleports to a new cell; ice doesn't melt; the bomb ticking down has no audio cue. Polishing the moment-to-moment feedback makes the puzzle feel alive without changing rules.

**Scope.**
1. **Flying Multiplier relocation animation.** When the chip moves at turn end, slide it from old cell → new cell over ~400ms. Existing badge positioning is `position: absolute; top: 2px; right: 2px;` within `.score-item`. Need a wrapper that animates between two `.score-item`s, or a transient overlay element that does the flight.
2. **Ice block melt.** When `removeModifier` fires for an iceBlock, run a melt animation (badge fades + maybe a "shatter" particle effect) before the cell goes back to its normal state.
3. **Hot Potato fuse pulse.** Faster pulse as fuse decreases (current pulse is fixed at 0.9s). Maybe a low "tick" sound on fuse decrement.
4. **Score animations with multiplier breakdown.** Today scoring on a Flying Multiplier shows the raw score animation (existing `showScoreAnimation`). Show "30 × 2 = 60" briefly so the player sees the breakdown.
5. **Sound effects on engagement.** A distinct sound per kind when engaged (ice crack, multiplier whoosh, double clone, bomb defuse, bubble pop, looping mult tick).
6. **Goal-met chime.** When the score crosses the target line or an engagement count is met, play a brief positive chime.

**Files.**
- `src/components/ModifierBadge.vue` — animated transitions; transient overlay for relocation.
- `src/components/GameBoard.vue` — coordinate animation triggers off engine events.
- `src/utils/animations.ts` — add `showScoreBreakdown(raw, mult, final, cat)` and `showMeltAnimation(cat)`.
- `src/enums/SoundEffects.ts` + audio files in `public/sounds/` — add new clips and entries.
- `src/puzzle/PuzzleEngine.ts` — consider emitting events the UI can listen for (currently UI polls state in re-renders). A small EventEmitter or a Vue ref-based event bus would make animation triggers cleaner.

**Lift.** Medium-large. ~4-6 hours. Animation timing + audio production is fiddly. Could ship in pieces (just the relocation animation first, then ice melt, then sounds).

**Verification.**
- Manual on every modifier kind in turn. Watch a full Adventure level top-to-bottom.
- `prefers-reduced-motion` honored on all new animations.
- No sound when `gameStore.sfxEnabled` is false.

---

## Option C — Looping Categories modifier + Daily Puzzle

**Why now.** Looping Categories is the one Dice World modifier we skipped because it requires the modifier to *change which scoring rule applies* to a slot. Adding it completes the modifier set. Daily Puzzle (seeded by date) gives players a reason to come back without needing a leaderboard backend.

**Scope.**

### C.1 — Looping Categories modifier

The slot's "active category" cycles through a fixed list each turn end. Player scores the slot; the score is computed using whichever category is currently active. Visible cue: small green up-arrow + the active category label.

Implementation notes:
- The modifier owns a `slotCategory: Categories` (the scorecard slot it sits on, used for selection/locking) and a `cycle: Categories[]` (the categories to rotate through) plus a `currentIndex`.
- When the player scores the slot, `transformScore(category, rawScore)` is the wrong hook — we need to *recompute* the score as if scoring `cycle[currentIndex]`. This requires access to `dice`. Option: add a new `overrideScore?(category, dice) => number | null` hook, or have the modifier compute its own score via `useCalculateScore(cycle[idx], dice)` inside `transformScore` (it'd need the dice passed in too — add to ctx).
- Engagement: count when the slot is scored AND `cycle[currentIndex]` was a "non-default" category (i.e., not equal to slotCategory). That way merely scoring at the default doesn't count.

### C.2 — Daily Puzzle

A once-per-day random puzzle, seeded so every player worldwide gets the same puzzle on a given UTC date. Records personal best + streak.

Implementation notes:
- New `src/puzzle/configs/DailyPuzzleConfig.ts` — takes a date, derives a deterministic seed (e.g., hash of `YYYY-MM-DD`), picks a variant config + modifier placements from the seed.
- Use a seeded RNG (small helper, mulberry32 or similar) instead of `Math.random()` in the variant builders. Pass the RNG down through `pickIceBlockPositions` and friends.
- New `src/stores/gameStore.ts` action `startDailyPuzzle()`. Persists `{ lastPlayedDate, bestScore, streak }` in localStorage under `puzzleDaily`.
- Menu entry under Single Player → Puzzle → "Daily Puzzle". Tile shows the current date and previous days' results (3-day history strip).
- GameOver banner: "Daily Puzzle — 2026-05-28" with streak count.

**Files.**
- `src/puzzle/modifiers/LoopingCategoryModifier.ts` — new.
- `src/puzzle/PuzzleEngine.ts` + `src/puzzle/types.ts` — `overrideScore` hook or pass dice through `transformScore`.
- `src/puzzle/configs/variants.ts` — add `loopingCategoryCount` (sparing — interesting but complex).
- `src/puzzle/configs/DailyPuzzleConfig.ts` — new.
- `src/util/seededRandom.ts` — new (mulberry32).
- `src/stores/gameStore.ts` — daily-puzzle state + action.
- `src/components/GameMode.vue` — Daily Puzzle button.
- `src/components/GameBoard.vue` + `LevelSelect.vue` — display active looping category, daily history.
- Tests: looping category cycle correctness, seeded daily puzzle determinism.

**Lift.** Large. ~6-10 hours. Looping Categories alone is non-trivial; Daily Puzzle is moderate. Could split into two phases.

**Verification.**
- Looping Categories: score a slot mid-cycle; verify the score matches the current category, not the slot's original.
- Daily Puzzle: load on two devices on the same UTC date; placements match exactly.
- Daily Puzzle: roll the clock forward; today's puzzle changes, yesterday's appears in history.

---

## Option D — Online Puzzle vs. Friend

**Why now.** Puzzle is currently single-player or vs local AI. The online flow exists for Rainbow only because per-player engine state would need a sync protocol. Adding online Puzzle would make Dice Master playable against a real friend.

**Scope.**

1. **Engine sync.** Each side maintains its own `puzzleEngines[]`. Host is authoritative — its engines are the truth. Host broadcasts `puzzleState` snapshots (per-player modifier list + engaged kinds + pending bonus) alongside the existing `gameState`. Client applies them.
2. **Action replay.** Existing online flow already routes actions (rollDice, holdDice, selectCategory) through the host. Add: host runs the puzzle engine hooks during `applySelectCategory`, then includes the resulting engine state in the broadcast.
3. **Initial config sync.** When host starts an online Puzzle game, the random `PuzzleConfig` it picks must be sent to the client so both seed engines identically. A small `puzzleStart` message with the config ID + seed (if we have seeded variants by then) does it.
4. **Variant guard.** Remove the `OnlineMultiPlayer ? GameVariant.Rainbow : variant` coercion in `gameStore.initializeGame` once sync works.
5. **UI.** New menu entry under Online Multi-Player: "Puzzle Mode" toggle. Both sides see the same modifier placements. Each sees their own engine state; the opponent's score is shown at the top (already works for multiplayer).

**Files.**
- `src/stores/peerStore.ts` — new message types `puzzleConfig`, `puzzleState`.
- `src/stores/gameStore.ts` — `sendGameState` includes puzzle data; `handleIncomingData` applies `puzzleConfig` (client) and integrates `puzzleState` into the per-player engines.
- `src/puzzle/PuzzleEngine.ts` — `serialize()` / `applySerializedState(state)` for wire format (modifier kind+category+state, engagedKinds, pendingBonusCategory).
- Each modifier — serialize/deserialize own state (e.g., `HotPotato.activated`, `fuseRemaining`).
- `src/components/GameMode.vue` — online puzzle toggle.
- Tests: round-trip serialize, host/client engine convergence after an action sequence.

**Lift.** Largest. ~8-12 hours. Serialization is straightforward but tedious (every modifier kind), and sync edge cases (resync mid-bonus-turn, mid-fuse) need careful thought. The existing online flow is host-authoritative which simplifies things — but bring the modifier-aware paths through the same boundary.

**Verification.**
- Two browser tabs (host + client). Both pick Puzzle. Confirm both see identical placements at game start.
- Host scores; engine update appears on client (badges disappear, fuses tick).
- Client scores; host applies and re-broadcasts; both sides converge.
- Manual resync mid-game; convergence preserved.

---

## How to pick

Each option is largely independent of the others — they can be done in any order. Rough heuristic:
- **Want the AI mode to feel real?** → A (Smarter Dice Master).
- **Want the existing experience to feel polished?** → B (Polish).
- **Want more content + retention hook?** → C (Looping Categories + Daily).
- **Want online play?** → D (Online Puzzle).

Recommended order if shipping all four: **A → B → C → D.** A unlocks the vs-AI mode's full value. B is a quality-of-life pass that benefits everything later. C extends gameplay. D is the largest lift and benefits from everything else being polished first.
