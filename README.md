# 🎲 Rainbow Yahtzee!

Rainbow Yahtzee is a Vue 3 + TypeScript dice game with classic Yahtzee rules plus color-based scoring, a modifier-based **Puzzle Mode** with **7 modifier kinds**, a **38-level Adventure** campaign across 7 themed worlds, a **vs-AI Dice Master** variant, a **once-per-UTC-date Daily Puzzle** seeded so every player worldwide shares the same board, a persistent **player profile** (XP, level, 12 achievements, coin balance), a **coin shop** of 5 consumables, and **local + online multiplayer**. Wraps as native Android / iOS apps via Capacitor and runs as an installable PWA.

---

## 📖 Table of Contents

1. [Features](#-features)
2. [Game Modes](#-game-modes)
3. [Rules](#-rules)
4. [Getting Started](#-getting-started)
5. [Building for Android](#-building-for-android)
6. [Building for iOS](#-building-for-ios)
7. [How to Play](#-how-to-play)
8. [Project Structure](#-project-structure)
9. [Contributing](#-contributing)
10. [License](#-license)
11. [Acknowledgments](#-acknowledgments)

---

## 🌈 Features

- **Classic Yahtzee** — Ones through Sixes, 3-of-a-kind, 4-of-a-kind, Full House, Small / Large Straight, Chance, Yahtzee.
- **Rainbow scoring twist** — dice carry colors (red / green / blue); **Color Full House** (3 + 2 by color) and **Blues / Reds / Greens** (color-Yahtzees) layer on top of the classic categories.
- **Puzzle Mode** — uncolored dice on a scorecard sprinkled with 7 modifier kinds:
  - 🧊 **Ice Block** — locks a cell until an adjacent row scores
  - ×2 **Flying Multiplier** — doubles its cell, then hops to another open cell
  - **Looping Multiplier** — value triangle-waves each turn (×1 → ×N → ×1)
  - 🌀 **Multiplier Bubble** — pops into 3 random Flying Multipliers
  - 🔁 **Double Category** — scoring it grants a bonus turn that sums on top
  - 💣 **Hot Potato** — arms after first score; defuse it before the fuse runs out
  - 🔄 **Looping Category** — slot scores as a different category each turn, cycling through an author-defined list
- **Puzzle — Adventure** — 38 hand-tuned levels across 7 themed worlds (Beginnings, Frostlands, Echo Chamber, Storm Front, Storm Surge, Finale, Cycles) with sequential unlocks, persisted best score, and 1–3 star ratings.
- **Puzzle — Random** — 10 hand-tuned random-placement puzzles for one-off challenges.
- **Daily Puzzle** — once-per-UTC-date deterministic puzzle that every player worldwide sees identically. Tracks current streak, longest streak, best score, and a 30-day history (last 7 days surfaced in the menu).
- **vs-AI Dice Master** — 2-player Puzzle against a greedy AI that respects modifiers (and swaps in the active cycle category for Looping Category slots).
- **Player Profile** — persisted XP / level / 12 achievements (e.g. First Win, Yahtzee Hunter, 7-day Streak, Modifier Master) / lifetime stats. Quadratic XP curve. Profile tab in the bottom-sheet menu shows progress + locked-vs-unlocked achievement grid.
- **Coin Shop + 5 consumables** — earn coins from wins, level-ups, achievements, and daily streaks. Spend them on **Extra Roll** (30c), **Fresh Re-Roll** (50c), **Score Sense** (25c — highlights the best cell), **Re-Cycle** (40c — bump a Looping Category slot), and **Lucky Charm** (100c — your next Yahtzee selection is treated as a Yahtzee).
- **Online multiplayer** — host / client over WebRTC (PeerJS), reconnect on tab refocus, in-game chat + emojis.
- **Local multiplayer** — up to 4 players sharing a device.
- **Native apps via Capacitor** — Android + iOS, plus installable PWA.
- **Mobile-first UI** — themed gradients per mode / world (incl. a teal/emerald Cycles atmosphere), 3D pip cubes, cell-anchored animations, Web Audio-synthesized SFX for every modifier event.

---

## 🎮 Game Modes

| Mode | Players | Variant | Notes |
|---|---|---|---|
| Single Player — Classic Rainbow | 1 | Rainbow | 17-slot scorecard with color categories |
| Single Player — Puzzle (Random) | 1 | Puzzle | One of 10 random variants per game |
| Single Player — Puzzle (Adventure) | 1 | Puzzle | 38 levels, 7 worlds, persistent progress + 1–3 star ratings |
| Single Player — Puzzle vs. Dice Master | 1 vs AI | Puzzle | Same placements, independent modifier state |
| Single Player — Daily Puzzle | 1 | Puzzle | Deterministic; same board worldwide; tracks streak |
| Local Multiplayer | 2–4 local | Rainbow | Share one device |
| Online Multiplayer | 1 host + 1 client | Rainbow | WebRTC P2P via room code |

---

## 📜 Rules

Classic Yahtzee rules apply across all modes:

- Roll five dice up to three times per turn; hold any subset between rolls.
- Score the roll into one of the open categories on your card; each category can be scored once.
- **Top Bonus** — +35 points if your Ones-through-Sixes total is ≥ 63.

### Rainbow extras

- **Color Full House** — 3 dice of one color + 2 of another (numbers ignored).
- **Blues / Reds / Greens** — all 5 dice sharing that color.

### Puzzle extras

- Win when **score ≥ target** AND you've **engaged ≥ the required number of distinct modifier kinds**.
- "Engagement" rules vary per modifier — see the collapsible legend inside the in-game goals panel.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or newer (Vite 6 requirement)
- npm (bundled with Node)
- Git

### Clone + install

```bash
git clone git@github.com:jzfloridaman/yahtzee-game.git
cd yahtzee-game/yahtzee-game    # the project lives in a nested directory
npm install
```

> **Heads-up — the project lives in a nested `yahtzee-game/yahtzee-game/` directory** (the repo root contains only that one subdirectory). Run all commands from the inner directory.

### Run the dev server

```bash
npm run dev      # Vite at http://localhost:3000
```

Other day-to-day commands:

```bash
npm run build       # production build → dist/
npm run preview     # serve the built bundle
npm test            # Jest unit tests
npx jest src/puzzle/modifiers/__tests__/HotPotatoModifier.test.ts   # single file
npx jest -t "should calculate score"                                # match by name
```

### Docker dev environment (optional)

A `docker-compose.yml` plugs into the shared infra at `~/projects/infra/` (Caddy reverse proxy + `dev-network`):

```bash
docker compose up -d            # node:20-alpine, runs npm install + vite
docker compose logs -f web
docker compose down
```

- Direct: <http://localhost:5173>
- Via shared Caddy: <http://yahtzee.localhost:8080>

> **Heads-up — `node_modules/` installed inside Docker is owned by `root` and will break the host-side Android Gradle build.** If you intend to build APKs locally, either:
> - install on the host (`npm install` outside Docker), or
> - `sudo chown -R $USER:$USER node_modules` before running Gradle.

---

## 📱 Building for Android

The Capacitor flow assumes Android Studio. The steps below build a **debug APK from the terminal only** — works in WSL2 / Linux without Android Studio installed.

### One-time host setup

```bash
# 1. JDK 21 (or 17 — both work with AGP 8.7+)
sudo apt install -y openjdk-21-jdk unzip curl

# 2. Android command-line tools
#    grab the current zip URL from https://developer.android.com/studio#command-tools
mkdir -p ~/Android/Sdk/cmdline-tools
cd /tmp
curl -L -o cmdline-tools.zip \
  "https://dl.google.com/android/repository/commandlinetools-linux-14742923_latest.zip"
unzip cmdline-tools.zip
mv cmdline-tools ~/Android/Sdk/cmdline-tools/latest   # MUST be named "latest"

# 3. Env vars — append to ~/.zshrc (or ~/.bashrc)
cat >> ~/.zshrc << 'EOF'
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
EOF
source ~/.zshrc

# 4. SDK packages (matched to android/variables.gradle)
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

### Per-build

```bash
npm run build                              # Vite → dist/
npx cap sync android                       # copies dist/ + plugins into android/
(cd android && ./gradlew assembleDebug)    # → android/app/build/outputs/apk/debug/app-debug.apk
```

The first `assembleDebug` takes ~45 s (Gradle downloads dependencies into `~/.gradle/caches`); subsequent builds are ~10–15 s while the Gradle daemon stays warm.

> If Gradle errors with `SDK location not found`, drop a one-line `android/local.properties` (it's gitignored):
> ```
> sdk.dir=/home/<you>/Android/Sdk
> ```

### Sideloading to your phone

**Easy path (any OS, any setup):** copy `app-debug.apk` to your phone via USB, Google Drive, Telegram-to-self, etc., then tap to install. Allow "Install unknown apps" for your chosen file manager once.

**adb over Wi-Fi (if you want re-installs in one command):**

1. On the phone: Settings → About phone → tap **Build number** 7× → Settings → System → Developer options → enable **Wireless debugging**.
2. Tap **Pair device with pairing code** to get an IP:port and 6-digit code.
3. From the terminal:
   ```bash
   adb pair <ip>:<pair-port> <code>
   adb connect <ip>:<connect-port>             # connect-port is on the previous screen
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

> **Known WSL2 caveat:** under WSL2 the `adb pair` TLS handshake sometimes hangs even though TCP connects (Windows Defender Firewall interaction). If you hit this, use the file-copy path or [`usbipd-win`](https://learn.microsoft.com/windows/wsl/connect-usb) for USB passthrough.

---

## 🍏 Building for iOS

Capacitor iOS is wired up but requires macOS + Xcode + CocoaPods:

```bash
brew install cocoapods
npm install
npx cap sync ios
npm run ios      # build + cap sync + open Xcode
```

From Xcode, pick your team / signing identity and run on a simulator or attached device.

---

## 🎮 How to Play

### Classic Rainbow

1. Pick **Single Player → Classic Rainbow** (or **Multiplayer** for 2–4 local).
2. Tap **Roll Dice** (up to 3 times per turn). Tap a die to hold it between rolls.
3. Tap a category to score the current dice into it.
4. The game ends when every category is filled. Highest total wins.

### Puzzle Mode

1. Pick **Single Player → Puzzle—Random** for a one-off, **Puzzle—Adventure** for the campaign, **Puzzle vs. Dice Master** for AI, or **Daily Puzzle** for the once-a-day shared challenge.
2. Watch the **goals panel** at the top of the scorecard — it shows the target score and which modifier kinds you need to engage.
3. Tap a cell's modifier badge to see what it does. The collapsible legend lives inside the goals panel.
4. You win when both gates are green: score ≥ target **and** engagement ≥ required count.
5. **Looping Category** slots show a small letter badge (e.g. `FH`, `Y`, `3K`) indicating the active scoring category for the current turn — the badge cycles at the end of each turn.

### Daily Puzzle

1. Pick **Single Player → Daily Puzzle**. The same board appears for every player on the same UTC date.
2. The streak badge (🔥) next to the menu entry shows your current consecutive-win streak.
3. Daily puzzles roll over at **midnight UTC**. A game in progress when the day flips still records against the date it started.

### Player Profile, Achievements & Shop

1. Open the hamburger menu and switch to the **Profile** tab.
2. The top shows your level, XP progress, and coin balance.
3. Below the lifetime stats grid you'll see the achievement gallery (12 achievements; 2 are hidden until unlocked).
4. The **Shop** at the bottom of the Profile tab sells 5 consumables — Extra Roll, Fresh Re-Roll, Score Sense, Re-Cycle, Lucky Charm.
5. Owned consumables appear as small circular buttons next to the Roll button mid-game (when they're usable). Re-Cycle is a two-tap action: tap the button, then tap the Looping Category slot you want to advance.
6. Coins come from game completions (puzzle wins, daily streaks, 3⭐ adventure clears), level-ups, and achievement unlocks. No real-money purchases.

### Online Multiplayer

1. Host: **Multiplayer → Online → Host** → share the 6-character room code.
2. Client: **Multiplayer → Online → Join** → paste the room code.
3. Turn order alternates; gameplay state is host-authoritative with auto-resync when the tab returns to the foreground.

---

## 📂 Project Structure

```
yahtzee-game/
├── android/                       # Capacitor Android project (Gradle)
├── ios/                           # Capacitor iOS project (Xcode + Cocoapods)
├── public/                        # Static assets, PWA manifest + service worker
├── docs/                          # Design docs (puzzle-mode-next.md, refactor-plan.md, ...)
├── scripts/                       # Build / release helpers
├── src/
│   ├── components/                # Vue 3 SFCs (GameBoard, LevelSelect, GameOver, ProfilePanel, ShopPanel, AchievementToast, ...)
│   ├── config/                    # Scorecard templates (RAINBOW_TEMPLATE, PUZZLE_TEMPLATE)
│   ├── controllers/               # PlayerController (Local / Remote / AI)
│   ├── enums/                     # Categories, GameState, GameMode, GameVariant
│   ├── interfaces/                # Shared TS interfaces
│   ├── managers/                  # DiceManager, ScoreManager
│   ├── models/                    # Player
│   ├── profile/                   # Pure account-state logic (xp, achievements, rewards, consumables)
│   ├── puzzle/
│   │   ├── PuzzleEngine.ts        # Engine + event bus + ctx.dice getter
│   │   ├── modifiers/             # IceBlock, FlyingMultiplier, HotPotato, LoopingCategory, ...
│   │   ├── configs/               # Random + level + daily config adapters
│   │   ├── daily/                 # DailyPuzzleProgress types + pure streak math
│   │   └── levels/                # 38 levels in 7 worlds, progression rules
│   ├── stores/                    # Pinia stores (gameStore, peerStore, playerProfileStore)
│   ├── strategies/                # Scoring strategies + AI (GreedyStrategy)
│   ├── styles/                    # Theme CSS variables, world atmospheres
│   ├── utils/                     # Animations, cell FX, Web Audio synth SFX, seeded RNG, UTC date helpers
│   ├── __tests__/                 # Jest unit tests
│   ├── game.ts                    # Engine entry point
│   └── main.ts                    # Vue / Capacitor bootstrap
├── tests/e2e/                     # Playwright (Docker-driven)
├── capacitor.config.ts
├── vite.config.ts
└── package.json
```

For a deeper architecture tour, see `CLAUDE.md`.

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Add tests for new logic (especially puzzle modifiers — see `src/puzzle/modifiers/__tests__/` for the pattern).
4. Open a pull request describing your changes.

`CLAUDE.md` is the best entry point for the codebase architecture; `docs/` collects active design discussions.

---

## 📜 License

This project is licensed under the MIT License.

---

## 💡 Acknowledgments

- Inspired by the classic Yahtzee game and **Dice World** (puzzle modifier inspiration).
- Dice + UI icons by Font Awesome.
- Web Audio SFX + 3D pip cubes built from scratch — no audio assets, no canvas.

---

Enjoy playing Rainbow Yahtzee! 🎲🌈
