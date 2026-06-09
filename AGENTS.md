# AGENTS.md

## Project Overview

Rainbow Yahtzee is a Vue 3 + TypeScript dice game with classic Yahtzee rules plus color-based scoring (Color Full House, Color Yahtzee for Reds/Greens/Blues) and a single-player Puzzle Mode with modifier-based gameplay (ice blocks, multipliers, hot potato, looping categories, etc.). Supports single player, local multiplayer, online multiplayer (host/client over WebRTC via PeerJS), vs-AI "Dice Master" variant for puzzle mode, and Daily Puzzle seeded for worldwide consistency. Includes persistent player profile (XP, level, stats, achievements, coin balance) and a coin shop with 5 consumables.

## Repository Structure

```
src/
├── components/                # Vue components
├── enums/                     # GameMode and GameVariant enums
├── config/                    # Scorecard templates
├── puzzle/                    # Puzzle mode engine and modifiers
├── profile/                   # Player profile logic (XP, achievements, rewards, consumables)
├── stores/                    # Pinia stores (gameStore, peerStore, playerProfileStore)
├── utils/                     # Utility functions (animations, synth SFX, random number generation)
└── styles/                    # CSS styles and themes
```

## Development Commands

```bash
npm run dev        # Vite dev server (port 3000)
npm run build      # Production build → dist/
npm run preview    # Preview built bundle
npm run android    # build + cap sync + open Android Studio
npm run ios        # build + cap sync + open Xcode
npm test           # Jest test suite
npx jest path/to/file.test.ts         # Run a single test file
npx jest -t "should calculate score"  # Run tests matching a name
```

## Docker Dev Environment Setup

This project plugs into the shared infra at `~/projects/infra/` (Caddy reverse proxy + `dev-network`).

```bash
docker compose up -d        # Starts yahtzee-game-web (node:20-alpine, npm install + vite)
docker compose logs -f web  # Tail Vite logs
docker compose down
```

- Direct: http://localhost:5173
- Via shared Caddy: http://yahtzee.localhost:8080 (route in `~/projects/infra/docker/proxy/Caddyfile`)
- Compose overrides `vite.config.ts` `port: 3000` via CLI args (`--host 0.0.0.0 --port 5173`). The `open: true` in vite.config produces a harmless `xdg-open ENOENT` log in the container — ignore.

## Coding Conventions

- Use TypeScript for type safety
- Follow Vue 3 + Pinia architecture patterns
- Maintain reactive updates through Pinia store mutations  
- Implement scoring strategies in `src/strategies/` directory
- Add new categories by updating `Categories.ts` and wiring into `CalculateScore.ts`
- Implement Puzzle modifiers in `src/puzzle/modifiers/`
- Use existing components for consistency

## Testing and Quality Checks

- Run tests with `npm test` or specific file testing with `npx jest`
- Ensure all game rules are properly implemented
- Verify puzzle modifier behaviors work correctly
- Test multiplayer synchronization logic
- Validate scoring calculations (standard and color-based)
- Check that puzzle mode modifiers apply correctly  

## Safety Rules

