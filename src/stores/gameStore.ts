import { defineStore } from 'pinia'
import { YahtzeeGame } from '../game'
import { GameMode } from '../enums/GameMode'
import { GameVariant } from '../enums/GameVariant'
import { pickRandomVariant } from '../puzzle/configs/variants'
import { LevelPuzzleConfig } from '../puzzle/configs/LevelPuzzleConfig'
import { getLevelByNumber, getLastLevelNumber } from '../puzzle/levels/definitions'
import { applyWinToProgress, computeStars } from '../puzzle/levels/progression'
import type { PuzzleConfig } from '../puzzle/types'
import { SoundEffects } from '../enums/SoundEffects'
import { usePeerStore } from './peerStore'
import { Categories } from '../enums/Categories'
import type { SeatSpec, ControllerKind } from '../controllers'

import { showYahtzeeAnimation, showScoreAnimation, showEmojiAnimation } from '../utils/animations'

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

    // Adventure Mode — authored levels with progression. Persisted to
    // localStorage. `currentAdventureLevel` is set while playing an
    // Adventure level (null for Random Puzzle / Rainbow / multi).
    adventureProgress: loadAdventureProgress() as AdventureProgress,
    showAdventureMenu: false,
    currentAdventureLevel: null as number | null,
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
      this.gameMode = mode
      this.gameVariant = effectiveVariant
      this.isGameActive = true
      this.broadcastSeq = 0
      this.lastReceivedSeq = -1

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
      const rawScore = this.game.calculateScore(category);
      const transformedScore = puzzleEngine ? puzzleEngine.applyScore(category, rawScore, dice) : rawScore;
      result.score = transformedScore;

      if (isBonusTurnApply) {
        // Double Category second score: sum onto the existing slot value.
        this.game.players[this.game.currentPlayer].scoreManager.addScoreToCategory(category, transformedScore);
        puzzleEngine!.consumePendingBonusCategory();
        puzzleEngine!.afterScore(category, transformedScore, dice);
        puzzleEngine!.checkGoalMet(this.game.getTotalScore());

        if (transformedScore > 0) {
          showScoreAnimation(transformedScore, category);
          this.playSoundEffect?.(SoundEffects.Score);
        } else {
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
          showYahtzeeAnimation();
          this.playSoundEffect?.(SoundEffects.Yahtzee);
        } else {
          showScoreAnimation(transformedScore, category);
          this.playSoundEffect?.(SoundEffects.Score);
        }
      } else {
        this.playSoundEffect?.(SoundEffects.NoScore);
      }

      return result;
    },

    // -- Public actions: dispatch through the current player's controller.
    //    The branching that used to live here (host/client/local) now lives
    //    inside the controller for the seat that owns the action.

    rollDice() {
      if (!this.game) return;
      this.game.players[this.game.currentPlayer].controller.requestRoll();
    },

    toggleHold(index: number) {
      if (!this.game || this.game.newRoll) return;
      this.game.players[this.game.currentPlayer].controller.requestHold(index);
    },

    selectCategory(category: Categories) {
      if (!this.game || this.game.newRoll) return;
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
            // Animation is driven by the dedicated 'rollDice' message; do
            // not animate on every state update or hold-broadcasts would
            // also spin the unheld dice.
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
            // Host's animation hint — the dice values arrive separately in gameState
            this.playRollDiceAnimation();
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
            // Animate using the score the host calculated
            if (data.category === Categories.Yahtzee && data.score > 0) {
              showYahtzeeAnimation();
              this.playSoundEffect?.(SoundEffects.Yahtzee);
            } else if (data.score > 0) {
              showScoreAnimation(data.score, data.category);
              this.playSoundEffect?.(SoundEffects.Score);
            } else {
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
      }
    },

    newGame() {
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
      if (this.game) {
        const dice = this.game.dice();
        dice.forEach((die) => {
          if (!die.held) {
            die.isRolling = true;
          }
        });
        setTimeout(() => {
          dice.forEach((die) => {
            die.isRolling = false;
          });
        }, 1000);
      }
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
  },
})
