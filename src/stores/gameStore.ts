import { defineStore } from 'pinia'
import { YahtzeeGame } from '../game'
import { GameMode } from '../enums/GameMode'
import { SoundEffects } from '../enums/SoundEffects'

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
      }

      // enable the game over screen
      this.gameIsOver = true;
    },

    nextPlayer() {
      if (this.game) {
        this.game.nextPlayer()
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
      }
    },

    newGame() {
      //this.endGame()
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



    },
    // You can add more actions here as needed
    // For example:
    // - rollDice()
    // - toggleHold(index)
    // - selectCategory(category)
    // etc.
  },
}) 