- Never modify files in `.git/` or other version control directories
- Preserve existing file formats and syntax patterns
- Don't break existing functionality when adding new features
- Maintain backwards compatibility for API endpoints if applicable
- Ensure determinism in daily puzzle mechanics (don't use `Math.random()`)
- Respect online multiplayer game state restrictions

## Agent Workflow

1. Analyze project requirements from documentation
2. Explore codebase structure using file search tools
3. Read relevant files before making changes 
4. Implement functionality using appropriate layers:
   - Components for UI logic
   - Stores for state management  
   - Utilities for business logic
   - Puzzle engine for game mechanics
5. Write tests for new functionality
6. Run all relevant tests to verify changes work correctly

## Files/Directories to Avoid Editing

- `.git/` and version control files
- `dist/` directory (built output)
- Auto-generated files
- Test directories unless adding new tests 
- Docker configuration files (`docker-compose.yml`, etc.)
- `package-lock.json` and other dependency files

## Known Rough Edges/Gotchas

- `Categories.TopBonus` is modeled as a scorecard entry rather than derived; the upper-section bonus is auto-computed in `getTotalScore()` / `isUpperSectionBonusAchieved()` but the UI still renders a dedicated cell for it.
- **Puzzle engine reactivity gotcha.** `PuzzleEngine` lives inside Pinia state, so each modifier comes back as a Vue Proxy when iterated. `ctx.removeModifier` therefore matches by `(kind, category)` rather than reference equality — a `===` check on a proxied modifier vs. the raw underlying object would always fail. Same shape in `ctx.relocateModifier`. **Don't introduce reference-based comparisons in modifier code.**
- **Engine state changes don't trigger Vue re-renders directly.** Mutations like `engine.modifiers = filter(...)` go to the raw underlying object and bypass Pinia's proxy `trigger`. The UI relies on the scorecard mutation (which IS reactive) that happens alongside every engine change. As a result, things like `pendingBonusCategory` MUST be read as a plain function call from the template, not a `computed()`, or the computed caches the initial `null` forever. See `GameBoard.vue` where `pendingBonusCategory()`, `puzzleGoals()`, etc. are explicitly functions.
- **Puzzle Mode is single-player only in OnlineMultiPlayer-land.** `gameStore.initializeGame` coerces the variant back to Rainbow whenever `mode === OnlineMultiPlayer`. Local multiplayer + Puzzle is allowed (that's how vs-AI works). Online Puzzle would require a per-player engine sync protocol — see `docs/puzzle-mode-next.md` Option D.
- **AI is greedy + ice/cycle-aware only.** The `GreedyStrategy` respects `canScore` (skips ice-blocked cells) and substitutes the active cycle category when evaluating `loopingCategory` slots, but still doesn't strategically value multiplier cells, defuse armed Hot Potatoes, or time Looping Multipliers. The AI plays decently but won't impress. See `docs/puzzle-mode-next.md` Option A.
- **`vite.config.ts` `server.allowedHosts`** lists `web` (the docker-network hostname) so the playwright sidecar can reach `http://web:5173`. If you rename the compose service, update this list too or Vite will return a host-check 403.
- **Playwright runs via docker** (`mcr.microsoft.com/playwright:v1.60.0-noble`) — the host system likely lacks `libnspr4` and the dev container doesn't have sudo. `docker compose run --rm playwright npm run e2e` for tests; `docker compose run --rm playwright npm run e2e:screenshots` for screenshots. The named `playwright-modules` volume keeps debian-ABI `node_modules` separate from the alpine web-container ones.

## Capacitor/PWA Notes

- `capacitor.config.ts` sets `webDir: 'dist'` and `appId: com.yahtzeegame.app`. 
- `main.ts` waits for `deviceready` before mounting Vue when running on a native platform (otherwise mounts immediately).
- `vite.config.ts` uses `base: './'` (relative paths) so the built bundle works inside the Capacitor WebView and as a PWA.
- The service worker is in `public/service-worker.js`.
- First-time Capacitor setup (per README): `npm i @capacitor/android @capacitor/ios`, `brew install cocoapods`, then `npx cap add android` / `npx cap add ios`.

## Critical Warnings

- Never modify files outside of the project root, especially `.git`, `dist`, and auto-generated files.
- When working with puzzle engine code, remember that modifiers are Vue proxies when accessed via the engine, so use `(kind, category)` matching for `removeModifier`/`relocateModifier`.
- Don't break existing functionality in single-player modes when modifying multiplayer logic or vice versa.
- The daily puzzle mechanics depend on deterministic random number generation using mulberry32 and FNV-1a hash functions to ensure same experience worldwide.
- Be cautious with UI updates in engine lifecycle events — direct mutations of engine state bypass Pinia's reactive system, so ensure related scorecard updates are also made.

## MCP Tools
- When looking up Vue 3, Pinia, Vite, or TypeScript docs use context7 automatically
- After any MCP tool call, display full results before proceeding
- Use memory tool to store findings, prefix all entities with "yahtzee-app:"
- When starting a new session, load the project-audit skill to check current state
