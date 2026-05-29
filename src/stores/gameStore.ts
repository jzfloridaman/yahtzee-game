import { defineStore } from 'pinia'
import { YahtzeeGame } from '../game'
import { GameMode } from '../enums/GameMode'
import { GameVariant } from '../enums/GameVariant'
import { pickRandomVariant } from '../puzzle/configs/variants'
import { LevelPuzzleConfig } from '../puzzle/configs/LevelPuzzleConfig'
import { DailyPuzzleConfig } from '../puzzle/configs/DailyPuzzleConfig'
import { getLevelByNumber, getLastLevelNumber, getLevelsByWorld } from '../puzzle/levels/definitions'
import { applyWinToProgress, computeStars } from '../puzzle/levels/progression'
import { applyDailyResult, loadDailyProgress } from '../puzzle/daily/dailyProgress'
import type { DailyPuzzleProgress } from '../puzzle/daily/types'
import { getDailyDateKey } from '../utils/dailyDate'
import type { PuzzleConfig } from '../puzzle/types'
import { SoundEffects } from '../enums/SoundEffects'
import { usePeerStore } from './peerStore'
import { usePlayerProfileStore } from './playerProfileStore'
import type { GameSummary } from '../profile/types'
import { Categories } from '../enums/Categories'
import type { SeatSpec, ControllerKind } from '../controllers'
import { GreedyStrategy } from '../strategies/ai/GreedyStrategy'

import { showYahtzeeAnimation, showEmojiAnimation } from '../utils/animations'
import { showScoreCellFlight, showScoreZeroChip } from '../utils/cellAnimations'

interface PlayerScore {
  playerNumber: number;
  score: number;
}

interface GameHistory {
  date: string;
  mode: GameMode;
  variant?: GameVariant;
  players: number;
  scores: PlayerScore[];
}

interface AdventureProgress {
  // Levels 1..highestUnlocked are playable. Starts at 1 (first level always
  // available). Bumps by 1 each time the current highest is cleared.
  highestUnlocked: number;
  // Persisted best total score per level. Used to show "★ Best: 245" tags
  // in the level select and to detect new personal records.
  bestScores: Record<string, number>;
  // Persisted best 1-3 star rating per level. Awarded by score margin
  // over the level's target.
  bestStars?: Record<string, number>;
}

const MAX_HISTORY_ITEMS = 10;
const ADVENTURE_STORAGE_KEY = 'puzzleAdventureProgress';
const DAILY_STORAGE_KEY = 'puzzleDaily';

// Online-MP turn timer (host-authoritative). The action phase resets to 30s
// on every roll; when it expires the player gets a 10s must-pick phase with
// rolling locked; when that expires the host auto-picks the best category.
const ACTION_PHASE_MS = 30_000;
const MUSTPICK_PHASE_MS = 10_000;
const TIMER_CHECK_MS = 250;
// The raw interval handle lives outside reactive Pinia state so the 4Hz
// expiry check doesn't churn reactivity. The reactive countdown the UI binds
// to is game.turnTimer.deadline, which only changes on phase transitions/resets.
let _turnTimerInterval: ReturnType<typeof setInterval> | null = null;
// Single strategy instance reused for timeout auto-picks.
const _timeoutStrategy = new GreedyStrategy();

function loadAdventureProgress(): AdventureProgress {
  try {
    const raw = localStorage.getItem(ADVENTURE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.highestUnlocked === 'number' && typeof parsed.bestScores === 'object') {
        return {
          highestUnlocked: Math.max(1, parsed.highestUnlocked),
          bestScores: parsed.bestScores ?? {},
          bestStars: parsed.bestStars ?? {},
        };
      }
    }
  } catch {
    // ignore parse errors — fall through to defaults
  }
  return { highestUnlocked: 1, bestScores: {}, bestStars: {} };
}

// Seat 0 is "the local player" for profile bookkeeping. Single-player
// Rainbow always counts as won (no losing condition). Multi-player
// Rainbow counts seat 0 as the winner only if they have the highest
// score outright (ties don't count). Typed structurally so this works
// against a Pinia-proxied YahtzeeGame instance.
type GameScoreSource = {
    getPlayerCount(): number;
    getPlayerScore(seat: number): number;
};
function isLocalPlayerRainbowWinner(game: GameScoreSource, seat: number): boolean {
    const count = game.getPlayerCount();
    if (count <= 1) return true;
    const seatScore = game.getPlayerScore(seat);
    let topScore = -Infinity;
    let topCount = 0;
    for (let i = 0; i < count; i++) {
        const s = game.getPlayerScore(i);
        if (s > topScore) { topScore = s; topCount = 1; }
        else if (s === topScore) topCount += 1;
    }
    return seatScore === topScore && topCount === 1;
}

