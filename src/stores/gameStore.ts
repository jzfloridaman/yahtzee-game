import { defineStore } from 'pinia'
import { YahtzeeGame } from '../game'
import { GameMode } from '../enums/GameMode'
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
  players: number;
  scores: PlayerScore[];
}

const MAX_HISTORY_ITEMS = 10;

export const useGameStore = defineStore('game', {
  state: () => ({
    // Game state
    game: null as YahtzeeGame | null,
    gameMode: null as GameMode | null,
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

    initializeGame(mode: GameMode, playersOrSeats: number | SeatSpec[] = 1) {
      this.game = new YahtzeeGame()
      this.game.setGameMode(mode)
      this.gameMode = mode
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
    // controller decides whether to call nextPlayer or end the game.
    applySelectCategory(category: Categories): { score: number; bonusYahtzee: number } {
      const result = { score: 0, bonusYahtzee: 0 };
      if (!this.game || this.game.isCategorySelected(category)) return result;

      const dice = this.game.dice();
      const score = this.game.calculateScore(category);
      result.score = score;

      // Bonus Yahtzee: +100 on the existing Yahtzee score when all dice match
      // (and aren't zero) and we're scoring a non-Yahtzee category whose
      // Yahtzee slot is already filled with a positive score.
      if (
        category !== Categories.Yahtzee &&
        this.game.isCategorySelected(Categories.Yahtzee) &&
        dice.length > 0 && dice[0].value !== 0 &&
        dice.every(d => d.value === dice[0].value)
      ) {
        const currentYahtzee = this.game.getScoreByCategory(Categories.Yahtzee) || 0;
        if (currentYahtzee > 0 && score > 0) {
          result.bonusYahtzee = currentYahtzee + 100;
          this.game.updateSelectedScore(Categories.Yahtzee, result.bonusYahtzee, false);
          showYahtzeeAnimation();
          this.playSoundEffect?.(SoundEffects.Yahtzee);
        }
      }

      this.game.updateSelectedScore(category, score, false);

      if (score > 0) {
        if (category === Categories.Yahtzee) {
          showYahtzeeAnimation();
          this.playSoundEffect?.(SoundEffects.Yahtzee);
        } else {
          showScoreAnimation(score, category);
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
      if (this.game.isCategorySelected(category)) return;
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
