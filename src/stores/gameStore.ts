import { defineStore } from 'pinia'
import { YahtzeeGame } from '../game'
import { GameMode } from '../enums/GameMode'
import { SoundEffects } from '../enums/SoundEffects'
import { usePeerStore } from './peerStore'

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
  }),

  getters: {
    currentGame: (state) => state.game,
    currentGameMode: (state) => state.gameMode,
    gameIsActive: (state) => state.isGameActive,
    audioSettings: (state) => ({
      bgmEnabled: state.bgmEnabled,
      sfxEnabled: state.sfxEnabled
    }),
  },

  actions: {
    initializeGame(mode: GameMode, players: number = 1) {
      this.game = new YahtzeeGame()
      this.game.setGameMode(mode)
      this.gameMode = mode
      this.isGameActive = true
      this.game.setPlayers(players)
      this.game.startNewGame(players)

      // If this is an online game, set up the peer connection
      if (mode === GameMode.OnlineMultiPlayer) {
        const peerStore = usePeerStore()
        if (peerStore.isHost) {
          // Host sends initial game state
          this.sendGameState()
        }
      }
    },

    sendGameState() {
      const peerStore = usePeerStore()
      if (this.game && peerStore.isConnected) {
        const gameState = {
          type: 'gameState',
          data: {
            currentPlayer: this.game.currentPlayer,
            dice: this.game.dice,
            rollsLeft: this.game.rollsLeft,
            scores: this.game.scores,
            categories: this.game.categories
          }
        }
        peerStore.sendData(gameState)
      }
    },

    handleIncomingData(data: any) {
      if (!this.game || this.gameMode !== GameMode.OnlineMultiPlayer) return

      switch (data.type) {
        case 'gameState':
          // Update game state from host
          if (!usePeerStore().isHost) {
            this.game.updateFromState(data.data)
          }
          break
        case 'rollDice':
          if (usePeerStore().isHost) {
            this.rollDice()
          }
          break
        case 'holdDice':
          if (usePeerStore().isHost) {
            this.game?.toggleHold(data.index)
          }
          break
        case 'selectCategory':
          if (usePeerStore().isHost) {
            this.game?.selectCategory(data.category)
            this.sendGameState()
          }
          break
      }
    },

    saveGameHistory() {
      localStorage.setItem('gameHistory', JSON.stringify(this.gameHistory))
    },

    endGame() {
      if (this.game) {
        // Create scores array with player numbers
        const scores: PlayerScore[] = Array.from(
          { length: this.game.getPlayerCount() }, 
          (_, i) => ({
            playerNumber: i + 1,
            score: this.game!.getPlayerScore(i)
          })
        );

        // Add new game to history
        this.gameHistory.unshift({
          date: new Date().toISOString(),
          mode: this.gameMode!,
          players: this.game.getPlayerCount(),
          scores
        })

        // Keep only the last 10 games
        this.gameHistory = this.gameHistory.slice(0, MAX_HISTORY_ITEMS)
        
        // Save to localStorage
        this.saveGameHistory()

        // Disconnect from peer if in online mode
        if (this.gameMode === GameMode.OnlineMultiPlayer) {
          usePeerStore().disconnect()
        }
      }

      // enable the game over screen
      this.gameIsOver = true;
    },

    nextPlayer() {
      if (this.game) {
        this.game.nextPlayer()
        if (this.gameMode === GameMode.OnlineMultiPlayer) {
          this.sendGameState()
        }
      }
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

    // Game actions
    restartGame() {
      if (this.game) {
        const playerCount = this.game.getPlayerCount()
        this.game.startNewGame(playerCount)
        if (this.gameMode === GameMode.OnlineMultiPlayer) {
          this.sendGameState()
        }
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

    rollDice() {
      if(!this.game){
        console.log('no game');
        return;
      }

      if(this.game.rollsLeft === 0 && !this.game.newRoll){
        return;
      }
    
      if(this.game.newRoll){   
          this.game.newRoll = false;
          this.game.startNewRoll();
          this.playSoundEffect?.(SoundEffects.DiceRoll);
          this.game.rollDice();
          this.game.rollsLeft = 2;
      }else{
          this.playSoundEffect?.(SoundEffects.DiceRoll);
          this.game.rollDice();
      }

      if (this.gameMode === GameMode.OnlineMultiPlayer) {
        const peerStore = usePeerStore()
        if (peerStore.isHost) {
          this.sendGameState()
        } else {
          peerStore.sendData({ type: 'rollDice' })
        }
      }
    },

    toggleHold(index: number) {
      if (this.game) {
        if (this.gameMode === GameMode.OnlineMultiPlayer) {
          const peerStore = usePeerStore()
          if (peerStore.isHost) {
            this.game.toggleHold(index)
            this.sendGameState()
          } else {
            peerStore.sendData({ type: 'holdDice', index })
          }
        } else {
          this.game.toggleHold(index)
        }
      }
    },

    selectCategory(category: string) {
      if (this.game) {
        if (this.gameMode === GameMode.OnlineMultiPlayer) {
          const peerStore = usePeerStore()
          if (peerStore.isHost) {
            this.game.selectCategory(category)
            this.sendGameState()
          } else {
            peerStore.sendData({ type: 'selectCategory', category })
          }
        } else {
          this.game.selectCategory(category)
        }
      }
    }
  },
}) 