export const useGameStore = defineStore('game', {
  state: () => ({
    // Game state
    game: null as YahtzeeGame | null,
    gameMode: null as GameMode | null,
    gameVariant: GameVariant.Rainbow as GameVariant,
    isGameActive: false,
    gameIsOver: false,

    // Audio settings
    bgmEnabled: localStorage.getItem('bgmEnabled') === 'true',
    sfxEnabled: localStorage.getItem('sfxEnabled') === 'true',
    playSoundEffect: null as ((effect: SoundEffects) => void) | null,

    // UI state
    showAudioSettings: false,
    showGameHistory: false,
    showGameOptions: false,

    // Game history
    gameHistory: JSON.parse(localStorage.getItem('gameHistory') || '[]') as GameHistory[],

    // Online sync diagnostics. Host increments broadcastSeq on every
    // gameState send; clients track lastReceivedSeq and warn on gaps.
    broadcastSeq: 0,
    lastReceivedSeq: -1,

    // Set when a roll is observed on the client (its own roll, or the host's
    // 'rollDice' hint) and consumed on the next gameState apply so the roll
    // animation fires on the freshly-synced dice values rather than being
    // clobbered by the incoming snapshot.
    pendingRollAnimation: false,

    // Adventure Mode — authored levels with progression. Persisted to
    // localStorage. `currentAdventureLevel` is set while playing an
    // Adventure level (null for Random Puzzle / Rainbow / multi).
    adventureProgress: loadAdventureProgress() as AdventureProgress,
    showAdventureMenu: false,
    currentAdventureLevel: null as number | null,

    // Daily Puzzle — once-per-UTC-date deterministic seed. Persisted to
    // localStorage under `puzzleDaily`. currentDailyDateKey is set when a
    // daily attempt starts and read by endGame so the recorder fires
    // exactly once per attempt.
    dailyProgress: loadDailyProgress(localStorage.getItem(DAILY_STORAGE_KEY)) as DailyPuzzleProgress,
    currentDailyDateKey: null as string | null,

    // Transient per-game counters fed into the GameSummary that
    // playerProfileStore.recordGameComplete consumes. Reset on every
    // initializeGame; never persisted.
    yahtzeesThisGame: 0,
    bonusTurnsThisGame: 0,

    // Lucky Charm consumable flag — set by useConsumable, consumed by
    // applySelectCategory on the next Yahtzee selection. Survives turn
    // boundaries until used.
    pendingLuckyCharm: false,
  }),

  getters: {
    currentGame: (state) => state.game,
    currentGameMode: (state) => state.gameMode,
    gameIsActive: (state) => state.isGameActive,
    audioSettings: (state) => ({
      bgmEnabled: state.bgmEnabled,
      sfxEnabled: state.sfxEnabled
    }),
    isOnlineHost(): boolean {
      return this.gameMode === GameMode.OnlineMultiPlayer && usePeerStore().isHost;
    },
    isOnlineClient(): boolean {
      return this.gameMode === GameMode.OnlineMultiPlayer && !usePeerStore().isHost;
    },
    // True when this device owns the seat whose turn it currently is. Always
    // true outside online MP. Gates the action dispatchers so a player can't
    // act on the opponent's turn.
    isLocalSeatActive(): boolean {
      if (this.gameMode !== GameMode.OnlineMultiPlayer) return true;
      if (!this.game) return false;
      return this.game.players[this.game.currentPlayer]?.controller.kind === 'local';
    },
  },

  actions: {
    // -- Initialization --

    buildSeatSpecs(playerCount: number): SeatSpec[] {
      if (this.gameMode === GameMode.OnlineMultiPlayer) {
        // Host is always seat 0, client always seat 1. Each side sees its
        // own seat as 'local' and the other side as 'remote'.
        const isHost = usePeerStore().isHost;
        return isHost
          ? [{ name: 'Player 1', kind: 'local' }, { name: 'Player 2', kind: 'remote' }]
          : [{ name: 'Player 1', kind: 'remote' }, { name: 'Player 2', kind: 'local' }];
      }
      return Array.from({ length: playerCount }, (_, i) => ({
        name: `Player ${i + 1}`,
        kind: 'local' as ControllerKind,
      }));
    },

    initializeGame(
      mode: GameMode,
      playersOrSeats: number | SeatSpec[] = 1,
      variant: GameVariant = GameVariant.Rainbow,
      puzzleConfigOverride?: PuzzleConfig | null,
    ) {
      // Puzzle variant is supported in single-player and local multiplayer
      // (the vs-AI Dice Master flow uses MultiPlayer + Puzzle). Online
      // multiplayer is still Rainbow-only — Puzzle's per-player engine
      // state would need a sync protocol we haven't built.
      const effectiveVariant = mode === GameMode.OnlineMultiPlayer ? GameVariant.Rainbow : variant;

      this.game = new YahtzeeGame()
      this.game.setGameMode(mode)
      this.game.setVariant(effectiveVariant)
      // Lock in a puzzle config NOW so restartGame ("retry") replays the
      // same puzzle. Adventure passes a fixed LevelPuzzleConfig; Random
      // Puzzle picks one of the variant configs.
      if (effectiveVariant === GameVariant.Puzzle) {
        this.game.setPuzzleConfig(puzzleConfigOverride ?? pickRandomVariant())
      }
      // Reset Adventure-level pointer unless the caller is in an Adventure
      // flow (startAdventureLevel sets it AFTER calling initializeGame).
      if (!(effectiveVariant === GameVariant.Puzzle && puzzleConfigOverride instanceof LevelPuzzleConfig)) {
        this.currentAdventureLevel = null;
      }
      // Same for the daily-puzzle pointer — startDailyPuzzle sets it AFTER
      // calling initializeGame so this clear doesn't fight the action.
      if (!(effectiveVariant === GameVariant.Puzzle && puzzleConfigOverride instanceof DailyPuzzleConfig)) {
        this.currentDailyDateKey = null;
      }
      this.gameMode = mode
      this.gameVariant = effectiveVariant
      this.isGameActive = true
      this.broadcastSeq = 0
      this.lastReceivedSeq = -1
      // Reset per-game counters; profile rewards read these in endGame.
      this.yahtzeesThisGame = 0
      this.bonusTurnsThisGame = 0
      this.pendingLuckyCharm = false
      // Drop any stale GameOver reward payload so the new game starts clean.
      usePlayerProfileStore().clearLastGameRewards()

      const seats: SeatSpec[] = typeof playersOrSeats === 'number'
        ? this.buildSeatSpecs(playersOrSeats)
        : playersOrSeats;
      this.game.startNewGame(seats)

      if (mode === GameMode.OnlineMultiPlayer && usePeerStore().isHost) {
        this.sendGameState()
      }

      // Kick off the first player's turn. No-op for local human / remote
      // peer; AIController uses this to start its decision loop.
      this.game.players[this.game.currentPlayer]?.controller.onTurnStart()
      // Start the first turn's clock (host-only / online-only).
      this.startTurnTimer()
    },

    sendGameState() {
      const peerStore = usePeerStore();
      if (this.game && peerStore.isConnected) {
        this.broadcastSeq++;
        peerStore.sendData({
          type: 'gameState',
          seq: this.broadcastSeq,
          data: this.game.getGameState()
        });
      }
    },

    // -- Online-MP turn timer (host-authoritative) --
    // The host runs a single countdown for whichever seat is active and
    // broadcasts the deadline via gameState; the client only renders it. All
    // three methods no-op off-host / outside online MP.

    // Arm (or re-arm) the 30s action phase. Called at every turn boundary and
    // on every roll. Broadcasts so the client picks up the fresh deadline.
    startTurnTimer() {
      if (!this.isOnlineHost || !this.game || this.game.isGameOver) return;
      if (!usePeerStore().isConnected) return;
      this.game.turnTimer = { phase: 'action', deadline: Date.now() + ACTION_PHASE_MS };
      if (_turnTimerInterval) clearInterval(_turnTimerInterval);
      _turnTimerInterval = setInterval(() => this._tickTurnTimer(), TIMER_CHECK_MS);
      this.sendGameState();
    },

    // Stop the countdown and drop the timer. Safe to call on host or client.
    clearTurnTimer() {
      if (_turnTimerInterval) {
        clearInterval(_turnTimerInterval);
        _turnTimerInterval = null;
      }
      if (this.game) this.game.turnTimer = null;
    },

    // Host-authoritative expiry check, fired ~4x/sec. Transitions
    // action -> mustPick (locks rolling), then mustPick -> auto-pick + advance.
    _tickTurnTimer() {
      if (!this.isOnlineHost || !this.game || this.game.isGameOver
          || !this.game.turnTimer || !usePeerStore().isConnected) {
        this.clearTurnTimer();
        return;
      }
      if (this.game.turnTimer.deadline - Date.now() > 0) return;

      if (this.game.turnTimer.phase === 'action') {
        // Action phase expired — lock rolling, grant a 10s grace window.
        this.game.turnTimer = { phase: 'mustPick', deadline: Date.now() + MUSTPICK_PHASE_MS };
        this.sendGameState();
        return;
      }

      // Must-pick phase expired — auto-pick the best available category and
      // advance. requestCategory routes through the existing scoring/advance/
      // broadcast path; nextPlayer (inside it) re-arms the timer for the next
      // turn, or endGame clears it on the final score.
      // Cast through unknown: Pinia unwraps YahtzeeGame in `this`, stripping
      // the class's private members, so it isn't nominally assignable to the
      // full type the strategy expects (same limitation handled structurally
      // elsewhere in this file).
      const category = _timeoutStrategy.pickForcedCategory(this.game as unknown as YahtzeeGame);
      this.game.players[this.game.currentPlayer]?.controller.requestCategory(category);
    },

    // -- Low-level primitives. No peer messaging — the controller orchestrates
    //    broadcasts. These are the single chokepoint for state mutation, so
    //    host-vs-client divergence on apply paths can no longer drift.

    applyRoll() {
      if (!this.game) return;
      if (this.game.rollsLeft === 0 && !this.game.newRoll) return;

      if (this.game.newRoll) {
        this.game.newRoll = false;
        this.game.startNewRoll();
        this.playSoundEffect?.(SoundEffects.DiceRoll);
        this.game.rollDice();
        this.game.rollsLeft = 2;
      } else {
        this.playSoundEffect?.(SoundEffects.DiceRoll);
        this.game.rollDice();
      }
      this.playRollDiceAnimation();
      // Every roll refreshes the action timer back to the full 30s (host only).
      this.startTurnTimer();
    },

    applyHold(index: number) {
      if (this.game && !this.game.newRoll) {
        this.game.toggleHold(index);
        this.playSoundEffect?.(SoundEffects.DiceHold);
      }
    },

    // Applies a category selection: writes the score, handles bonus Yahtzee,
    // plays local sound/animation. Does NOT advance to the next player — the
    // controller decides whether to call nextPlayer / startBonusTurn / endGame.
    applySelectCategory(category: Categories): { score: number; bonusYahtzee: number; bonusTurnQueued: boolean } {
      const result = { score: 0, bonusYahtzee: 0, bonusTurnQueued: false };
      if (!this.game) return result;

      const puzzleEngine = this.game.getPuzzleEngine();
      const isBonusTurnApply = puzzleEngine?.hasPendingBonusFor(category) ?? false;

      // Reject double-scoring unless we're applying the Double Category bonus.
      if (this.game.isCategorySelected(category) && !isBonusTurnApply) return result;

      // Puzzle veto (e.g., Ice Block on this category).
      if (puzzleEngine && !isBonusTurnApply && !puzzleEngine.canScore(category)) return result;

      const dice = this.game.dice();
      // Lucky Charm consumable: substitutes a Yahtzee raw score (50) when
      // the player picks the Yahtzee category. Consumed on use. Passes
      // through the engine chain so a Flying Multiplier on Yahtzee still
      // doubles.
      let rawScore = this.game.calculateScore(category);
      if (this.pendingLuckyCharm && category === Categories.Yahtzee) {
        rawScore = 50;
        this.pendingLuckyCharm = false;
      }
      const transformedScore = puzzleEngine ? puzzleEngine.applyScore(category, rawScore, dice) : rawScore;
      result.score = transformedScore;

      if (isBonusTurnApply) {
        // Double Category second score: sum onto the existing slot value.
        this.game.players[this.game.currentPlayer].scoreManager.addScoreToCategory(category, transformedScore);
        puzzleEngine!.consumePendingBonusCategory();
        puzzleEngine!.afterScore(category, transformedScore, dice);
        puzzleEngine!.checkGoalMet(this.game.getTotalScore());

        if (transformedScore > 0) {
          showScoreCellFlight(category, transformedScore);
          this.playSoundEffect?.(SoundEffects.Score);
        } else {
          showScoreZeroChip(category);
          this.playSoundEffect?.(SoundEffects.NoScore);
        }

        // Re-check game-over in case this was the final scorable slot.
        this.game.checkGameOver();
        return result;
      }

      // Bonus Yahtzee: +100 on the existing Yahtzee score when all dice match
      // (and aren't zero) and we're scoring a non-Yahtzee category whose
      // Yahtzee slot is already filled with a positive score. Key off raw
      // dice values, not the multiplied score, so Flying Multiplier on Yahtzee
      // doesn't confuse the detection.
      if (
        category !== Categories.Yahtzee &&
        this.game.isCategorySelected(Categories.Yahtzee) &&
        dice.length > 0 && dice[0].value !== 0 &&
        dice.every(d => d.value === dice[0].value)
      ) {
        const currentYahtzee = this.game.getScoreByCategory(Categories.Yahtzee) || 0;
        if (currentYahtzee > 0 && rawScore > 0) {
          result.bonusYahtzee = currentYahtzee + 100;
          this.game.updateSelectedScore(Categories.Yahtzee, result.bonusYahtzee, false);
          showYahtzeeAnimation();
          this.playSoundEffect?.(SoundEffects.Yahtzee);
        }
      }

      this.game.updateSelectedScore(category, transformedScore, false);
      puzzleEngine?.afterScore(category, transformedScore, dice);
      puzzleEngine?.checkGoalMet(this.game.getTotalScore());

      // Modifiers (e.g., Double Category) can request a bonus turn from
      // inside afterScore. The flag stays pending until the bonus second
      // score lands and `applySelectCategory`'s bonus branch consumes it.
      if (puzzleEngine?.hasPendingBonusFor(category)) {
        result.bonusTurnQueued = true;
      }

      if (transformedScore > 0) {
        if (category === Categories.Yahtzee) {
          // Dice fly into the Yahtzee cell first, then the celebration
          // banner lands ~150ms after they touch down so the two beats
          // chain cleanly.
          showScoreCellFlight(category, transformedScore);
          window.setTimeout(() => showYahtzeeAnimation(), 850);
          this.playSoundEffect?.(SoundEffects.Yahtzee);
          this.yahtzeesThisGame += 1
        } else {
          showScoreCellFlight(category, transformedScore);
          this.playSoundEffect?.(SoundEffects.Score);
        }
      } else {
        showScoreZeroChip(category);
        this.playSoundEffect?.(SoundEffects.NoScore);
      }
      // Count bonus-Yahtzees too — the dice-match path above sets
      // result.bonusYahtzee when it fires.
      if (result.bonusYahtzee > 0) this.yahtzeesThisGame += 1
      if (result.bonusTurnQueued) this.bonusTurnsThisGame += 1

      return result;
    },

    // -- Public actions: dispatch through the current player's controller.
    //    The branching that used to live here (host/client/local) now lives
    //    inside the controller for the seat that owns the action.

    rollDice() {
      if (!this.game) return;
      // Online MP: only act on your own seat's turn.
      if (this.gameMode === GameMode.OnlineMultiPlayer && !this.isLocalSeatActive) return;
      this.game.players[this.game.currentPlayer].controller.requestRoll();
    },

    toggleHold(index: number) {
      if (!this.game || this.game.newRoll) return;
      if (this.gameMode === GameMode.OnlineMultiPlayer && !this.isLocalSeatActive) return;
      this.game.players[this.game.currentPlayer].controller.requestHold(index);
    },

    selectCategory(category: Categories) {
      if (!this.game || this.game.newRoll) return;
      if (this.gameMode === GameMode.OnlineMultiPlayer && !this.isLocalSeatActive) return;
      const puzzleEngine = this.game.getPuzzleEngine();
      const pendingBonus = puzzleEngine?.getPendingBonusCategory() ?? null;
      // During a pending bonus turn, only the bonus category is selectable.
      if (pendingBonus && pendingBonus !== category) return;
      const isBonusReselect = pendingBonus === category;
      if (this.game.isCategorySelected(category) && !isBonusReselect) return;
      if (puzzleEngine && !isBonusReselect && !puzzleEngine.canScore(category)) return;
      this.game.players[this.game.currentPlayer].controller.requestCategory(category);
    },

    // -- Incoming peer data --

    handleIncomingData(data: any) {
      if (this.gameMode !== GameMode.OnlineMultiPlayer) return;

      const peer = usePeerStore();
      const remoteSeat = () => this.game?.players.find(p => p.controller.kind === 'remote');

      switch (data.type) {
        case 'gameStarted':
          if (!peer.isHost) {
            this.initializeGame(GameMode.OnlineMultiPlayer, 2);
          }
          break;

        case 'gameOver':
          this.endGame();
          break;

        case 'gameState':
          if (!peer.isHost && this.game) {
            const incomingSeq = typeof data.seq === 'number' ? data.seq : 0;
            if (this.lastReceivedSeq >= 0 && incomingSeq > this.lastReceivedSeq + 1) {
              const missed = incomingSeq - this.lastReceivedSeq - 1;
              console.warn(`gameState seq gap: got ${incomingSeq}, expected ${this.lastReceivedSeq + 1} (missed ${missed})`);
            }
            this.lastReceivedSeq = incomingSeq;
            this.game.updateFromState(data.data);
            // Roll animation is deferred until the authoritative dice values
            // land here (the 'rollDice' hint arrives first and only sets the
            // flag). Holds / category selects / resyncs never set the flag, so
            // they don't spuriously spin the dice. A turn-boundary reset
            // (newRoll) clears any stale flag without animating.
            if (this.pendingRollAnimation) {
              this.pendingRollAnimation = false;
              if (!data.data.newRoll) this.playRollDiceAnimation();
            }
            if (data.data.isGameOver) {
              this.gameIsOver = true;
            }
          }
          break;

        case 'rollDice':
          if (peer.isHost) {
            // Client is requesting a roll — route to its (remote) controller
            remoteSeat()?.controller.requestRoll();
          } else {
            // Host's animation hint — defer the spin until the dice values
            // arrive in the following gameState, otherwise setDice would
            // rebuild the dice and reset isRolling underneath the animation.
            this.pendingRollAnimation = true;
          }
          break;

        case 'holdDice':
          if (peer.isHost) {
            remoteSeat()?.controller.requestHold(data.index);
          }
          // Client: no action; the new held state arrives in gameState
          break;

        case 'selectCategory':
          if (peer.isHost) {
            remoteSeat()?.controller.requestCategory(data.category);
          } else {
            // Animate using the score the host calculated. Dice DOM is
            // whatever the latest gameState push landed — `showScoreCellFlight`
            // degrades gracefully (banner + particles still fire) if the
            // dice tray happened to reset before this message arrived.
            if (data.category === Categories.Yahtzee && data.score > 0) {
              showScoreCellFlight(data.category, data.score);
              window.setTimeout(() => showYahtzeeAnimation(), 850);
              this.playSoundEffect?.(SoundEffects.Yahtzee);
            } else if (data.score > 0) {
              showScoreCellFlight(data.category, data.score);
              this.playSoundEffect?.(SoundEffects.Score);
            } else {
              showScoreZeroChip(data.category);
              this.playSoundEffect?.(SoundEffects.NoScore);
            }
          }
          break;

        case 'bonusYahtzee':
          // Animation-only on the client side; the actual yahtzee-score
          // update arrives via gameState.
          if (data.score > 0) {
            showYahtzeeAnimation();
            this.playSoundEffect?.(SoundEffects.Yahtzee);
          }
          break;

        case 'emoji':
          if (data.emoji) showEmojiAnimation(data.emoji);
          break;

        case 'chatMessage':
          console.log('Chat message received:', data.message);
          break;

        case 'resyncRequest':
          if (peer.isHost) this.sendGameState();
          break;

        default:
          console.log('Unknown data type:', data.type);
      }
    },

    saveGameHistory() {
      localStorage.setItem('gameHistory', JSON.stringify(this.gameHistory))
    },

    endGame() {
      // Stop the turn clock before any teardown so it can't auto-advance a
      // finished game.
      this.clearTurnTimer();
      if (this.game) {
        const scores: PlayerScore[] = Array.from(
          { length: this.game.getPlayerCount() },
          (_, i) => ({
            playerNumber: i + 1,
            score: this.game!.getPlayerScore(i)
          })
        );

        this.gameHistory.unshift({
          date: new Date().toISOString(),
          mode: this.gameMode!,
          variant: this.gameVariant,
          players: this.game.getPlayerCount(),
          scores
        })

        this.gameHistory = this.gameHistory.slice(0, MAX_HISTORY_ITEMS)
        this.saveGameHistory()

        // Daily Puzzle bookkeeping: if the active game was today's daily
        // attempt, record the outcome (win/loss + score) before we tear
        // the game state down. Recorded against the locked-in date key
        // so the streak survives a UTC rollover mid-game.
        if (this.currentDailyDateKey && this.game.variant === GameVariant.Puzzle) {
          const engine = this.game.getPuzzleEngine(0);
          const totalScore = this.game.getPlayerScore(0);
          const result = engine ? engine.getResult(totalScore) : null;
          const won = result?.status === 'win';
          this.recordDailyCompletion(this.currentDailyDateKey, totalScore, won);
        }

        // Profile rewards: build the GameSummary and let the profile
        // store compute XP/coins/achievements. Only seat 0 is treated as
        // "the player" — vs-AI MultiPlayer still tracks seat 0 only.
        // Online MP skipped since the profile is single-device.
        if (this.gameMode !== GameMode.OnlineMultiPlayer) {
          const playerScore = this.game.getPlayerScore(0)
          const engine = this.game.getPuzzleEngine(0)
          const puzzleResult = engine ? engine.getResult(playerScore) : null
          const won = this.gameVariant === GameVariant.Puzzle
            ? puzzleResult?.status === 'win'
            : isLocalPlayerRainbowWinner(this.game, 0)
          const summary: GameSummary = {
            mode: this.gameMode!,
            variant: this.gameVariant,
            totalScore: playerScore,
            won,
            presentKinds: engine?.getPresentKinds(),
            engagedKinds: engine?.getEngagedKinds(),
            levelId: this.currentAdventureLevel != null
              ? this.game.puzzleConfig?.id
              : undefined,
            levelNumber: this.currentAdventureLevel ?? undefined,
            starsEarned: this.currentAdventureLevel != null && puzzleResult?.status === 'win'
              ? computeStars(playerScore, puzzleResult.targetScore)
              : undefined,
            dailyDateKey: this.currentDailyDateKey ?? undefined,
            dailyStreakAfter: this.currentDailyDateKey
              ? this.dailyProgress.currentStreak
              : undefined,
            yahtzeesScored: this.yahtzeesThisGame,
            bonusTurnsTaken: this.bonusTurnsThisGame,
          }
          usePlayerProfileStore().recordGameComplete(summary)
        }

        if (this.gameMode === GameMode.OnlineMultiPlayer) {
          usePeerStore().disconnect();
          localStorage.removeItem('online session');
        }
      }

      this.gameIsOver = true;
    },

    // Advances to the next player and resets per-turn state. The controller
    // decides when to call this; broadcasting is the controller's job.
    nextPlayer() {
      if (!this.game) return;
      // Puzzle modifiers may relocate or expire at end of turn (Flying
      // Multiplier moves here; Hot Potato fuse can force-burn a slot).
      // Fire this before advancing so the next player sees the updated
      // board.
      this.game.getPuzzleEngine()?.onTurnEnd();
      // Hot Potato fuse expiry can fill the last remaining slot and end
      // the game from inside onTurnEnd. Surface that immediately so the
      // GameOver screen renders.
      if (this.game.isGameOver) {
        this.endGame();
        return;
      }
      this.game.nextPlayer();
      this.game.rollsLeft = 2;
      this.game.newRoll = true;
      if (this.gameMode === GameMode.OnlineMultiPlayer) {
        this.game.forceDiceReset();
      }
      // Notify the new current player's controller. Local human / remote
      // peer are no-ops; AIController starts its turn from here.
      this.game.players[this.game.currentPlayer]?.controller.onTurnStart()
      // Fresh 30s clock for the new player (host-only / online-only).
      this.startTurnTimer()
    },

    // Reset per-turn state for a Puzzle Mode bonus turn (Double Category),
    // keeping the current player. Modifier hooks are intentionally NOT
    // fired here — the turn isn't really ending, the same player just gets
    // another scoring opportunity.
    startBonusTurn() {
      if (!this.game) return;
      this.game.rollsLeft = 2;
      this.game.newRoll = true;
      this.game.players[this.game.currentPlayer]?.controller.onTurnStart();
      this.startTurnTimer();
    },

    // Audio settings
    toggleAudioSettings() {
      this.showAudioSettings = !this.showAudioSettings
    },

    toggleGameHistory() {
      this.showGameHistory = !this.showGameHistory
    },

    toggleGameOptions() {
      this.showGameOptions = !this.showGameOptions
    },

    setBgmEnabled(enabled: boolean) {
      this.bgmEnabled = enabled
      localStorage.setItem('bgmEnabled', enabled.toString())
    },

    setSfxEnabled(enabled: boolean) {
      this.sfxEnabled = enabled
      localStorage.setItem('sfxEnabled', enabled.toString())
    },

    restartGame() {
      if (this.game) {
        // Preserve seat config (kinds, names) from the current game so a
        // mixed human/AI lineup survives the restart.
        const seats: SeatSpec[] = this.game.players.map(p => ({
          name: p.name,
          kind: p.controller.kind,
        }))
        this.broadcastSeq = 0
        this.lastReceivedSeq = -1
        this.game.startNewGame(seats)
        if (this.gameMode === GameMode.OnlineMultiPlayer && usePeerStore().isHost) {
          this.sendGameState()
        }
        this.game.players[this.game.currentPlayer]?.controller.onTurnStart()
        this.startTurnTimer()
      }
    },

    newGame() {
      this.clearTurnTimer()
      if (this.gameMode === GameMode.OnlineMultiPlayer) {
        usePeerStore().disconnect()
      }
      this.game = null
      this.gameMode = null
      this.isGameActive = false
      this.gameIsOver = false
      // Full return to the top-level menu; tear down Adventure context too.
      this.showAdventureMenu = false
      this.currentAdventureLevel = null
    },

    // Variant of newGame that returns to the Adventure level-select screen
    // rather than the top-level menu. Used by GameOver's "Level Select"
    // button so the player can pick another level without re-navigating.
    returnToAdventureMenu() {
      this.game = null
      this.gameMode = null
      this.isGameActive = false
      this.gameIsOver = false
      this.currentAdventureLevel = null
      this.showAdventureMenu = true
    },

    playRollDiceAnimation() {
      if (!this.game) return;
      const dice = this.game.dice();
      const ROLL_DELAY_STEP_MS = 55;
      let unheldIndex = 0;
      let maxDelay = 0;
      dice.forEach((die) => {
        if (die.held) return;
        const delay = unheldIndex * ROLL_DELAY_STEP_MS;
        unheldIndex++;
        maxDelay = Math.max(maxDelay, delay);
        setTimeout(() => { die.isRolling = true; }, delay);
      });
      // Cover the last die's start + its longest CSS animation (~0.85s) + buffer.
      setTimeout(() => {
        dice.forEach((die) => { die.isRolling = false; });
      }, maxDelay + 1100);
    },

    // -- Adventure Mode actions --

    openAdventureMenu() {
      this.showAdventureMenu = true;
    },

    closeAdventureMenu() {
      this.showAdventureMenu = false;
    },

    isLevelUnlocked(n: number): boolean {
      return n <= this.adventureProgress.highestUnlocked;
    },

    getBestScoreForLevel(levelId: string): number | null {
      return this.adventureProgress.bestScores[levelId] ?? null;
    },

    getBestStarsForLevel(levelId: string): number {
      return this.adventureProgress.bestStars?.[levelId] ?? 0;
    },

    saveAdventureProgress() {
      try {
        localStorage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(this.adventureProgress));
      } catch {
        // Storage quota / privacy mode — silently ignore; progress just
        // won't persist across reloads.
      }
    },

    // Boots a fresh game running the specified Adventure level. No-op if
    // the level number is unknown or still locked.
    startAdventureLevel(n: number) {
      const level = getLevelByNumber(n);
      if (!level) return;
      if (!this.isLevelUnlocked(n)) return;
      const config = new LevelPuzzleConfig(level);
      this.currentAdventureLevel = n;
      this.initializeGame(GameMode.SinglePlayer, 1, GameVariant.Puzzle, config);
    },

    nextAdventureLevel(): boolean {
      if (this.currentAdventureLevel == null) return false;
      const next = this.currentAdventureLevel + 1;
      const level = getLevelByNumber(next);
      if (!level) return false;
      if (!this.isLevelUnlocked(next)) return false;
      this.startAdventureLevel(next);
      return true;
    },

    // Persists win progress: bumps highestUnlocked when the current
    // highest gets cleared, tracks personal best score, and records the
    // best star rating earned for the level.
    recordAdventureWin(levelId: string, levelNumber: number, score: number, targetScore: number) {
      const earnedStars = computeStars(score, targetScore);
      this.adventureProgress = applyWinToProgress(
        this.adventureProgress,
        levelId,
        levelNumber,
        score,
        getLastLevelNumber(),
        earnedStars,
      );
      this.saveAdventureProgress();

      // After updating bestStars, check whether the level's world is now
      // fully 3-starred. If so, notify the profile store so the
      // threeStarWorld achievement can fire.
      if (earnedStars === 3) {
        const level = getLevelByNumber(levelNumber);
        if (level) {
          const worldLevels = getLevelsByWorld(level.worldId);
          const allThreeStarred = worldLevels.length > 0
            && worldLevels.every(l => (this.adventureProgress.bestStars?.[l.id] ?? 0) >= 3);
          if (allThreeStarred) {
            usePlayerProfileStore().recordThreeStarWorld(level.worldId);
          }
        }
      }
    },

    // -- Daily Puzzle --

    saveDailyProgress() {
      try {
        localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(this.dailyProgress));
      } catch {
        // Storage quota / privacy mode — silently ignore.
      }
    },

    // Boots today's deterministic daily puzzle. Single-player only.
    startDailyPuzzle() {
      const dateKey = getDailyDateKey();
      const config = new DailyPuzzleConfig(dateKey);
      this.initializeGame(GameMode.SinglePlayer, 1, GameVariant.Puzzle, config);
      this.currentDailyDateKey = dateKey;
    },

    // Records a completed daily attempt. Re-running on the same dateKey is
    // a no-op inside applyDailyResult, so replays don't bump streak/best.
    recordDailyCompletion(dateKey: string, score: number, won: boolean) {
      const today = getDailyDateKey();
      this.dailyProgress = applyDailyResult(
        this.dailyProgress,
        { dateKey, score, won },
        today,
      );
      this.saveDailyProgress();
    },

    startOnlineGame() {
      if (this.gameMode === GameMode.OnlineMultiPlayer) {
        const peerStore = usePeerStore();
        if (peerStore.isHost) {
          this.initializeGame(GameMode.OnlineMultiPlayer, 2);
          peerStore.sendData({ type: 'gameStarted' });
          this.sendGameState();
        }
      }
    },

    // -- Consumable dispatch --
    // Returns true if the consumable was applied (and the inventory was
    // decremented). Online MP is rejected up front — no per-side inventory
    // sync exists yet.
    useConsumable(id: string, ctx?: { category?: Categories }): boolean {
      if (!this.game) return false
      if (this.gameMode === GameMode.OnlineMultiPlayer) return false
      const profile = usePlayerProfileStore()
      switch (id) {
        case 'extraRoll': {
          if (this.game.newRoll || this.game.rollsLeft > 0) return false
          if (!profile.useConsumableFromInventory(id)) return false
          this.game.rollsLeft = 1
          return true
        }
        case 'freshReroll': {
          if (this.game.newRoll) return false
          if (!profile.useConsumableFromInventory(id)) return false
          // Un-hold every die.
          for (const die of this.game.dice()) die.held = false
          this.game.rollsLeft = 1
          return true
        }
        case 'revealBestCell': {
          if (this.game.newRoll) return false
          if (!profile.useConsumableFromInventory(id)) return false
          this.highlightBestCell()
          return true
        }
        case 'reCycleLooping': {
          const cat = ctx?.category
          if (!cat) return false
          const engine = this.game.getPuzzleEngine(this.game.currentPlayer)
          const mod = engine?.getModifierAt(cat)
          if (!mod || mod.kind !== 'loopingCategory') return false
          if (!profile.useConsumableFromInventory(id)) return false
          // skipToNext only needs ctx.emit; build a minimal proxy that
          // forwards to engine.emit so the loopingCategory:cycle event
          // reaches every subscriber.
          ;(mod as any).skipToNext({ emit: (e: any) => engine!.emit(e) })
          return true
        }
        case 'convertToYahtzee': {
          if (this.game.newRoll) return false
          if (this.game.isCategorySelected(Categories.Yahtzee)) return false
          if (!profile.useConsumableFromInventory(id)) return false
          this.pendingLuckyCharm = true
          return true
        }
      }
      return false
    },

    // Score Sense highlight — finds the unscored cell whose dispatch
    // result is highest (after passing through engine.applyScore so
    // multipliers count), then adds a .score-sense-highlight class for
    // 3 seconds.
    highlightBestCell() {
      if (!this.game) return
      const dice = this.game.dice()
      const engine = this.game.getPuzzleEngine(this.game.currentPlayer)
      const scorecard = this.game.players[this.game.currentPlayer].getScorecard()
      let bestCat: Categories | null = null
      let bestVal = -1
      for (const [cat, entry] of Object.entries(scorecard)) {
        if (entry?.selected) continue
        const c = cat as Categories
        if (engine && !engine.canScore(c)) continue
        const raw = this.game.calculateScore(c)
        const final = engine ? engine.applyScore(c, raw, dice) : raw
        if (final > bestVal) {
          bestVal = final
          bestCat = c
        }
      }
      if (!bestCat) return
      if (typeof document === 'undefined') return
      const el = document.querySelector<HTMLElement>(`[data-category="${bestCat}"]`)
      if (!el) return
      el.classList.add('score-sense-highlight')
      window.setTimeout(() => el.classList.remove('score-sense-highlight'), 3000)
    },
  },
})
